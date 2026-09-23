/** Registro diario de pasos de un cliente. */
export interface DailySteps {
  _id: string;
  /** Id del cliente (colección Client). */
  clientId: string;
  /** Fecha del registro (ISO YYYY-MM-DD). */
  date: string;
  /** Pasos de ese día. */
  steps: number;
  /** Objetivo diario de pasos. */
  goal?: number;
}

/** Día del gráfico de los últimos 15 días (incluye días sin registro). */
export interface DailyStepsChartDay {
  date: string;
  label: string;
  steps: number;
  goal: number;
}
