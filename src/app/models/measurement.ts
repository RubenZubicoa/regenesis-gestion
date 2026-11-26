import type { MeasurementMaster } from './MeasurementMaster';

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
