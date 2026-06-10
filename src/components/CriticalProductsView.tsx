import { useEffect, useMemo, useState } from "react";

import { useProductsContext } from "../productsContext";
import { useProductNotifications } from "../hooks/useProductNotifications";
import type { CriticalProduct, ProductTask } from "../productsTypes";
import { ProductFormModal } from "./ProductFormModal";
import { LoadingSpinner } from "./LoadingSpinner";
import { Button } from "@/components/ui/button";

function hm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const ROW_GRID = "64px minmax(160px,1fr) 240px 120px 320px";

export function CriticalProductsView() {
  const { products, doneKeys, isLoading, markDone, unmarkDone, removeProduct } = useProductsContext();

  const [now, setNow] = useState(new Date());
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => localStorage.getItem("pc_alerts") !== "false"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CriticalProduct | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reloj para recalcular estados (próximo/pendiente) y reflejar la hora.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Pide permiso de notificaciones al entrar (si no se decidió aún).
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useProductNotifications(products, alertsEnabled);

  const tasks = useMemo<ProductTask[]>(() => {
    const list: ProductTask[] = [];
    for (const p of products) {
      if (!p.enabled) continue;
      for (const t of p.schedules ?? []) {
        list.push({ product: p, time: t, done: doneKeys.has(`${p.id}|${t}`) });
      }
    }
    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [products, doneKeys]);

  const cur = hm(now);

  const toggleAlerts = (checked: boolean) => {
    setAlertsEnabled(checked);
    localStorage.setItem("pc_alerts", checked ? "true" : "false");
    if (checked && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: CriticalProduct) => { setEditing(p); setModalOpen(true); };

  const copyPbi = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      window.prompt("Copiá el link de Power BI:", url);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
      {/* Header propio de la pestaña */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <h2 className="text-xl font-medium">Monitoreo de Productos Críticos</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alertsEnabled}
              onChange={(e) => toggleAlerts(e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            Alertas activas
          </label>
          <span className="text-lg tabular-nums">{hm(now)}</span>
          <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <span className="text-lg leading-none mb-[2px]">+</span> Agregar producto
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-12">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No hay productos configurados. Hacé clic en "+ Agregar producto".
          </p>
        ) : (
          <>
            {/* Encabezado de columnas */}
            <div
              className="grid items-center gap-3 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground"
              style={{ gridTemplateColumns: ROW_GRID }}
            >
              <div>Hora</div>
              <div>Producto</div>
              <div>Canal Teams</div>
              <div>Estado</div>
              <div></div>
            </div>

            <div className="space-y-1.5">
              {tasks.map((task) => {
                const past = task.time < cur && !task.done;
                const bg = task.done ? "#234d22" : past ? "#4d2222" : "#1a3350";
                const key = `${task.product.id}|${task.time}`;
                return (
                  <div
                    key={key}
                    className="grid items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ gridTemplateColumns: ROW_GRID, backgroundColor: bg }}
                  >
                    <div className="font-bold text-sm">{task.time}</div>
                    <div className="text-sm">{task.product.name}</div>
                    <div className="text-xs text-[#a0c4e8]">{task.product.teams_channel || "—"}</div>
                    <div className="text-xs">
                      {task.done ? (
                        <span className="text-[#6dbf67]">✓ Listo</span>
                      ) : past ? (
                        <span className="text-[#e87070]">⚠ Pendiente</span>
                      ) : (
                        <span className="text-[#7db8e8]">Próximo</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="secondary" className="h-8" onClick={() => window.open(task.product.url, "_blank")}>
                        Link 1
                      </Button>
                      {task.product.url2 && (
                        <Button size="sm" variant="secondary" className="h-8" onClick={() => window.open(task.product.url2, "_blank")}>
                          Link 2
                        </Button>
                      )}
                      {task.product.powerbi_url && (
                        <Button size="sm" className="h-8 bg-[#1a3050] hover:bg-[#2a4878] text-white" onClick={() => copyPbi(task.product.powerbi_url, key)}>
                          {copiedKey === key ? "✓ Copiado" : "📊 PBI"}
                        </Button>
                      )}
                      {task.done ? (
                        <Button size="sm" variant="outline" className="h-8" title="Desmarcar" onClick={() => unmarkDone(task.product.id, task.time)}>
                          ↩
                        </Button>
                      ) : (
                        <Button size="sm" className="h-8 bg-green-700 hover:bg-green-600 text-white" onClick={() => markDone(task.product.id, task.time)}>
                          Listo
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gestión de productos (alta/edición/baja) */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Productos configurados</h3>
              <div className="space-y-1.5">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-[#13151f] rounded-lg px-4 py-3">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Horarios: {(p.schedules ?? []).join("  ·  ") || "Sin horarios"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="h-8" onClick={() => openEdit(p)}>Editar</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        onClick={() => { if (confirm(`¿Eliminar "${p.name}"?`)) removeProduct(p.id); }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <ProductFormModal open={modalOpen} onOpenChange={setModalOpen} product={editing} />
    </div>
  );
}
