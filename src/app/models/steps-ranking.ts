import type { DailySteps } from './daily-steps';

export type StepsRankingPeriod = 'week' | 'month';

export type StepsRankingEntry = {
  clientId: string;
  fullName: string;
  avatar: string;
  steps: number;
  avgDaily?: number;
};

export type RankingClient = {
  clientId: string;
  fullName: string;
  avatar: string;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function formatStepsCount(steps: number): string {
  return steps.toLocaleString('es-ES');
}

export function normalizeStepsRankingEntry(raw: Record<string, unknown>): StepsRankingEntry {
  const clientId = raw['clientId'] ?? raw['_id'] ?? raw['id'] ?? '';
  return {
    clientId: typeof clientId === 'string' ? clientId : String(clientId ?? ''),
    fullName: String(raw['fullName'] ?? raw['name'] ?? 'Cliente'),
    avatar: String(raw['avatar'] ?? ''),
    steps: Number(raw['steps'] ?? 0),
    avgDaily: raw['avgDaily'] != null ? Number(raw['avgDaily']) : undefined,
  };
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfCalendarWeek(date: Date): Date {
  const next = startOfDay(date);
  const weekday = next.getDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  next.setDate(next.getDate() - mondayOffset);
  return next;
}

export function endOfCalendarWeek(date: Date): Date {
  const end = startOfCalendarWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfCalendarMonth(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

export function endOfCalendarMonth(date: Date): Date {
  const end = startOfCalendarMonth(date);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfPeriod(date: Date, period: StepsRankingPeriod): Date {
  return period === 'week' ? startOfCalendarWeek(date) : startOfCalendarMonth(date);
}

export function shiftPeriod(date: Date, period: StepsRankingPeriod, delta: number): Date {
  const next = startOfPeriod(date, period);
  if (period === 'week') next.setDate(next.getDate() + delta * 7);
  else next.setMonth(next.getMonth() + delta);
  return next;
}

export function isSamePeriod(
  date: Date,
  other: Date,
  period: StepsRankingPeriod,
): boolean {
  return startOfPeriod(date, period).getTime() === startOfPeriod(other, period).getTime();
}

export function isCurrentPeriod(date: Date, period: StepsRankingPeriod, now = new Date()): boolean {
  return isSamePeriod(date, now, period);
}

export function canGoToNextPeriod(
  date: Date,
  period: StepsRankingPeriod,
  now = new Date(),
): boolean {
  return startOfPeriod(date, period) < startOfPeriod(now, period);
}

export function formatPeriodLabel(date: Date, period: StepsRankingPeriod): string {
  if (period === 'week') {
    const start = startOfCalendarWeek(date);
    const end = endOfCalendarWeek(date);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: sameMonth ? undefined : 'short',
    });
    const endLabel = end.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${startLabel} – ${endLabel}`;
  }

  const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildStepsRanking(
  clients: RankingClient[],
  records: DailySteps[],
  period: StepsRankingPeriod,
  refDate: Date,
  now = new Date(),
): StepsRankingEntry[] {
  const recordsByClient = new Map<string, DailySteps[]>();
  for (const record of records) {
    const list = recordsByClient.get(record.clientId) ?? [];
    list.push(record);
    recordsByClient.set(record.clientId, list);
  }

  const daysForAvg = elapsedDaysInPeriod(period, refDate, now);

  return clients
    .map((client) => {
      const steps = sumStepsForPeriod(
        recordsByClient.get(client.clientId) ?? [],
        period,
        refDate,
        now,
      );
      return {
        ...client,
        steps,
        avgDaily: Math.round(steps / Math.max(1, daysForAvg)),
      };
    })
    .filter((entry) => entry.steps > 0)
    .sort((a, b) => b.steps - a.steps);
}

function elapsedDaysInPeriod(
  period: StepsRankingPeriod,
  refDate: Date,
  now: Date,
): number {
  const today = startOfDay(now);
  if (period === 'week') {
    const start = startOfCalendarWeek(refDate);
    const end = endOfCalendarWeek(refDate);
    const last = today < end ? today : startOfDay(end);
    return Math.max(1, Math.floor((last.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  }

  const start = startOfCalendarMonth(refDate);
  const end = endOfCalendarMonth(refDate);
  const last = today < end ? today : startOfDay(end);
  return Math.max(1, last.getDate());
}

function sumStepsForPeriod(
  records: DailySteps[],
  period: StepsRankingPeriod,
  refDate: Date,
  now: Date,
): number {
  const today = startOfDay(now);
  const start = startOfPeriod(refDate, period);
  const end =
    period === 'week' ? endOfCalendarWeek(refDate) : endOfCalendarMonth(refDate);

  let total = 0;
  for (const record of records) {
    const day = new Date(`${record.date}T00:00:00`);
    if (Number.isNaN(day.getTime()) || day > today) continue;
    if (day < start || day > end) continue;
    total += Math.max(0, Number(record.steps) || 0);
  }
  return total;
}
