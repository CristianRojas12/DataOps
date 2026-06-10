import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { supabase } from "./lib/supabase";
import type { CriticalProduct, CriticalProductInput } from "./productsTypes";

const POLL_MS = 30_000;

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function doneKey(productId: string, time: string): string {
  return `${productId}|${time}`;
}

interface ProductsContextType {
  products: CriticalProduct[];
  doneKeys: Set<string>; // claves "productId|HH:MM" hechas hoy
  isLoading: boolean;
  refresh: () => Promise<void>;
  addProduct: (data: CriticalProductInput) => Promise<void>;
  updateProduct: (id: string, data: CriticalProductInput) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  markDone: (productId: string, time: string) => Promise<void>;
  unmarkDone: (productId: string, time: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function CriticalProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CriticalProduct[]>([]);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [prodRes, doneRes] = await Promise.all([
      supabase.from("critical_products").select("*").order("name"),
      supabase.from("product_done").select("product_id, time").eq("day", todayStr()),
    ]);

    if (prodRes.error) console.error("Error fetching critical_products:", prodRes.error);
    else setProducts((prodRes.data ?? []) as CriticalProduct[]);

    if (doneRes.error) console.error("Error fetching product_done:", doneRes.error);
    else setDoneKeys(new Set((doneRes.data ?? []).map((d: any) => doneKey(d.product_id, d.time))));
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

  const markDone = async (productId: string, time: string) => {
    setDoneKeys((prev) => new Set(prev).add(doneKey(productId, time))); // optimista
    const { error } = await supabase
      .from("product_done")
      .insert([{ product_id: productId, time, day: todayStr() }]);
    // 23505 = unique_violation → ya estaba marcado por otra persona; no es error real.
    if (error && (error as any).code !== "23505") console.error("Error marking done", error);
  };

  const unmarkDone = async (productId: string, time: string) => {
    setDoneKeys((prev) => {
      const next = new Set(prev);
      next.delete(doneKey(productId, time));
      return next;
    });
    const { error } = await supabase
      .from("product_done")
      .delete()
      .eq("product_id", productId)
      .eq("time", time)
      .eq("day", todayStr());
    if (error) console.error("Error unmarking done", error);
  };

  return (
    <ProductsContext.Provider
      value={{ products, doneKeys, isLoading, refresh, addProduct, updateProduct, removeProduct, markDone, unmarkDone }}
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
