import { useEffect, useRef } from "react";
import type { CriticalProduct } from "../productsTypes";

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
export function useProductNotifications(products: CriticalProduct[], enabled: boolean) {
  const productsRef = useRef(products);
  productsRef.current = products;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const check = () => {
      if (!enabledRef.current) return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const cur = nowHM();
      const notified = getNotified();
      if (notified.has(cur)) return;

      const names = productsRef.current
        .filter((p) => p.enabled && (p.schedules ?? []).includes(cur))
        .map((p) => p.name);
      if (names.length === 0) return;

      const title =
        names.length === 1
          ? `Ejecutar a las ${cur}: ${names[0]}`
          : `${names.length} productos a las ${cur}`;
      new Notification(title, { body: names.join(", "), silent: true });

      notified.add(cur);
      saveNotified(notified);
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
}
