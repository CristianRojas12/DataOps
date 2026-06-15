import { useEffect, useRef } from "react";
import type { CriticalProduct } from "../productsTypes";
import { playNotificationChime } from "../lib/sound";

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
export function useProductNotifications(products: CriticalProduct[], enabled: boolean, volume = 0.6) {
  const productsRef = useRef(products);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    const check = () => {
      if (!enabledRef.current) return;

      const cur = nowHM();
      const dow = new Date().getDay(); // 0=Dom … 6=Sáb
      const notified = getNotified();
      if (notified.has(cur)) return;

      const names = productsRef.current
        .filter(
          (p) =>
            p.enabled &&
            (p.days ?? [1, 2, 3, 4, 5]).includes(dow) &&
            (p.schedules ?? []).includes(cur),
        )
        .map((p) => p.name);
      if (names.length === 0) return;

      // Sonido suave "tilín" al llegar la hora (aunque el navegador no permita
      // la notificación visual; la web propia silencia esa con silent:true).
      playNotificationChime(volumeRef.current);

      if ("Notification" in window && Notification.permission === "granted") {
        const title =
          names.length === 1
            ? `Ejecutar a las ${cur}: ${names[0]}`
            : `${names.length} productos a las ${cur}`;
        new Notification(title, { body: names.join(", "), silent: true });
      }

      notified.add(cur);
      saveNotified(notified);
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
}
