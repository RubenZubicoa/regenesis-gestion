export interface RepRange {
  min: number;
  max: number;
}

export type RoutineExerciseType = 'strength' | 'cardio';

export interface RoutineExercise {
  exerciseId: string;
  name: string;
  type?: RoutineExerciseType;
  image?: string;
  sets: string;
  rest: string;
  seriesCount?: number;
  repRange?: RepRange;
  repUnit?: 'reps' | 's';
  targetKm?: number;
}

export interface RoutineDay {
  _id: string;
  clientId: string;
  day: string;
  focus: string;
  done: boolean;
  duration: string;
  exercises: RoutineExercise[];
}
