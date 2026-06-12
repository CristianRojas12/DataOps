import { useEffect, useState } from "react";

import { useProductsContext } from "../productsContext";
import type { CriticalProduct } from "../productsTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: CriticalProduct | null; // null = alta
}

// Valida y normaliza horarios HH:MM (00:00-23:59), ordena y deduplica.
// Portado de NotebookForm._save de la app original.
function normalizeSchedules(values: string[]): { ok: true; value: string[] } | { ok: false; error: string } {
  const out: string[] = [];
  for (const rawValue of values) {
    const raw = (rawValue ?? "").trim();
    if (!raw) continue;
    const parts = raw.split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (parts.length !== 2 || !Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return { ok: false, error: `Horario inválido: '${raw}' — usá formato HH:MM (ej: 06:30).` };
    }
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return { ok: true, value: [...new Set(out)].sort() };
}

export function ProductFormModal({ open, onOpenChange, product }: Props) {
  const { addProduct, updateProduct } = useProductsContext();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [url2, setUrl2] = useState("");
  const [powerbi, setPowerbi] = useState("");
  const [teams, setTeams] = useState("");
  const [schedules, setSchedules] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Sincroniza los campos cada vez que se abre el modal.
  useEffect(() => {
    if (!open) return;
    setError("");
    setName(product?.name ?? "");
    setUrl(product?.url ?? "");
    setUrl2(product?.url2 ?? "");
    setPowerbi(product?.powerbi_url ?? "");
    setTeams(product?.teams_channel ?? "");
    setSchedules(product?.schedules?.length ? [...product.schedules] : [""]);
  }, [open, product]);

  const setSchedAt = (i: number, value: string) =>
    setSchedules((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  const addSchedRow = () => setSchedules((prev) => [...prev, ""]);
  const removeSchedRow = (i: number) => setSchedules((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("El nombre no puede estar vacío."); return; }
    if (!url.trim()) { setError("La URL (Link 1) no puede estar vacía."); return; }

    const norm = normalizeSchedules(schedules);
    if (!norm.ok) { setError(norm.error); return; }

    const payload = {
      name: name.trim(),
      url: url.trim(),
      url2: url2.trim(),
      powerbi_url: powerbi.trim(),
      teams_channel: teams.trim(),
      schedules: norm.value,
      enabled: true,
    };

    setSaving(true);
    try {
      if (product) await updateProduct(product.id, payload);
      else await addProduct(payload);
      onOpenChange(false);
    } catch {
      setError("No se pudo guardar. Revisá la conexión e intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-normal">
            {product ? "Editar producto crítico" : "Nuevo producto crítico"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre del producto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Avance de Ventas" className="bg-white border-gray-200" />
          </div>
          <div className="space-y-1">
            <Label>Link 1 — URL en Databricks</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://adb-xxx.azuredatabricks.net/..." className="bg-white border-gray-200" />
          </div>
          <div className="space-y-1">
            <Label>Link 2 — URL (opcional)</Label>
            <Input value={url2} onChange={(e) => setUrl2(e.target.value)} placeholder="https://adb-xxx.azuredatabricks.net/..." className="bg-white border-gray-200" />
          </div>
          <div className="space-y-1">
            <Label>Link de Power BI (opcional)</Label>
            <Input value={powerbi} onChange={(e) => setPowerbi(e.target.value)} placeholder="https://app.powerbi.com/..." className="bg-white border-gray-200" />
          </div>
          <div className="space-y-1">
            <Label>Canal de Teams (opcional)</Label>
            <Input value={teams} onChange={(e) => setTeams(e.target.value)} placeholder="Ej: Operaciones Daily" className="bg-white border-gray-200" />
          </div>

          <div className="space-y-1">
            <Label>Horarios de ejecución (HH:MM)</Label>
            <div className="space-y-2">
              {schedules.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={s}
                    onChange={(e) => setSchedAt(i, e.target.value)}
                    placeholder="06:00"
                    className="w-32 bg-white border-gray-200"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedRow(i)} className="text-red-400 hover:text-red-300 hover:bg-white/5">
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSchedRow} className="mt-2 bg-white border-gray-200 hover:bg-[#1f2233] hover:text-gray-900">
              + Agregar horario
            </Button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-900 hover:bg-white/10">
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
