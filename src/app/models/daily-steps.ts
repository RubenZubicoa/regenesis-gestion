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

export interface DailyStepsWritePayload {
  clientId: string;
  date: string;
  steps: number;
  goal?: number;
}

export function findDailyStepsByDate(
  records: DailySteps[],
  date: string,
): DailySteps | undefined {
  const day = date.slice(0, 10);
  return records.find((record) => record.date.slice(0, 10) === day);
}

export function latestDailyStepsRecord(records: DailySteps[]): DailySteps | undefined {
  return [...records]
    .filter((record) => record.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

export function latestDailyStepsGoal(records: DailySteps[]): number | undefined {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const goal = sorted[i]?.goal;
    if (goal != null && goal > 0) return goal;
  }
  return undefined;
}

export function upsertDailyStepsRecord(
  records: DailySteps[],
  saved: DailySteps,
): DailySteps[] {
  const day = saved.date.slice(0, 10);
  const index = records.findIndex(
    (record) => record._id === saved._id || record.date.slice(0, 10) === day,
  );
  if (index < 0) return [...records, saved];
  const next = [...records];
  next[index] = saved;
  return next;
}
