import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { supabase } from "./lib/supabase";
import type { CriticalProduct, CriticalProductInput, ProductArch } from "./productsTypes";

const POLL_MS = 30_000;

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function doneKey(productId: string, time: string, arch: ProductArch): string {
  return `${productId}|${time}|${arch}`;
}

// Clave de ocultamiento a nivel horario (sin arquitectura): oculta la tarjeta entera.
function hiddenKey(productId: string, time: string): string {
  return `${productId}|${time}`;
}

interface ProductsContextType {
  products: CriticalProduct[];
  doneKeys: Set<string>; // claves "productId|HH:MM|arch" hechas hoy
  hiddenKeys: Set<string>; // claves "productId|HH:MM" de corridas ocultas hoy
  holidayProductsByDay: Record<string, Set<string>>; // "yyyy-MM-dd" -> set de product_id que corren ese feriado
  notesByKey: Record<string, string>; // "productId|HH:MM|arch" -> anotación permanente del carril
  isLoading: boolean;
  refresh: () => Promise<void>;
  addProduct: (data: CriticalProductInput) => Promise<void>;
  updateProduct: (id: string, data: CriticalProductInput) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  markDone: (productId: string, time: string, arch: ProductArch) => Promise<void>;
  unmarkDone: (productId: string, time: string, arch: ProductArch) => Promise<void>;
  hideFutureRuns: (productId: string, times: string[]) => Promise<void>;
  showRuns: (productId: string) => Promise<void>;
  setHolidayProducts: (day: string, productIds: string[]) => Promise<void>;
  setNote: (productId: string, time: string, arch: ProductArch, note: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function CriticalProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CriticalProduct[]>([]);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [holidayProductsByDay, setHolidayProductsByDay] = useState<Record<string, Set<string>>>({});
  const [notesByKey, setNotesByKey] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [prodRes, doneRes, hiddenRes, holRes, notesRes] = await Promise.all([
      supabase.from("critical_products").select("*").order("name"),
      supabase.from("product_done").select("product_id, time, arch").eq("day", todayStr()),
      supabase.from("product_hidden").select("product_id, time").eq("day", todayStr()),
      supabase.from("critical_product_holidays").select("product_id, day").gte("day", todayStr()),
      supabase.from("product_notes").select("product_id, time, arch, note"),
    ]);

    if (prodRes.error) console.error("Error fetching critical_products:", prodRes.error);
    else
      setProducts(
        (prodRes.data ?? []).map((p: any) => ({
          ...p,
          links: (Array.isArray(p.links) ? p.links : []).map((l: any) => ({
            ...l,
            arch: l?.arch === "4.0" ? "4.0" : "1.0", // normaliza links legados sin arch
          })),
          days: Array.isArray(p.days) ? p.days : [1, 2, 3, 4, 5],
          shift: p.shift === "Guardia Vespertina" ? "Guardia Vespertina" : "Guardia Matutina",
        })) as CriticalProduct[],
      );

    if (doneRes.error) console.error("Error fetching product_done:", doneRes.error);
    else setDoneKeys(new Set((doneRes.data ?? []).map((d: any) => doneKey(d.product_id, d.time, d.arch === "4.0" ? "4.0" : "1.0"))));

    if (hiddenRes.error) console.error("Error fetching product_hidden:", hiddenRes.error);
    else setHiddenKeys(new Set((hiddenRes.data ?? []).map((h: any) => hiddenKey(h.product_id, h.time))));

    if (holRes.error) console.error("Error fetching critical_product_holidays:", holRes.error);
    else {
      const byDay: Record<string, Set<string>> = {};
      for (const r of (holRes.data ?? []) as any[]) {
        (byDay[r.day] ??= new Set()).add(r.product_id);
      }
      setHolidayProductsByDay(byDay);
    }

    if (notesRes.error) console.error("Error fetching product_notes:", notesRes.error);
    else {
      const byKey: Record<string, string> = {};
      for (const r of (notesRes.data ?? []) as any[]) {
        if (r.note) byKey[doneKey(r.product_id, r.time, r.arch === "4.0" ? "4.0" : "1.0")] = r.note;
      }
      setNotesByKey(byKey);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await refresh();
      setIsLoading(false);
    })();
    const id = setInterval(refresh, POLL_MS); // sincroniza el estado compartido del equipo
    return () => clearInterval(id);
  }, [refresh]);

  const addProduct = async (data: CriticalProductInput) => {
    const { error } = await supabase.from("critical_products").insert([data]);
    if (error) { console.error("Error adding product", error); throw error; }
    await refresh();
  };

  const updateProduct = async (id: string, data: CriticalProductInput) => {
    const { error } = await supabase.from("critical_products").update(data).eq("id", id);
    if (error) { console.error("Error updating product", error); throw error; }
    await refresh();
  };

  const removeProduct = async (id: string) => {
    const { error } = await supabase.from("critical_products").delete().eq("id", id);
    if (error) { console.error("Error deleting product", error); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const markDone = async (productId: string, time: string, arch: ProductArch) => {
    setDoneKeys((prev) => new Set(prev).add(doneKey(productId, time, arch))); // optimista
    const { error } = await supabase
      .from("product_done")
      .insert([{ product_id: productId, time, arch, day: todayStr() }]);
    // 23505 = unique_violation → ya estaba marcado por otra persona; no es error real.
    if (error && (error as any).code !== "23505") console.error("Error marking done", error);
  };

  const unmarkDone = async (productId: string, time: string, arch: ProductArch) => {
    setDoneKeys((prev) => {
      const next = new Set(prev);
      next.delete(doneKey(productId, time, arch));
      return next;
    });
    const { error } = await supabase
      .from("product_done")
      .delete()
      .eq("product_id", productId)
      .eq("time", time)
      .eq("arch", arch)
      .eq("day", todayStr());
    if (error) console.error("Error unmarking done", error);
  };

  // Oculta las corridas futuras de un producto por hoy (declutter). Una fila por horario.
  const hideFutureRuns = async (productId: string, times: string[]) => {
    if (times.length === 0) return;
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      for (const t of times) next.add(hiddenKey(productId, t)); // optimista
      return next;
    });
    const rows = times.map((time) => ({ product_id: productId, time, day: todayStr() }));
    const { error } = await supabase.from("product_hidden").insert(rows);
    // 23505 = unique_violation → ya oculto por otra persona; no es error real.
    if (error && (error as any).code !== "23505") console.error("Error hiding runs", error);
  };

  // Deshace el ocultamiento: vuelve a mostrar todas las corridas ocultas del producto hoy.
  const showRuns = async (productId: string) => {
    setHiddenKeys((prev) => {
      const next = new Set<string>();
      const prefix = `${productId}|`;
      for (const k of prev) if (!k.startsWith(prefix)) next.add(k);
      return next;
    });
    const { error } = await supabase
      .from("product_hidden")
      .delete()
      .eq("product_id", productId)
      .eq("day", todayStr());
    if (error) console.error("Error showing runs", error);
  };

  // Reemplaza la programación de un feriado: borra las filas de esa fecha e inserta las nuevas.
  const setHolidayProducts = async (day: string, productIds: string[]) => {
    const { error: delError } = await supabase.from("critical_product_holidays").delete().eq("day", day);
    if (delError) { console.error("Error clearing holiday products", delError); throw delError; }
    if (productIds.length > 0) {
      const rows = productIds.map((product_id) => ({ product_id, day }));
      const { error: insError } = await supabase.from("critical_product_holidays").insert(rows);
      if (insError) { console.error("Error setting holiday products", insError); throw insError; }
    }
    await refresh();
  };

  // Anotación permanente por (producto, horario, arquitectura). Upsert; vacío = borra la fila.
  const setNote = async (productId: string, time: string, arch: ProductArch, note: string) => {
    const trimmed = note.trim();
    const key = doneKey(productId, time, arch);
    setNotesByKey((prev) => {
      const next = { ...prev };
      if (trimmed) next[key] = trimmed; else delete next[key];
      return next;
    });
    if (!trimmed) {
      const { error } = await supabase.from("product_notes").delete().eq("product_id", productId).eq("time", time).eq("arch", arch);
      if (error) console.error("Error deleting note", error);
    } else {
      const { error } = await supabase
        .from("product_notes")
        .upsert({ product_id: productId, time, arch, note: trimmed }, { onConflict: "product_id,time,arch" });
      if (error) console.error("Error saving note", error);
    }
  };

  return (
    <ProductsContext.Provider
      value={{ products, doneKeys, hiddenKeys, holidayProductsByDay, notesByKey, isLoading, refresh, addProduct, updateProduct, removeProduct, markDone, unmarkDone, hideFutureRuns, showRuns, setHolidayProducts, setNote }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProductsContext must be used within a CriticalProductsProvider");
  return ctx;
}
