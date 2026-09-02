export type ExerciseType = 'strength' | 'cardio';

export interface ExerciseCategory {
  _id: string;
  key: string;
  label: string;
}

export interface ExerciseMaster {
  _id: string;
  name: string;
  type: ExerciseType;
  category?: string;
  imageUrl?: string;
  explanation?: string;
}

export function slugifyCategoryKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function exerciseCategoryLabel(
  category: string | undefined,
  categories: ExerciseCategory[],
): string {
  if (!category) return 'Sin categoría';
  const found = categories.find(
    (item) => item._id === category || item.key === category || item.label === category,
  );
  return found?.label ?? category;
}

export function categoryMatches(category: string | undefined, item: ExerciseCategory): boolean {
  if (!category) return false;
  return category === item._id || category === item.key || category === item.label;
}
