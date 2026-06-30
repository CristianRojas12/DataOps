// Productos críticos (pestaña de monitoreo). Espeja la tabla critical_products.
import type { GuardType } from "./types";

// Tipo de link: define el comportamiento del botón.
//  - "databricks": abre la URL en una pestaña nueva (botón gris).
//  - "powerbi":    copia la URL al portapapeles (botón azul 📊).
export type ProductLinkKind = "databricks" | "powerbi";

// Arquitectura a la que pertenece un link. Define en qué carril del board aparece.
export type ProductArch = "1.0" | "4.0";

export interface ProductLink {
  label: string; // nombre visible en el botón (ej: "Link 1", "PBI Ventas")
  url: string;
  kind: ProductLinkKind;
  arch: ProductArch; // carril (arquitectura) en el que se muestra. Default "1.0"
}

export interface CriticalProduct {
  id: string;
  name: string;
  links: ProductLink[]; // cantidad variable de links con nombre y tipo
  teams_channel: string;
  schedules: string[]; // horarios "HH:MM"
  days: number[]; // días que ejecuta (0=Dom … 6=Sáb). Default Lun-Vie [1,2,3,4,5]
  shift: GuardType; // guardia a la que pertenece. Default "Guardia Matutina"
  enabled: boolean;
}

// Guardias disponibles para el selector del formulario y el filtro de la vista.
export const SHIFTS: ReadonlyArray<{ value: GuardType; label: string }> = [
  { value: "Guardia Matutina", label: "Matutina" },
  { value: "Guardia Vespertina", label: "Vespertina" },
];

export const DEFAULT_SHIFT: GuardType = "Guardia Matutina";

// Arquitecturas disponibles. El orden define el orden de los carriles en el board.
export const ARCHITECTURES: ProductArch[] = ["1.0", "4.0"];

export const DEFAULT_ARCH: ProductArch = "1.0";

// Días de la semana en orden Lun→Dom para los botones del formulario.
export const WEEKDAYS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

// Selección por defecto: Lunes a Viernes.
export const DEFAULT_DAYS: number[] = [1, 2, 3, 4, 5];

// Para crear/editar (sin id).
export type CriticalProductInput = Omit<CriticalProduct, "id">;

// Una tarea concreta del día = producto + horario.
export interface ProductTask {
  product: CriticalProduct;
  time: string;
  done: boolean;
}
