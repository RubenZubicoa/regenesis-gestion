export interface MealOption {
  name: string;
  kcal: number;
  description?: string;
  ingredients?: string[];
}

export type MealOptionDraft = {
  name: string;
  kcal: number;
  description: string;
  ingredients: string[];
};

export function emptyMealOptionDraft(): MealOptionDraft {
  return { name: '', kcal: 0, description: '', ingredients: [''] };
}

export function toMealOptionDraft(option: MealOption): MealOptionDraft {
  const ingredients = readMealIngredients(option.ingredients);
  return {
    name: option.name,
    kcal: option.kcal,
    description: option.description ?? '',
    ingredients: ingredients.length ? ingredients : [''],
  };
}

export function toMealOption(draft: MealOptionDraft): MealOption | null {
  const name = draft.name.trim();
  if (!name) return null;
  const description = draft.description.trim();
  return {
    name,
    kcal: draft.kcal,
    ...(description ? { description } : {}),
    ingredients: readMealIngredients(draft.ingredients),
  };
}

export function readMealIngredients(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        return readMealIngredients(JSON.parse(trimmed));
      } catch {
        /* texto plano */
      }
    }
    return trimmed
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return String(item).trim();
      }
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        return String(
          rec['name'] ?? rec['label'] ?? rec['ingredient'] ?? rec['text'] ?? '',
        ).trim();
      }
      return '';
    })
    .filter(Boolean);
}

export function serializeMealOption(option: MealOption): Record<string, unknown> {
  const description = option.description?.trim();
  return {
    name: option.name.trim(),
    kcal: option.kcal,
    ...(description ? { description } : {}),
    ingredients: readMealIngredients(option.ingredients),
  };
}

export interface MealSlot {
  label: string;
  time: string;
  icon: string;
  options: MealOption[];
}

export interface Meal {
  _id: string;
  clientId: string;
  slots: MealSlot[];
}
