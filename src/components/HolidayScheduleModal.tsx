import { useEffect, useState } from "react";

import type { CriticalProduct } from "../productsTypes";
import { DEFAULT_SHIFT, SHIFTS } from "../productsTypes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: string; // "yyyy-MM-dd"
  holidayName: string;
  products: CriticalProduct[];
  selectedIds: Set<string>;
  onSave: (productIds: string[]) => Promise<void>;
}

export function HolidayScheduleModal({ open, onOpenChange, day, holidayName, products, selectedIds, onSave }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Sincroniza la selección con la config actual cada vez que se abre.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(selectedIds));
  }, [open, selectedIds]);

  const enabledProducts = products.filter((p) => p.enabled);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave([...selected]);
      onOpenChange(false);
    } catch {
      // El error ya se loguea en el context; dejamos el modal abierto para reintentar.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-normal">
            Programar feriado — {holidayName || day}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Elegí qué productos críticos van a ejecutar el {day}. Ese día se mostrarán solo los
          seleccionados (en vez del set por día de semana). Si no seleccionás ninguno, el feriado se
          comporta como un día normal.
        </p>

        <div className="space-y-1.5 mt-2">
          {enabledProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay productos disponibles.</p>
          ) : (
            enabledProducts.map((p) => {
              const shift = p.shift ?? DEFAULT_SHIFT;
              const checked = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#13151f] px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1f2233]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span
                    className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: shift === "Guardia Vespertina" ? "#A855F7" : "#F97316" }}
                  >
                    {SHIFTS.find((s) => s.value === shift)?.label ?? "Matutina"}
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1f2233]">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="bg-amber-400 hover:bg-amber-500 text-gray-900">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
