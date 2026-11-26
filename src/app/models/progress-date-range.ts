import { todayIsoDate, type Weight } from './weight';

export const DEFAULT_PROGRESS_WEEKS = 12;

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function shiftIsoDate(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function defaultProgressDateRange(): { from: string; to: string } {
  const to = todayIsoDate();
  return { from: shiftIsoDate(to, -(DEFAULT_PROGRESS_WEEKS * 7)), to };
}

export function progressWeekCount(from: string, to: string): number {
  const start = new Date(`${from.slice(0, 10)}T12:00:00`);
  const end = new Date(`${to.slice(0, 10)}T12:00:00`);
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  return Math.max(1, Math.round(days / 7));
}

export function progressWeeksLabel(from: string, to: string): string {
  const weeks = progressWeekCount(from, to);
  return weeks === 1 ? '1 semana' : `${weeks} semanas`;
}

export function isIsoDateInRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10);
  return day >= from.slice(0, 10) && day <= to.slice(0, 10);
}

export function filterWeightChartPoints(
  weight: Weight,
  from: string,
  to: string,
): { label: string; value: number }[] {
  return weight.labels
    .map((label, index) => ({
      label: String(label).slice(0, 10),
      value: Number(weight.data[index] ?? 0),
    }))
    .filter((point) => isIsoDateInRange(point.label, from, to));
}
