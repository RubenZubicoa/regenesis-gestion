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
