export interface TechnicalSpecifications {
  _id: string;
  clientId: string;
  personalHistory: PersonalHistory;
  eatingHabits: EatingHabits;
  lifestyle: Lifestyle;
  exerciseHabits: ExerciseHabits;
  dailyRecall: DailyRecall;
  expectations: string;
  observations: string;
  createdAt: string;
  updatedAt: string;
}

export type PersonalHistory = {
  diseases: string;
  injuries: string;
  medications: string;
  supplements: string;
  allergies: string;
  bowelHabit: string;
  contraceptives: string;
};

export type EatingHabits = {
  numberOfMeals: string;
  snacks: string;
  drinks: string;
  bread: string;
  favoriteFoods: string;
  rejectedFoods: string;
};

export type Lifestyle = {
  smoking: string;
  alcohol: string;
  sleep: string;
  waterIntake: string;
};

export type ExerciseHabits = {
  sport: string;
  exerciseFrequency: string;
  strengthLevel: string;
  strengthTrainingFrequency: string;
  material: string;
};

export type DailyRecallEntry = {
  ingredients: string;
  quantities: string;
  timeAndPlace: string;
};

export type DailyRecall = {
  breakfast: DailyRecallEntry;
  morningSnack: DailyRecallEntry;
  lunch: DailyRecallEntry;
  afternoonSnack: DailyRecallEntry;
  dinner: DailyRecallEntry;
};

export type CreateTechnicalSpecificationsInput = Omit<
  TechnicalSpecifications,
  '_id' | 'createdAt' | 'updatedAt'
>;

export type UpdateTechnicalSpecificationsInput = Partial<
  Omit<TechnicalSpecifications, '_id' | 'createdAt'>
>;

export const DAILY_RECALL_MEALS: readonly { key: keyof DailyRecall; label: string }[] = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'morningSnack', label: 'Almuerzo' },
  { key: 'lunch', label: 'Comida' },
  { key: 'afternoonSnack', label: 'Merienda' },
  { key: 'dinner', label: 'Cena' },
];

export type SpecFieldOption = {
  value: string;
  label: string;
};

export type SpecField<K extends string = string> = {
  key: K;
  label: string;
  hint?: string;
  placeholder?: string;
  textarea?: boolean;
  full?: boolean;
  options?: readonly SpecFieldOption[];
};

export const DAILY_RECALL_ENTRY_FIELDS: readonly SpecField<keyof DailyRecallEntry>[] = [
  { key: 'ingredients', label: 'Ingredientes', textarea: true, full: true },
  { key: 'quantities', label: 'Cantidades' },
  { key: 'timeAndPlace', label: 'Hora y lugar' },
];

export const YES_NO_OPTIONS: readonly SpecFieldOption[] = [
  { value: 'Sí', label: 'Sí' },
  { value: 'No', label: 'No' },
];

export const STRENGTH_LEVEL_OPTIONS: readonly SpecFieldOption[] = [
  {
    value: 'No lo he practicado nunca y no entiendo de ejercicios ni de técnicas de ejecución.',
    label: 'Nunca lo he practicado y no entiendo de ejercicios ni de técnicas.',
  },
  {
    value: 'Alguna cosa he hecho pero mi nivel es bajo.',
    label: 'Alguna cosa he hecho, pero mi nivel es bajo.',
  },
  {
    value:
      'Conozco bastantes ejercicios y los he hecho con cierta frecuencia durante alguna etapa de mi vida (nivel intermedio).',
    label: 'Nivel intermedio: conozco bastantes ejercicios y los he practicado con cierta frecuencia.',
  },
  {
    value:
      'Nivel avanzado: el entrenamiento forma parte de mi vida y conozco muchos ejercicios y los ejecuto de manera correcta.',
    label: 'Nivel avanzado: el entrenamiento forma parte de mi vida.',
  },
];

export const PERSONAL_HISTORY_FIELDS: readonly SpecField<keyof PersonalHistory>[] = [
  {
    key: 'diseases',
    label: 'Enfermedades actuales o diagnosticadas',
    textarea: true,
    full: true,
  },
  {
    key: 'injuries',
    label: 'Lesiones, ingresos u operaciones',
    hint: 'Anota lo que pueda limitar la actividad física.',
    textarea: true,
    full: true,
  },
  {
    key: 'medications',
    label: 'Medicamentos actuales',
    hint: 'Nombre, frecuencia y dosis.',
    textarea: true,
    full: true,
  },
  {
    key: 'supplements',
    label: 'Suplementación',
    hint: 'Si toma o ha tomado, indica cuál y las cantidades.',
    textarea: true,
    full: true,
  },
  {
    key: 'allergies',
    label: 'Alergias o intolerancias alimentarias',
    full: true,
  },
  {
    key: 'bowelHabit',
    label: 'Hábito intestinal',
  },
  {
    key: 'contraceptives',
    label: 'Anticonceptivos',
    options: YES_NO_OPTIONS,
  },
];

export const EATING_HABITS_FIELDS: readonly SpecField<keyof EatingHabits>[] = [
  {
    key: 'numberOfMeals',
    label: 'Ingestas al día',
    placeholder: 'Las que realiza o las que quiere realizar.',
  },
  {
    key: 'snacks',
    label: 'Picoteos',
  },
  {
    key: 'drinks',
    label: '¿Bebes durante las comidas?',
    hint: 'Sí / no, cuánto y qué.',
    full: true,
  },
  {
    key: 'bread',
    label: '¿Acompañas las comidas con pan?',
  },
  {
    key: 'favoriteFoods',
    label: 'Alimentos preferentes',
    hint: 'Los que más le gustan y suele consumir.',
    textarea: true,
    full: true,
  },
  {
    key: 'rejectedFoods',
    label: 'Alimentos rechazados',
    hint: 'Los que no quiere que aparezcan en la dieta.',
    textarea: true,
    full: true,
  },
];

export const LIFESTYLE_FIELDS: readonly SpecField<keyof Lifestyle>[] = [
  {
    key: 'sleep',
    label: 'Ciclo de sueño',
    placeholder: 'Horas / día',
  },
  {
    key: 'smoking',
    label: 'Fumador/a',
    placeholder: 'Sí / no — cuánto',
  },
  {
    key: 'alcohol',
    label: 'Consumo de alcohol',
    placeholder: 'Sí / no — cuánto',
  },
  {
    key: 'waterIntake',
    label: 'Consumo de agua',
    placeholder: '¿Menos o más de 1,5–2 L al día?',
  },
];

export const EXERCISE_HABITS_FIELDS: readonly SpecField<keyof ExerciseHabits>[] = [
  {
    key: 'sport',
    label: 'Deporte que más ha practicado',
    hint: 'Indica también si lo practica ahora.',
    textarea: true,
    full: true,
  },
  {
    key: 'exerciseFrequency',
    label: 'Horas a la semana que le dedica',
  },
  {
    key: 'strengthLevel',
    label: 'Nivel de entrenamiento de fuerza',
    options: STRENGTH_LEVEL_OPTIONS,
    full: true,
  },
  {
    key: 'strengthTrainingFrequency',
    label: 'Días a la semana para trabajo de fuerza',
  },
  {
    key: 'material',
    label: 'Material del que dispone para entrenar',
    textarea: true,
    full: true,
  },
];

export function emptyPersonalHistory(): PersonalHistory {
  return {
    diseases: '',
    injuries: '',
    medications: '',
    supplements: '',
    allergies: '',
    bowelHabit: '',
    contraceptives: '',
  };
}

export function emptyEatingHabits(): EatingHabits {
  return {
    numberOfMeals: '',
    snacks: '',
    drinks: '',
    bread: '',
    favoriteFoods: '',
    rejectedFoods: '',
  };
}

export function emptyLifestyle(): Lifestyle {
  return {
    smoking: '',
    alcohol: '',
    sleep: '',
    waterIntake: '',
  };
}

export function emptyExerciseHabits(): ExerciseHabits {
  return {
    sport: '',
    exerciseFrequency: '',
    strengthLevel: '',
    strengthTrainingFrequency: '',
    material: '',
  };
}

export function emptyDailyRecallEntry(): DailyRecallEntry {
  return {
    ingredients: '',
    quantities: '',
    timeAndPlace: '',
  };
}

export function emptyDailyRecall(): DailyRecall {
  return {
    breakfast: emptyDailyRecallEntry(),
    morningSnack: emptyDailyRecallEntry(),
    lunch: emptyDailyRecallEntry(),
    afternoonSnack: emptyDailyRecallEntry(),
    dinner: emptyDailyRecallEntry(),
  };
}

function hasFilledValues(group: Record<string, string>): boolean {
  return Object.values(group).some((value) => value.trim().length > 0);
}

export function hasFilledDailyRecall(recall: DailyRecall): boolean {
  return Object.values(recall).some((entry) => hasFilledValues(entry));
}

export function hasTechnicalSpecContent(input: {
  personalHistory: PersonalHistory;
  eatingHabits: EatingHabits;
  lifestyle: Lifestyle;
  exerciseHabits: ExerciseHabits;
  dailyRecall: DailyRecall;
  expectations: string;
  observations: string;
}): boolean {
  return (
    hasFilledValues(input.personalHistory) ||
    hasFilledValues(input.eatingHabits) ||
    hasFilledValues(input.lifestyle) ||
    hasFilledValues(input.exerciseHabits) ||
    hasFilledDailyRecall(input.dailyRecall) ||
    input.expectations.trim().length > 0 ||
    input.observations.trim().length > 0
  );
}

export function filledDailyRecall(recall: DailyRecall): {
  key: keyof DailyRecall;
  label: string;
  ingredients: string;
  quantities: string;
  timeAndPlace: string;
}[] {
  return DAILY_RECALL_MEALS.map((meal) => {
    const entry = recall[meal.key];
    return {
      key: meal.key,
      label: meal.label,
      ingredients: entry.ingredients.trim(),
      quantities: entry.quantities.trim(),
      timeAndPlace: entry.timeAndPlace.trim(),
    };
  }).filter((row) => row.ingredients || row.quantities || row.timeAndPlace);
}

export function filledSpecFields<K extends string>(
  group: Record<K, string>,
  fields: readonly SpecField<K>[],
): { key: K; label: string; value: string }[] {
  return fields
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: (group[field.key] ?? '').trim(),
    }))
    .filter((row) => row.value.length > 0);
}
