import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import type { MealOption, MealSlot } from '../../models/meal';
import type { MealMaster } from '../../models/meal-master';
import {
  MEAL_SLOT_PRESETS,
  mealPlanKcal,
  mealPlanOptionsCount,
  mealPlanTitle,
} from '../../models/meal-master';
import { MealMastersService } from '../../services/meal-masters.service';

interface EditableOption {
  name: string;
  kcal: number;
  description: string;
}

interface EditableSlot {
  label: string;
  time: string;
  icon: string;
  options: EditableOption[];
}

interface EditablePlan {
  _id: string | null;
  nombre: string;
  descripcion: string;
  slots: EditableSlot[];
}

@Component({
  selector: 'app-meal-masters-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './meal-masters-page.component.html',
  styleUrl: './meal-masters-page.component.scss',
})
export class MealMastersPageComponent {
  private readonly api = inject(MealMastersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveOk = signal(false);

  readonly plans = signal<MealMaster[]>([]);
  readonly query = signal('');
  readonly kitchenOpen = signal(false);
  readonly draft = signal<EditablePlan | null>(null);
  readonly activeIndex = signal(0);

  readonly stats = computed(() => {
    const list = this.plans();
    return {
      plans: list.length,
      slots: list.reduce((sum, plan) => sum + plan.slots.length, 0),
      options: list.reduce((sum, plan) => sum + mealPlanOptionsCount(plan), 0),
    };
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.plans().filter((plan) => {
      if (!q) return true;
      const haystack = [
        plan.nombre,
        plan.descripcion,
        mealPlanTitle(plan),
        ...plan.slots.flatMap((slot) => [
          slot.label,
          ...slot.options.map((opt) => opt.name),
        ]),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly activeSlot = computed(() => {
    const plan = this.draft();
    if (!plan) return null;
    return plan.slots[this.activeIndex()] ?? plan.slots[0] ?? null;
  });

  constructor() {
    this.reload();
  }

  title(plan: MealMaster | EditablePlan): string {
    return mealPlanTitle(plan);
  }

  kcal(plan: MealMaster): number {
    return mealPlanKcal(plan);
  }

  optionsCount(plan: MealMaster): number {
    return mealPlanOptionsCount(plan);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.plans.set(list);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.saveError.set(null);
    this.saveOk.set(false);
    this.draft.set({
      _id: null,
      nombre: '',
      descripcion: '',
      slots: MEAL_SLOT_PRESETS.map((preset) => ({
        ...preset,
        options: [{ name: '', kcal: 0, description: '' }],
      })),
    });
    this.activeIndex.set(0);
    this.kitchenOpen.set(true);
  }

  openEdit(plan: MealMaster): void {
    this.saveError.set(null);
    this.saveOk.set(false);
    this.draft.set({
      _id: plan._id,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      slots: plan.slots.length
        ? plan.slots.map((slot) => this.toEditable(slot))
        : MEAL_SLOT_PRESETS.map((preset) => ({
            ...preset,
            options: [{ name: '', kcal: 0, description: '' }],
          })),
    });
    this.activeIndex.set(0);
    this.kitchenOpen.set(true);
  }

  leaveKitchen(): void {
    if (this.saving() || this.deleting()) return;
    this.kitchenOpen.set(false);
    this.draft.set(null);
    this.saveError.set(null);
    this.saveOk.set(false);
  }

  updatePlan(field: 'nombre' | 'descripcion', value: string): void {
    const current = this.draft();
    if (!current) return;
    this.draft.set({ ...current, [field]: value });
    this.saveOk.set(false);
  }

  selectSlot(index: number): void {
    this.activeIndex.set(index);
  }

  addSlot(): void {
    const current = this.draft();
    if (!current) return;
    const nextPreset = MEAL_SLOT_PRESETS[current.slots.length] ?? {
      label: `Toma ${current.slots.length + 1}`,
      time: '12:00',
      icon: 'restaurant-outline',
    };
    this.draft.set({
      ...current,
      slots: [
        ...current.slots,
        { ...nextPreset, options: [{ name: '', kcal: 0, description: '' }] },
      ],
    });
    this.activeIndex.set(current.slots.length);
    this.saveOk.set(false);
  }

  removeSlot(index: number): void {
    const current = this.draft();
    if (!current || current.slots.length <= 1) {
      this.saveError.set('Debe quedar al menos una toma.');
      return;
    }
    const slots = current.slots.filter((_, i) => i !== index);
    this.draft.set({ ...current, slots });
    this.activeIndex.set(Math.min(index, slots.length - 1));
    this.saveOk.set(false);
  }

  updateSlot(field: 'label', value: string): void {
    this.patchActiveSlot((slot) => ({ ...slot, [field]: value }));
  }

  addOption(): void {
    this.patchActiveSlot((slot) => ({
      ...slot,
      options: [...slot.options, { name: '', kcal: 0, description: '' }],
    }));
  }

  removeOption(optionIndex: number): void {
    const slot = this.activeSlot();
    if (!slot || slot.options.length <= 1) {
      this.saveError.set('Cada toma necesita al menos una opción.');
      return;
    }
    this.patchActiveSlot((current) => ({
      ...current,
      options: current.options.filter((_, i) => i !== optionIndex),
    }));
  }

  updateOption(optionIndex: number, field: keyof EditableOption, value: string | number): void {
    this.patchActiveSlot((slot) => ({
      ...slot,
      options: slot.options.map((opt, i) => {
        if (i !== optionIndex) return opt;
        if (field === 'kcal') {
          const parsed = Number(value);
          return {
            ...opt,
            kcal: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0,
          };
        }
        return { ...opt, [field]: String(value) };
      }),
    }));
  }

  save(): void {
    const current = this.draft();
    if (!current || this.saving()) return;
    const nombre = current.nombre.trim();
    if (!nombre) {
      this.saveError.set('El nombre del plan es obligatorio.');
      return;
    }
    const slots = this.buildPayload(current.slots);
    if (!slots) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveOk.set(false);

    const payload = {
      nombre,
      descripcion: current.descripcion.trim(),
      slots,
    };

    const request$ = current._id
      ? this.api.update(current._id, payload)
      : this.api.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.plans.update((list) => {
          const idx = list.findIndex((item) => item._id === saved._id);
          const next =
            idx === -1 ? [...list, saved] : list.map((item, i) => (i === idx ? saved : item));
          return next.sort((a, b) => mealPlanTitle(a).localeCompare(mealPlanTitle(b), 'es'));
        });
        this.draft.set({
          _id: saved._id,
          nombre: saved.nombre,
          descripcion: saved.descripcion,
          slots: saved.slots.map((slot) => this.toEditable(slot)),
        });
        this.saving.set(false);
        this.saveOk.set(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  remove(): void {
    const current = this.draft();
    if (!current?._id || this.saving() || this.deleting()) return;
    this.deleting.set(true);
    this.saveError.set(null);
    this.api.remove(current._id).subscribe({
      next: () => {
        this.plans.update((list) => list.filter((item) => item._id !== current._id));
        this.deleting.set(false);
        this.leaveKitchen();
      },
      error: (err: Error) => {
        this.deleting.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  private patchActiveSlot(patch: (slot: EditableSlot) => EditableSlot): void {
    const current = this.draft();
    if (!current) return;
    const idx = this.activeIndex();
    this.draft.set({
      ...current,
      slots: current.slots.map((slot, i) => (i === idx ? patch(slot) : slot)),
    });
    this.saveOk.set(false);
  }

  private buildPayload(slots: EditableSlot[]): MealSlot[] | null {
    if (slots.length === 0) {
      this.saveError.set('Añade al menos una toma.');
      return null;
    }

    for (const [i, slot] of slots.entries()) {
      if (!slot.label.trim()) {
        this.saveError.set(`La toma ${i + 1} necesita un nombre.`);
        this.activeIndex.set(i);
        return null;
      }
      const named = slot.options.filter((opt) => opt.name.trim().length > 0);
      if (named.length === 0) {
        this.saveError.set(`Añade al menos una opción en “${slot.label}”.`);
        this.activeIndex.set(i);
        return null;
      }
    }

    return slots.map((slot, index) => ({
      label: slot.label.trim(),
      time: slot.time.trim() || MEAL_SLOT_PRESETS[index]?.time || '12:00',
      icon: slot.icon || 'restaurant-outline',
      options: slot.options
        .map((opt): MealOption => {
          const description = opt.description.trim();
          return {
            name: opt.name.trim(),
            kcal: opt.kcal,
            ...(description ? { description } : {}),
          };
        })
        .filter((opt) => opt.name.length > 0),
    }));
  }

  private toEditable(slot: MealSlot): EditableSlot {
    return {
      label: slot.label,
      time: slot.time || '12:00',
      icon: slot.icon || 'restaurant-outline',
      options: slot.options.map((opt) => ({
        name: opt.name,
        kcal: opt.kcal,
        description: opt.description ?? '',
      })),
    };
  }
}
