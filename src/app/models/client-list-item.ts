import type { Client } from './client';
import type { Review } from './review';

/** Vista de listado: Client del API + datos relacionados resueltos. */
export type ClientListItem = Client & {
  programName: string;
  upcomingReview: Review | null;
  /** current - start de Weight (null si no hay serie). */
  weightDelta: number | null;
  weightUnit: string;
  /** Derivado de fechas del cliente (no existe en el API). */
  timeline: 'active' | 'finished' | 'upcoming';
  /** Acento visual de UI (no forma parte del modelo del API). */
  accent: 'gold' | 'teal' | 'coral' | 'blue';
};

export type ClientFilterKey = 'all' | 1 | 2 | 3;
