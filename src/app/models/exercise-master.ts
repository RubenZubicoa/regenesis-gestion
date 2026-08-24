export type ExerciseType = 'strength' | 'cardio';

export interface ExerciseMaster {
  _id: string;
  name: string;
  type: ExerciseType;
  imageUrl?: string;
  explanation?: string;
}
