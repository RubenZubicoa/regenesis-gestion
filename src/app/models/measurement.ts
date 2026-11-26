import type { MeasurementMaster } from './MeasurementMaster';
import { todayIsoDate } from './weight';

export const MEASUREMENT_HISTORY_WEEKS = 12;

export type {
  CreateMeasurementMasterInput,
  MeasurementMaster,
  UpdateMeasurementMasterInput,
} from './MeasurementMaster';

export interface Measurement {
  _id: string;
  client: string;
  MeasurementId: string;
  label: string;
  unit: string;
  value: number;
  delta: number;
  date: string;
}

export interface MeasurementCreatePayload {
  client: string;
  MeasurementId: string;
  value: number;
  delta: number;
  date: string;
}

export function measurementDelta(
  current: Measurement,
  value: number,
  date: string,
): number {
  const rounded = (n: number) => Number(n.toFixed(1));
  if (!current._id) return 0;
  if (current.date.slice(0, 10) === date.slice(0, 10)) {
    return rounded(current.delta + (value - current.value));
  }
  return rounded(value - current.value);
}

export function isSameMeasurementDay(current: Measurement, date: string): boolean {
  return Boolean(current._id) && current.date.slice(0, 10) === date.slice(0, 10);
}

export interface MeasurementHistoryPoint {
  date: string;
  value: number;
}

export interface MeasurementHistorySeries {
  measurementId: string;
  label: string;
  unit: string;
  records: MeasurementHistoryPoint[];
}

export function measurementHistorySeries(
  records: Measurement[],
  masters: MeasurementMaster[],
): MeasurementHistorySeries[] {
  const byId = new Map<string, Measurement[]>();
  for (const record of records) {
    if (!record.MeasurementId) continue;
    const list = byId.get(record.MeasurementId) ?? [];
    list.push(record);
    byId.set(record.MeasurementId, list);
  }

  const catalog = [...masters]
    .filter((master) => master._id)
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));

  const series: MeasurementHistorySeries[] = [];
  const seen = new Set<string>();

  for (const master of catalog) {
    seen.add(master._id);
    const points = toHistoryPoints(byId.get(master._id) ?? []);
    if (points.length === 0) continue;
    series.push({
      measurementId: master._id,
      label: master.label,
      unit: master.unit,
      records: points,
    });
  }

  for (const [id, items] of byId) {
    if (seen.has(id)) continue;
    const points = toHistoryPoints(items);
    if (points.length === 0) continue;
    series.push({
      measurementId: id,
      label: items[0]?.label || 'Medida',
      unit: items[0]?.unit || '',
      records: points,
    });
  }

  return series;
}

function toHistoryPoints(records: Measurement[]): MeasurementHistoryPoint[] {
  const byDay = new Map<string, number>();
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  for (const record of ordered) {
    const day = record.date.slice(0, 10);
    if (!day) continue;
    byDay.set(day, record.value);
  }
  return [...byDay.entries()].map(([date, value]) => ({ date, value }));
}

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

export function defaultMeasurementHistoryRange(): { from: string; to: string } {
  const to = todayIsoDate();
  return { from: shiftIsoDate(to, -(MEASUREMENT_HISTORY_WEEKS * 7)), to };
}

export function measurementHistoryWeekCount(from: string, to: string): number {
  const start = new Date(`${from.slice(0, 10)}T12:00:00`);
  const end = new Date(`${to.slice(0, 10)}T12:00:00`);
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  return Math.max(1, Math.round(days / 7));
}

export function measurementHistoryWeeksLabel(from: string, to: string): string {
  const weeks = measurementHistoryWeekCount(from, to);
  return weeks === 1 ? '1 semana' : `${weeks} semanas`;
}

export function filterMeasurementHistoryByRange(
  series: MeasurementHistorySeries[],
  from: string,
  to: string,
): MeasurementHistorySeries[] {
  const start = from.slice(0, 10);
  const end = to.slice(0, 10);
  return series
    .map((item) => ({
      ...item,
      records: item.records.filter((record) => record.date >= start && record.date <= end),
    }))
    .filter((item) => item.records.length > 0);
}
