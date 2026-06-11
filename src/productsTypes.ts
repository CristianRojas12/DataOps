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
  enabled: boolean;
}

// Para crear/editar (sin id).
export type CriticalProductInput = Omit<CriticalProduct, "id">;

// Una tarea concreta del día = producto + horario.
export interface ProductTask {
  product: CriticalProduct;
  time: string;
  done: boolean;
}
