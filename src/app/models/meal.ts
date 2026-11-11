export interface MealOption {
  name: string;
  kcal: number;
  observations?: string;
  ingredients?: string[];
}

export type MealOptionDraft = {
  name: string;
  kcal: number;
  observations: string;
  ingredients: string[];
};

export function emptyMealOptionDraft(): MealOptionDraft {
  return { name: '', kcal: 0, observations: '', ingredients: [''] };
}

export function toMealOptionDraft(option: MealOption): MealOptionDraft {
  const ingredients = readMealIngredients(option.ingredients);
  return {
    name: option.name,
    kcal: option.kcal,
    observations: option.observations ?? '',
    ingredients: ingredients.length ? ingredients : [''],
  };
}

export function toMealOption(draft: MealOptionDraft): MealOption | null {
  const name = draft.name.trim();
  if (!name) return null;
  const observations = draft.observations.trim();
  return {
    name,
    kcal: draft.kcal,
    ...(observations ? { observations } : {}),
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
  const observations = option.observations?.trim();
  return {
    name: option.name.trim(),
    kcal: option.kcal,
    ...(observations ? { observations } : {}),
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
