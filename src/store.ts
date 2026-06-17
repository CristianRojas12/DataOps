import { create } from 'zustand';
import type { GuardType } from './types';

// Filtro de guardia para la vista de productos críticos.
// null = sin decidir (CriticalProductsControls lo auto-detecta según tu guardia de hoy).
export type ProductsShiftFilter = GuardType | "all" | null;

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
  productsShiftFilter: ProductsShiftFilter;
  setProductsShiftFilter: (filter: ProductsShiftFilter) => void;

  // Time Off Request Modal state
  timeOffModalOpen: boolean;
  setTimeOffModalOpen: (open: boolean) => void;
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
  productsShiftFilter: null,
  setProductsShiftFilter: (filter) => set({ productsShiftFilter: filter }),

  timeOffModalOpen: false,
  setTimeOffModalOpen: (open) => set({ timeOffModalOpen: open }),
}));

export type { CalendarDay };
