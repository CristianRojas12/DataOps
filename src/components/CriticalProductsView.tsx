import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { useProductsContext } from "../productsContext";
import { useProductNotifications } from "../hooks/useProductNotifications";
import type { CriticalProduct, ProductArch } from "../productsTypes";
import { WEEKDAYS, DEFAULT_SHIFT, SHIFTS, ARCHITECTURES } from "../productsTypes";
import { ProductFormModal } from "./ProductFormModal";
import { HolidayScheduleModal } from "./HolidayScheduleModal";
import { LoadingSpinner } from "./LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useGuardContext } from "../context";
import { useUiStore } from "../store";

function hm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const archOf = (link: { arch?: ProductArch }): ProductArch => (link.arch === "4.0" ? "4.0" : "1.0");

// Celda de anotación permanente por carril (producto, horario, arquitectura). Estado local para no
// perder lo que se está tipeando cuando el poll/reloj re-renderiza; sincroniza desde el server solo
// cuando el campo no está enfocado. Guarda en blur si cambió.
function NoteCell({ value, onSave }: { value: string; onSave: (note: string) => void }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(value); }, [value, focused]);
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); if (text !== value) onSave(text); }}
      placeholder="Agregar nota…"
      title={text || "Agregar nota"}
      className="w-full h-8 rounded-md bg-white/70 border border-gray-200 px-2 text-xs text-gray-900 placeholder:text-gray-400 dark:bg-[#0f111a]/70 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
    />
  );
}

export function CriticalProductsView() {
  const { products, doneKeys, hiddenKeys, holidayProductsByDay, notesByKey, isLoading, markDone, unmarkDone, hideFutureRuns, showRuns, removeProduct, setHolidayProducts, setNote } = useProductsContext();
  const { session, calendarDim } = useGuardContext();
  const isAdmin = session?.role === 'admin';
  const { productsAlertsEnabled, productsAlertVolume, productsAddModalOpen, setProductsAddModalOpen, productsShiftFilter } = useUiStore();

  const [now, setNow] = useState(new Date());
  const [editing, setEditing] = useState<CriticalProduct | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [holidayModal, setHolidayModal] = useState<{ day: string; name: string } | null>(null);

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

  const todayDow = now.getDay(); // 0=Dom … 6=Sáb
  const todayKey = format(now, "yyyy-MM-dd");

  // ¿Hoy es feriado y está configurado (≥1 producto programado)? dim_calendario es la fuente.
  const todayIsHoliday = calendarDim.some((r) => r.date_key === todayKey && r.is_holiday);
  const todayIsConfiguredHoliday = todayIsHoliday && (holidayProductsByDay[todayKey]?.size ?? 0) > 0;

  // Feriados en las próximas 48hs (hoy / +1d / +2d) para el banner de admin.
  const upcomingHolidays = useMemo(() => {
    if (!isAdmin) return [] as { day: string; name: string }[];
    const out: { day: string; name: string }[] = [];
    for (let offset = 0; offset <= 2; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const key = format(d, "yyyy-MM-dd");
      const row = calendarDim.find((r) => r.date_key === key && r.is_holiday);
      if (row) out.push({ day: key, name: row.holiday_name ?? "Feriado" });
    }
    return out;
  }, [isAdmin, calendarDim, now]);

  // Productos visibles hoy. En feriado configurado se muestran solo los programados (en vez del
  // filtro por día de semana); la guardia sigue aplicando en ambos casos.
  const visibleProducts = useMemo(() => {
    const holidaySet = todayIsConfiguredHoliday ? holidayProductsByDay[todayKey] : null;
    return products.filter((p) => {
      if (!p.enabled) return false;
      if (holidaySet) {
        if (!holidaySet.has(p.id)) return false; // feriado configurado: solo lo programado
      } else if (!(p.days ?? [1, 2, 3, 4, 5]).includes(todayDow)) {
        return false; // día normal: no ejecuta hoy
      }
      if (productsShiftFilter && productsShiftFilter !== "all" && (p.shift ?? DEFAULT_SHIFT) !== productsShiftFilter) return false;
      return true;
    });
  }, [products, todayDow, productsShiftFilter, todayIsConfiguredHoliday, holidayProductsByDay, todayKey]);

  // Las alertas (notificación + tilín) respetan el filtro: solo avisan de lo visible.
  useProductNotifications(visibleProducts, productsAlertsEnabled, productsAlertVolume);

  // Una tarjeta por (producto, horario), ordenadas por hora.
  const cards = useMemo(() => {
    const list: { product: CriticalProduct; time: string }[] = [];
    for (const p of visibleProducts) {
      for (const t of p.schedules ?? []) {
        if (hiddenKeys.has(`${p.id}|${t}`)) continue; // corrida oculta hoy: fuera del board
        list.push({ product: p, time: t });
      }
    }
    return list.sort((a, b) => a.time.localeCompare(b.time) || a.product.name.localeCompare(b.product.name));
  }, [visibleProducts, hiddenKeys]);

  const cur = hm(now);

  // Arquitecturas presentes en un producto (carriles a renderizar, en orden).
  const lanesFor = (p: CriticalProduct): ProductArch[] =>
    ARCHITECTURES.filter((a) => (p.links ?? []).some((l) => archOf(l) === a));

  // ¿Está completo un horario del producto? (todos sus carriles hechos). Sirve para no
  // ofrecer ocultar corridas que ya están hechas.
  const isTimeDone = (p: CriticalProduct, t: string): boolean => {
    const lanes = lanesFor(p);
    return lanes.length > 0 && lanes.every((a) => doneKeys.has(`${p.id}|${t}|${a}`));
  };

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
        {/* Aviso: hoy es un feriado configurado, se muestra solo lo programado. */}
        {todayIsConfiguredHoliday && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            🎉 Hoy es feriado — mostrando solo los productos programados para hoy.
          </div>
        )}

        {/* Banner de admin: feriados próximos (48hs) a configurar. */}
        {upcomingHolidays.length > 0 && (
          <div className="mb-4 space-y-2">
            {upcomingHolidays.map((h) => {
              const count = holidayProductsByDay[h.day]?.size ?? 0;
              return (
                <div key={h.day} className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                  <div className="text-sm text-amber-900">
                    <span className="font-medium">Feriado próximo:</span> {h.name} ({h.day}).{" "}
                    {count > 0 ? `${count} producto(s) programado(s).` : "Sin productos programados aún."}
                  </div>
                  <Button size="sm" className="h-8 bg-amber-400 hover:bg-amber-500 text-gray-900" onClick={() => setHolidayModal(h)}>
                    Programar feriado
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {cards.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-16">
            No hay productos configurados. Hacé clic en "+ Agregar producto".
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {cards.map(({ product: p, time }) => {
                const lanes = lanesFor(p);
                const cardKey = `${p.id}|${time}`;
                const allDone = lanes.length > 0 && lanes.every((a) => doneKeys.has(`${cardKey}|${a}`));
                const completeAll = () => {
                  for (const a of lanes) {
                    if (!doneKeys.has(`${cardKey}|${a}`)) markDone(p.id, time, a);
                  }
                };
                // Corridas futuras del producto que se pueden ocultar (aún no llegaron ni están hechas).
                const futureTimes = (p.schedules ?? []).filter(
                  (t) => t > cur && !hiddenKeys.has(`${p.id}|${t}`) && !isTimeDone(p, t),
                );
                const hiddenCount = (p.schedules ?? []).filter((t) => hiddenKeys.has(`${p.id}|${t}`)).length;
                return (
                  <div key={cardKey} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1c29] shadow-sm overflow-hidden">
                    {/* Encabezado de la tarjeta */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-sm font-bold tabular-nums rounded-md bg-gray-100 dark:bg-[#0f111a] px-2 py-1 text-gray-900 dark:text-gray-100">
                          {time}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</span>
                        {p.teams_channel && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 truncate hidden sm:inline">· {p.teams_channel}</span>
                        )}
                        {lanes.length === 1 && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-[#0f111a] text-gray-600 dark:text-gray-400">
                            Solo {lanes[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hiddenCount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 bg-white dark:bg-[#1a1c29] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1f2233]"
                            title="Volver a mostrar las corridas ocultas"
                            onClick={() => showRuns(p.id)}
                          >
                            ↩ Mostrar próximas ({hiddenCount})
                          </Button>
                        )}
                        {allDone && futureTimes.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 bg-white dark:bg-[#1a1c29] border border-gray-300 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1f2233]"
                            title="Ocultar las corridas futuras de este producto por hoy"
                            onClick={() => hideFutureRuns(p.id, futureTimes)}
                          >
                            🧹 Ocultar próximas ({futureTimes.length})
                          </Button>
                        )}
                        {allDone ? (
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">✓ Completo</span>
                        ) : (
                          <Button size="sm" className="h-8 bg-amber-400 hover:bg-amber-500 text-gray-900" onClick={completeAll}>
                            ✓ {lanes.length > 1 ? "Completar ambos" : "Completar"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Carriles por arquitectura */}
                    <div className="px-3 pb-3 space-y-2">
                      {lanes.map((a) => {
                        const laneKey = `${cardKey}|${a}`;
                        const done = doneKeys.has(laneKey);
                        const past = time < cur && !done;
                        const links = (p.links ?? []).filter((l) => archOf(l) === a);
                        const bgClass = done
                          ? "bg-[#d1fae5] dark:bg-[#064e3b] border-emerald-500"
                          : past
                          ? "bg-[#fee2e2] dark:bg-[#7f1d1d] border-red-500"
                          : "bg-[#f1f5f9] dark:bg-[#13151f] border-blue-400 dark:border-blue-500";
                        return (
                          <div key={a} className={`flex items-center gap-3 rounded-md border-l-4 px-3 py-2.5 ${bgClass}`}>
                            {/* Marcador de arquitectura */}
                            <div className="w-[110px] shrink-0">
                              <div className="text-lg font-bold leading-none text-gray-900 dark:text-gray-100">{a}</div>
                              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Arquitectura</div>
                            </div>
                            {/* Nota del carril */}
                            <div className="flex-1 min-w-0">
                              <NoteCell value={notesByKey[laneKey] ?? ""} onSave={(v) => setNote(p.id, time, a, v)} />
                            </div>
                            {/* Links de la arquitectura */}
                            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                              {links.map((link, li) => {
                                const linkKey = `${laneKey}|${li}`;
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
                            </div>
                            {/* Estado */}
                            <div className="w-[84px] text-xs font-medium text-right shrink-0">
                              {done ? (
                                <span className="text-emerald-700 dark:text-emerald-400">✓ Listo</span>
                              ) : past ? (
                                <span className="text-red-600 dark:text-red-400">⚠ Pendiente</span>
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400">Próximo</span>
                              )}
                            </div>
                            {/* Acción */}
                            <div className="shrink-0">
                              {done ? (
                                <Button size="sm" variant="outline" className="h-8 bg-white dark:bg-[#1a1c29] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1f2233]" title="Desmarcar" onClick={() => unmarkDone(p.id, time, a)}>
                                  ↩
                                </Button>
                              ) : (
                                <Button size="sm" className="h-8 bg-amber-400 hover:bg-amber-500 text-gray-900" onClick={() => markDone(p.id, time, a)}>
                                  Listo
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          <span
                            className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: (p.shift ?? DEFAULT_SHIFT) === "Guardia Vespertina" ? "#A855F7" : "#F97316" }}
                          >
                            {SHIFTS.find((s) => s.value === (p.shift ?? DEFAULT_SHIFT))?.label ?? "Matutina"}
                          </span>
                          {lanesFor(p).map((a) => (
                            <span key={a} className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-[#0f111a] text-gray-600 dark:text-gray-400">
                              {a}
                            </span>
                          ))}
                        </div>
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

      {holidayModal && (
        <HolidayScheduleModal
          open={!!holidayModal}
          onOpenChange={(v) => { if (!v) setHolidayModal(null); }}
          day={holidayModal.day}
          holidayName={holidayModal.name}
          products={products}
          selectedIds={holidayProductsByDay[holidayModal.day] ?? new Set()}
          onSave={(ids) => setHolidayProducts(holidayModal.day, ids)}
        />
      )}
    </div>
  );
}
