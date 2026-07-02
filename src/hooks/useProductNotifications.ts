import { useEffect, useRef } from "react";
import type { CriticalProduct } from "../productsTypes";
import { playNotificationChime } from "../lib/sound";

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Minutos desde medianoche para un "HH:MM".
function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNotified(): Set<string> {
  const raw = localStorage.getItem("pc_notified:" + todayKey());
  return new Set<string>(raw ? JSON.parse(raw) : []);
}

function saveNotified(set: Set<string>): void {
  localStorage.setItem("pc_notified:" + todayKey(), JSON.stringify([...set]));
}

/**
 * Dispara una notificación del navegador AGRUPADA por horario (sin sonido),
 * deduplicada por navegador/día vía localStorage. Portado de la versión vanilla.
 */
export function useProductNotifications(products: CriticalProduct[], enabled: boolean, volume = 0.6, hiddenKeys: Set<string> = new Set()) {
  const productsRef = useRef(products);
  productsRef.current = products;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  // Corridas ocultas manualmente (productId|HH:MM): no deben sonar ni notificar.
  const hiddenKeysRef = useRef(hiddenKeys);
  hiddenKeysRef.current = hiddenKeys;
  // Minuto del último chequeo. Permite detectar horarios "cruzados" aunque el
  // timer se haya retrasado en segundo plano (en vez de exigir el minuto exacto).
  const lastMinRef = useRef<number>(-1);

  useEffect(() => {
    // Dispara las notificaciones de un horario puntual (sonido + visual).
    const fireFor = (hm: string, names: string[]) => {
      playNotificationChime(volumeRef.current);
      if ("Notification" in window && Notification.permission === "granted") {
        const title =
          names.length === 1
            ? `Ejecutar a las ${hm}: ${names[0]}`
            : `${names.length} productos a las ${hm}`;
        new Notification(title, { body: names.join(", "), silent: true });
      }
    };

    const check = () => {
      if (!enabledRef.current) return;

      const dow = new Date().getDay(); // 0=Dom … 6=Sáb
      const nowMin = hmToMinutes(nowHM());
      const prevMin = lastMinRef.current;
      lastMinRef.current = nowMin;

      // Primer chequeo del montaje: solo fija el punto de partida, no dispara
      // horarios ya pasados del día.
      if (prevMin < 0) return;

      const notified = getNotified();

      // Horarios candidatos: los que ocurrieron en (prevMin, nowMin]. Si el reloj
      // no avanzó (mismo minuto), reevalúa ese minuto por si entró un producto.
      const lo = prevMin;
      const hi = nowMin;

      // Agrupa por horario los productos que aplican hoy y caen en el rango.
      const byTime = new Map<string, string[]>();
      for (const p of productsRef.current) {
        if (!p.enabled) continue;
        if (!(p.days ?? [1, 2, 3, 4, 5]).includes(dow)) continue;
        for (const t of p.schedules ?? []) {
          if (notified.has(t)) continue;
          if (hiddenKeysRef.current.has(`${p.id}|${t}`)) continue; // corrida oculta hoy

          const tMin = hmToMinutes(t);
          // (lo, hi]; si cruzó medianoche (hi < lo) el rango "envuelve".
          const inRange = hi >= lo ? tMin > lo && tMin <= hi : tMin > lo || tMin <= hi;
          if (!inRange) continue;
          const arr = byTime.get(t);
          if (arr) arr.push(p.name);
          else byTime.set(t, [p.name]);
        }
      }

      if (byTime.size === 0) return;

      for (const [hm, names] of byTime) {
        fireFor(hm, names);
        notified.add(hm);
      }
      saveNotified(notified);
    };

    check();
    const id = setInterval(check, 20_000);
    // Al volver a primer plano, recupera lo que se hubiera retrasado en background.
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
