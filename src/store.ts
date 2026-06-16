import { create } from 'zustand';

interface CalendarDay {
  date_key: string;
  year: number;
  month: number;
  day: number;
  day_of_week: number;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name: string | null;
}

interface UiState {
  // Critical products controls state
  productsAlertsEnabled: boolean;
  setProductsAlertsEnabled: (enabled: boolean) => void;
  productsAlertVolume: number; // 0..1
  setProductsAlertVolume: (volume: number) => void;
  productsAddModalOpen: boolean;
  setProductsAddModalOpen: (open: boolean) => void;

  // Time Off Request Modal state
  timeOffModalOpen: boolean;
  setTimeOffModalOpen: (open: boolean) => void;

  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const useUiStore = create<UiState>((set) => ({
  productsAlertsEnabled: localStorage.getItem("pc_alerts") !== "false",
  setProductsAlertsEnabled: (enabled) => {
    localStorage.setItem("pc_alerts", enabled ? "true" : "false");
    set({ productsAlertsEnabled: enabled });
  },
  productsAlertVolume: (() => {
    const v = parseFloat(localStorage.getItem("pc_volume") ?? "");
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.6;
  })(),
  setProductsAlertVolume: (volume) => {
    const clamped = Math.min(1, Math.max(0, volume));
    localStorage.setItem("pc_volume", String(clamped));
    set({ productsAlertVolume: clamped });
  },
  productsAddModalOpen: false,
  setProductsAddModalOpen: (open) => set({ productsAddModalOpen: open }),

  timeOffModalOpen: false,
  setTimeOffModalOpen: (open) => set({ timeOffModalOpen: open }),

  theme: (localStorage.getItem("dataops_theme") as "light" | "dark") || "light",
  setTheme: (theme) => {
    localStorage.setItem("dataops_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    set({ theme });
  },
}));

export type { CalendarDay };
