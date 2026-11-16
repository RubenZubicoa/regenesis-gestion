export interface Wellness {
  _id: string;
  clientId: string;
  wellnessId: string;
  label: string;
  icon: string;
  tone: string;
  value: number;
  date: string;
}

export interface WellnessCreatePayload {
  clientId: string;
  wellnessId: string;
  value: number;
  date: string;
}

export function isSameWellnessDay(current: Wellness, date: string): boolean {
  return Boolean(current._id) && current.date.slice(0, 10) === date.slice(0, 10);
}
