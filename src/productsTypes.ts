// Productos críticos (pestaña de monitoreo). Espeja la tabla critical_products.

// Tipo de link: define el comportamiento del botón.
//  - "databricks": abre la URL en una pestaña nueva (botón gris).
//  - "powerbi":    copia la URL al portapapeles (botón azul 📊).
export type ProductLinkKind = "databricks" | "powerbi";

export interface ProductLink {
  label: string; // nombre visible en el botón (ej: "Link 1", "PBI Ventas")
  url: string;
  kind: ProductLinkKind;
}

export interface CriticalProduct {
  id: string;
  name: string;
  links: ProductLink[]; // cantidad variable de links con nombre y tipo
  teams_channel: string;
  schedules: string[]; // horarios "HH:MM"
  days: number[]; // días que ejecuta (0=Dom … 6=Sáb). Default Lun-Vie [1,2,3,4,5]
  enabled: boolean;
}

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
