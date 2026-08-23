import type { Client } from './client';
import type { DailySteps } from './daily-steps';
import type { Macros } from './macros';
import type { Meal } from './meal';
import type { Measurement } from './measurement';
import type { ProgressImage } from './progress-image';
import type { Review } from './review';
import type { RoutineDay } from './routine-day';
import type { Supplements } from './supplements';
import type { Weight } from './weight';
import type { Wellness } from './wellness';
import type { WorkoutHistory } from './workout-history';

/** Vista completa de un cliente para la pantalla de detalle. */
export interface ClientDetail {
  client: Client;
  programName: string;
  reviews: Review[];
  upcomingReview: Review | null;
  weight: Weight | null;
  macros: Macros | null;
  meal: Meal | null;
  supplements: Supplements | null;
  routineDays: RoutineDay[];
  workoutHistory: WorkoutHistory[];
  measurements: Measurement[];
  wellness: Wellness[];
  dailySteps: DailySteps | null;
  progressImages: ProgressImage[];
}
