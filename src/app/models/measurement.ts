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
