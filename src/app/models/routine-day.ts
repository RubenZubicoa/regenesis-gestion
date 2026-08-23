export interface RoutineExercise {
  exerciseId: string;
  name: string;
  image?: string;
  sets: string;
  rest: string;
  seriesCount?: number;
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
