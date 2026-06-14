import { useEffect, useState } from "react";

import { useProductsContext } from "../productsContext";
import type { CriticalProduct, ProductLink, ProductLinkKind } from "../productsTypes";
import { WEEKDAYS, DEFAULT_DAYS } from "../productsTypes";
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
  product: CriticalProduct | null;
}

function normalizeSchedules(rawList: string[]): { ok: true; value: string[] } | { ok: false; error: string } {
  const out: string[] = [];
  for (const raw of rawList) {
    if (!raw.trim()) continue;
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

function emptyLink(label: string): ProductLink {
  return { label, url: "", kind: "databricks" };
}

export function ProductFormModal({ open, onOpenChange, product }: Props) {
  const { addProduct, updateProduct } = useProductsContext();

  const [name, setName] = useState("");
  const [teams, setTeams] = useState("");
  const [links, setLinks] = useState<ProductLink[]>([emptyLink("Link 1")]);
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [schedules, setSchedules] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Sincroniza los campos cada vez que se abre el modal.
  useEffect(() => {
    if (!open) return;
    setError("");
    setName(product?.name ?? "");
    setTeams(product?.teams_channel ?? "");
    setLinks(product?.links?.length ? product.links.map((l) => ({ ...l })) : [emptyLink("Link 1")]);
    setDays(product?.days ?? DEFAULT_DAYS);
    setSchedules(product?.schedules?.length ? [...product.schedules] : [""]);
  }, [open, product]);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const setLinkAt = (i: number, up: Partial<ProductLink>) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...up } : l)));

  const addLinkRow = () => setLinks((prev) => [...prev, emptyLink(`Link ${prev.length + 1}`)]);
  const removeLinkRow = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const moveLink = (i: number, dir: -1 | 1) =>
    setLinks((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const setSchedAt = (i: number, value: string) =>
    setSchedules((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  const addSchedRow = () => setSchedules((prev) => [...prev, ""]);
  const removeSchedRow = (i: number) => setSchedules((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("El nombre no puede estar vacío."); return; }

    // Normaliza links: descarta filas sin URL, exige nombre por cada link con URL.
    const cleanLinks: ProductLink[] = [];
    for (const l of links) {
      const url = (l.url ?? "").trim();
      const label = (l.label ?? "").trim();
      if (!url) continue;
      if (!label) { setError("Cada link necesita un nombre."); return; }
      cleanLinks.push({ label, url, kind: l.kind });
    }
    if (cleanLinks.length === 0) { setError("Agregá al menos un link con su URL."); return; }

    if (days.length === 0) { setError("Seleccioná al menos un día de ejecución."); return; }

    const norm = normalizeSchedules(schedules);
    if (!norm.ok) { setError(norm.error); return; }

    const payload = {
      name: name.trim(),
      links: cleanLinks,
      teams_channel: teams.trim(),
      schedules: norm.value,
      days: [...days].sort((a, b) => a - b),
      enabled: true,
    };

    try {
      setSaving(true);
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
      <DialogContent className="sm:max-w-[560px] bg-white border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto">
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
            <Label>Canal de Teams (opcional)</Label>
            <Input value={teams} onChange={(e) => setTeams(e.target.value)} placeholder="Ej: Operaciones Daily" className="bg-white border-gray-200" />
          </div>

          <div className="space-y-1">
            <Label>Links</Label>
            <p className="text-xs text-gray-500">
              "Databricks" abre la URL en una pestaña nueva; "Power BI" la copia al portapapeles.
            </p>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={l.label}
                    onChange={(e) => setLinkAt(i, { label: e.target.value })}
                    placeholder="Nombre (ej: Link 1)"
                    className="w-36 shrink-0 bg-white border-gray-200"
                  />
                  <Input
                    value={l.url}
                    onChange={(e) => setLinkAt(i, { url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-white border-gray-200"
                  />
                  <select
                    value={l.kind}
                    onChange={(e) => setLinkAt(i, { kind: e.target.value as ProductLinkKind })}
                    className="h-9 shrink-0 rounded-md bg-white border border-gray-200 px-2 text-sm text-gray-900"
                  >
                    <option value="databricks">Databricks</option>
                    <option value="powerbi">Power BI</option>
                  </select>
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => moveLink(i, -1)}
                      disabled={i === 0}
                      title="Subir"
                      className="px-1 text-xs leading-none text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(i, 1)}
                      disabled={i === links.length - 1}
                      title="Bajar"
                      className="px-1 text-xs leading-none text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500"
                    >
                      ▼
                    </button>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLinkRow(i)} className="shrink-0 text-red-500 hover:text-red-600 hover:bg-gray-100">
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addLinkRow} className="mt-2 bg-white border-gray-200 hover:bg-gray-100 hover:text-gray-900">
              + Agregar link
            </Button>
          </div>

          <div className="space-y-1">
            <Label>Días de ejecución</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    aria-pressed={active}
                    className={`h-9 w-12 rounded-md border text-sm font-medium transition-colors ${
                      active
                        ? "bg-amber-400 border-amber-500 text-gray-900 hover:bg-amber-500"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
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
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedRow(i)} className="text-red-500 hover:text-red-600 hover:bg-gray-100">
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSchedRow} className="mt-2 bg-white border-gray-200 hover:bg-gray-100 hover:text-gray-900">
              + Agregar horario
            </Button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-900 hover:bg-gray-100">
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
