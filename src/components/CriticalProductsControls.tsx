import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "../store";
import { useGuardContext } from "../context";

function hm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CriticalProductsControls() {
  const [now, setNow] = useState(new Date());
  const { session } = useGuardContext();
  const isAdmin = session?.role === 'admin';
  const { productsAlertsEnabled, setProductsAlertsEnabled, setProductsAddModalOpen } = useUiStore();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const toggleAlerts = (checked: boolean) => {
    setProductsAlertsEnabled(checked);
    if (checked && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={productsAlertsEnabled}
          onChange={(e) => toggleAlerts(e.target.checked)}
          className="w-4 h-4 accent-indigo-500"
        />
        Alertas activas
      </label>
      <span className="text-lg tabular-nums">{hm(now)}</span>
      {isAdmin && (
         <Button onClick={() => setProductsAddModalOpen(true)} className="bg-amber-400 hover:bg-amber-500 text-gray-900 gap-2 h-9 px-4 w-auto min-w-[140px] rounded-md text-sm font-medium transition-colors flex items-center justify-center">
           <span className="text-lg leading-none mb-[2px]">+</span> Agregar producto
         </Button>
      )}
    </div>
  );
}
