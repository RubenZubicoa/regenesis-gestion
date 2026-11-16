/** Alineado con Weight del API. */
export interface Weight {
  _id: string;
  clientId: string;
  labels: string[];
  data: number[];
  start: number;
  current: number;
  target: number;
  unit: string;
}

export type WeightWritePayload = Omit<Weight, '_id'>;

export function todayIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function upsertWeightPoint(
  current: Weight | null,
  clientId: string,
  date: string,
  value: number,
): WeightWritePayload {
  const day = date.slice(0, 10);
  const unit = current?.unit || 'kg';
  const points = (current?.labels ?? []).map((label, index) => ({
    label: String(label).slice(0, 10),
    value: Number(current?.data[index] ?? 0),
  }));

  const existing = points.findIndex((point) => point.label === day);
  if (existing >= 0) {
    points[existing] = { label: day, value };
  } else {
    points.push({ label: day, value });
  }

  points.sort((a, b) => a.label.localeCompare(b.label));

  const data = points.map((point) => point.value);
  return {
    clientId,
    labels: points.map((point) => point.label),
    data,
    start: data[0] ?? value,
    current: data[data.length - 1] ?? value,
    target: current?.target || value,
    unit,
  };
}
