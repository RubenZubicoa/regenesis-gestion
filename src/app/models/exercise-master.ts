export type ExerciseType = 'strength' | 'cardio';

export const EXERCISE_CATEGORIES = [
  { key: 'chest', label: 'Pecho' },
  { key: 'back', label: 'Espalda' },
  { key: 'shoulders', label: 'Hombros' },
  { key: 'arms', label: 'Brazos' },
  { key: 'legs', label: 'Piernas' },
  { key: 'glutes', label: 'Glúteos' },
  { key: 'core', label: 'Core' },
  { key: 'bands', label: 'Gomas' },
  { key: 'bodyweight', label: 'Peso corporal' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'full-body', label: 'Cuerpo completo' },
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number]['key'];

export interface ExerciseMaster {
  _id: string;
  name: string;
  type: ExerciseType;
  category?: ExerciseCategory;
  imageUrl?: string;
  explanation?: string;
}

export function isExerciseCategory(value: string): value is ExerciseCategory {
  return EXERCISE_CATEGORIES.some((item) => item.key === value);
}

export function parseExerciseCategory(value: unknown): ExerciseCategory | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  if (isExerciseCategory(raw)) return raw;
  const lower = raw.toLowerCase();
  return EXERCISE_CATEGORIES.find((item) => item.label.toLowerCase() === lower)?.key;
}

export function exerciseCategoryLabel(category?: string): string {
  if (!category) return 'Sin categoría';
  return EXERCISE_CATEGORIES.find((item) => item.key === category)?.label ?? category;
}
