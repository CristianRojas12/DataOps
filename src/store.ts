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
  productsAddModalOpen: boolean;
  setProductsAddModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  productsAlertsEnabled: localStorage.getItem("pc_alerts") !== "false",
  setProductsAlertsEnabled: (enabled) => {
    localStorage.setItem("pc_alerts", enabled ? "true" : "false");
    set({ productsAlertsEnabled: enabled });
  },
  productsAddModalOpen: false,
  setProductsAddModalOpen: (open) => set({ productsAddModalOpen: open }),
}));

export type { CalendarDay };
