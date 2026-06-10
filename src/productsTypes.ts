// Productos críticos (pestaña de monitoreo). Espeja la tabla critical_products.
export interface CriticalProduct {
  id: string;
  name: string;
  url: string;
  url2: string;
  powerbi_url: string;
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
