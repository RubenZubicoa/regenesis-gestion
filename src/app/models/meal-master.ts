import { Meal, MealSlot } from './meal';

export type MealMaster = Omit<Meal, 'clientId'> & {
  nombre: string;
  descripcion: string;
};

export const MEAL_SLOT_PRESETS: Omit<MealSlot, 'options'>[] = [
  { label: 'Desayuno', time: '08:00', icon: 'cafe-outline' },
  { label: 'Media mañana', time: '11:00', icon: 'nutrition-outline' },
  { label: 'Comida', time: '14:00', icon: 'restaurant-outline' },
  { label: 'Merienda', time: '17:00', icon: 'ice-cream-outline' },
  { label: 'Cena', time: '21:00', icon: 'moon-outline' },
];

export function mealPlanTitle(plan: Pick<MealMaster, 'nombre' | 'slots'>): string {
  const nombre = plan.nombre.trim();
  if (nombre) return nombre;
  const labels = plan.slots.map((slot) => slot.label.trim()).filter(Boolean);
  if (!labels.length) return 'Plan sin nombre';
  if (labels.length <= 3) return labels.join(' · ');
  return `${labels.slice(0, 2).join(' · ')} +${labels.length - 2}`;
}

export function mealPlanOptionsCount(plan: Pick<MealMaster, 'slots'>): number {
  return plan.slots.reduce((sum, slot) => sum + slot.options.length, 0);
}

export function mealPlanKcal(plan: Pick<MealMaster, 'slots'>): number {
  return plan.slots.reduce((sum, slot) => {
    if (!slot.options.length) return sum;
    const avg =
      slot.options.reduce((total, option) => total + (option.kcal || 0), 0) /
      slot.options.length;
    return sum + Math.round(avg);
  }, 0);
}
