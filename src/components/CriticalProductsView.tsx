import { useEffect, useMemo, useState } from "react";

import { useProductsContext } from "../productsContext";
import { useProductNotifications } from "../hooks/useProductNotifications";
import type { CriticalProduct, ProductTask } from "../productsTypes";
import { WEEKDAYS } from "../productsTypes";
import { ProductFormModal } from "./ProductFormModal";
import { LoadingSpinner } from "./LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useGuardContext } from "../context";
import { useUiStore } from "../store";

function hm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const ROW_GRID = "60px 150px minmax(240px,1fr) 100px minmax(380px,1.6fr)";

export function CriticalProductsView() {
  const { products, doneKeys, isLoading, markDone, unmarkDone, removeProduct } = useProductsContext();
  const { session } = useGuardContext();
  const isAdmin = session?.role === 'admin';
  const { productsAlertsEnabled, productsAlertVolume, productsAddModalOpen, setProductsAddModalOpen } = useUiStore();

  const [now, setNow] = useState(new Date());
  const [editing, setEditing] = useState<CriticalProduct | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reloj para recalcular estados (próximo/pendiente) y reflejar la hora.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  // Pide permiso de notificaciones al entrar (si no se decidió aún).
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useProductNotifications(products, productsAlertsEnabled, productsAlertVolume);

  const todayDow = now.getDay(); // 0=Dom … 6=Sáb

  const tasks = useMemo<ProductTask[]>(() => {
    const list: ProductTask[] = [];
    for (const p of products) {
      if (!p.enabled) continue;
      if (!(p.days ?? [1, 2, 3, 4, 5]).includes(todayDow)) continue; // no ejecuta hoy
      for (const t of p.schedules ?? []) {
        list.push({ product: p, time: t, done: doneKeys.has(`${p.id}|${t}`) });
      }
    }
    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [products, doneKeys, todayDow]);

  const cur = hm(now);

  const openEdit = (p: CriticalProduct) => { setEditing(p); setProductsAddModalOpen(true); };

  const copyPbi = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* Header propio de la pestaña */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <h2 className="text-xl font-medium">Monitoreo de Productos Críticos</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-12">
        {tasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-16">
            No hay productos configurados. Hacé clic en "+ Agregar producto".
          </p>
        ) : (
          <>
            {/* Encabezado de columnas */}
            <div
              className="grid items-center gap-3 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:text-gray-400"
              style={{ gridTemplateColumns: ROW_GRID }}
            >
              <div>Hora</div>
              <div>Producto</div>
              <div>Canal Teams</div>
              <div>Estado</div>
              <div className="text-right">Acciones</div>
            </div>

            <div className="space-y-1.5">
              {tasks.map((task) => {
                const past = task.time < cur && !task.done;
                const bgClass = task.done ? "bg-[#d1fae5] dark:bg-[#064e3b]" : past ? "bg-[#fee2e2] dark:bg-[#7f1d1d]" : "bg-[#f1f5f9] dark:bg-[#13151f]";
                const key = `${task.product.id}|${task.time}`;
                return (
                  <div
                    key={key}
                    className={`grid items-center gap-3 px-4 py-3 rounded-lg transition-all hover:brightness-125 hover:ring-2 hover:ring-white/40 ${bgClass}`}
                    style={{ gridTemplateColumns: ROW_GRID }}
                  >
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{task.time}</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{task.product.name}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">{task.product.teams_channel || "—"}</div>
                    <div className="text-xs font-medium">
                      {task.done ? (
                        <span className="text-emerald-700">✓ Listo</span>
                      ) : past ? (
                        <span className="text-red-600">⚠ Pendiente</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">Próximo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(task.product.links ?? []).map((link, li) => {
                        const linkKey = `${key}|${li}`;
                        if (link.kind === "powerbi") {
                          return (
                            <Button
                              key={li}
                              size="sm"
                              className="h-8 bg-[#1a3050] hover:bg-[#2a4878] text-white"
                              onClick={() => copyPbi(link.url, linkKey)}
                            >
                              {copiedKey === linkKey ? "✓ Copiado" : `📊 ${link.label}`}
                            </Button>
                          );
                        }
                        return (
                          <Button
                            key={li}
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            onClick={() => window.open(link.url, "_blank")}
                          >
                            {link.label}
                          </Button>
                        );
                      })}
                      {task.done ? (
                        <Button size="sm" variant="outline" className="h-8 bg-white dark:bg-[#1a1c29] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1f2233]" title="Desmarcar" onClick={() => unmarkDone(task.product.id, task.time)}>
                          ↩
                        </Button>
                      ) : (
                        <Button size="sm" className="h-8 bg-amber-400 hover:bg-amber-500 text-gray-900 dark:text-gray-100" onClick={() => markDone(task.product.id, task.time)}>
                          Listo
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gestión de productos (alta/edición/baja) */}
            {isAdmin && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Productos configurados</h3>
                <div className="space-y-1.5">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white dark:bg-[#1a1c29] border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 shadow-sm">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Días: {WEEKDAYS.filter((d) => (p.days ?? []).includes(d.value)).map((d) => d.label).join(" · ") || "Sin días"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Horarios: {(p.schedules ?? []).join("  ·  ") || "Sin horarios"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-8 bg-white dark:bg-[#1a1c29] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1f2233]" onClick={() => openEdit(p)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeProduct(p.id)}>
                          Borrar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ProductFormModal
        open={productsAddModalOpen}
        onOpenChange={(v) => { setProductsAddModalOpen(v); if (!v) setEditing(null); }}
        product={editing}
      />
    </div>
  );
}
