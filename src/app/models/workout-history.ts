export type ExerciseType = 'strength' | 'cardio';

export interface StrengthSetLog {
  set: number;
  weightKg: number;
  reps: number;
}

export interface CardioLog {
  km: number;
  speedKmh: number;
  avgHr: number;
}

export interface ExerciseLog {
  name: string;
  type: ExerciseType;
  strengthSets?: StrengthSetLog[];
  cardio?: CardioLog;
}

export interface WorkoutHistory {
  _id: string;
  clientId: string;
  week: number;
  date: string;
  day: string;
  focus: string;
  duration: string;
  durationMinutes: number;
  exercises: ExerciseLog[];
}
