export interface MealOption {
  name: string;
  kcal: number;
  description?: string;
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
