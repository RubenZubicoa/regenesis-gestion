export interface MeasurementMaster {
  _id: string;
  key: string;
  label: string;
  unit: string;
  icon: string;
}

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
