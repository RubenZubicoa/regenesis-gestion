/** Alineado con ReviewStatus / Review del API. */
export type ReviewStatus = 'upcoming' | 'done' | 'canceled';

export interface Review {
  _id: string;
  clientId: string;
  title: string;
  date: string;
  status: ReviewStatus;
  note: string;
}
