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
