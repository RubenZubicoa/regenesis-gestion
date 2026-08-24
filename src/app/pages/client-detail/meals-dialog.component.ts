import { Component, HostListener, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Meal, MealOption, MealSlot } from '../../models/meal';
import { MealsService } from '../../services/meals.service';

export interface EditableOption {
  name: string;
  kcal: number;
  description: string;
}

export interface EditableSlot {
  label: string;
  time: string;
  icon: string;
  options: EditableOption[];
}

const SLOT_PRESETS: EditableSlot[] = [
  { label: 'Desayuno', time: '08:00', icon: 'cafe-outline', options: [] },
  { label: 'Media mañana', time: '11:00', icon: 'nutrition-outline', options: [] },
  { label: 'Comida', time: '14:00', icon: 'restaurant-outline', options: [] },
  { label: 'Merienda', time: '17:00', icon: 'ice-cream-outline', options: [] },
  { label: 'Cena', time: '21:00', icon: 'moon-outline', options: [] },
];

@Component({
  selector: 'app-meals-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './meals-dialog.component.html',
  styleUrl: './meals-dialog.component.scss',
})
export class MealsDialogComponent implements OnInit {
  private readonly mealsService = inject(MealsService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly meal = input<Meal | null>(null);

  readonly saved = output<Meal>();
  readonly closed = output<void>();

  readonly slots = signal<EditableSlot[]>([]);
  readonly activeIndex = signal(0);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly activeSlot = computed(() => {
    const list = this.slots();
    const idx = this.activeIndex();
    return list[idx] ?? null;
  });

  readonly totalOptions = computed(() =>
    this.slots().reduce((sum, slot) => sum + slot.options.length, 0),
  );

  ngOnInit(): void {
    const current = this.meal();
    if (current?.slots?.length) {
      this.slots.set(current.slots.map((slot) => this.toEditable(slot)));
    } else {
      this.slots.set(
        SLOT_PRESETS.map((preset) => ({
          ...preset,
          options: [{ name: '', kcal: 0, description: '' }],
        })),
      );
    }
    this.activeIndex.set(0);
  }

  get isEdit(): boolean {
    return this.meal() != null;
  }

  selectSlot(index: number): void {
    this.activeIndex.set(index);
  }

  addSlot(): void {
    const nextPreset = SLOT_PRESETS[this.slots().length] ?? {
      label: `Toma ${this.slots().length + 1}`,
      time: '12:00',
      icon: 'restaurant-outline',
      options: [],
    };
    this.slots.update((list) => [
      ...list,
      {
        ...nextPreset,
        options: [{ name: '', kcal: 0, description: '' }],
      },
    ]);
    this.activeIndex.set(this.slots().length - 1);
  }

  removeSlot(index: number): void {
    if (this.slots().length <= 1) {
      this.saveError.set('Debe quedar al menos una toma.');
      return;
    }
    this.slots.update((list) => list.filter((_, i) => i !== index));
    const next = Math.min(this.activeIndex(), this.slots().length - 1);
    this.activeIndex.set(Math.max(0, next));
  }

  updateSlot(field: 'label', value: string): void {
    const idx = this.activeIndex();
    this.slots.update((list) =>
      list.map((slot, i) => (i === idx ? { ...slot, [field]: value } : slot)),
    );
  }

  addOption(): void {
    const idx = this.activeIndex();
    this.slots.update((list) =>
      list.map((slot, i) =>
        i === idx
          ? { ...slot, options: [...slot.options, { name: '', kcal: 0, description: '' }] }
          : slot,
      ),
    );
  }

  removeOption(optionIndex: number): void {
    const idx = this.activeIndex();
    const slot = this.slots()[idx];
    if (!slot || slot.options.length <= 1) {
      this.saveError.set('Cada toma necesita al menos una opción.');
      return;
    }
    this.slots.update((list) =>
      list.map((s, i) =>
        i === idx
          ? { ...s, options: s.options.filter((_, oi) => oi !== optionIndex) }
          : s,
      ),
    );
  }

  updateOption(
    optionIndex: number,
    field: keyof EditableOption,
    value: string | number,
  ): void {
    const idx = this.activeIndex();
    this.slots.update((list) =>
      list.map((slot, i) => {
        if (i !== idx) return slot;
        return {
          ...slot,
          options: slot.options.map((opt, oi) => {
            if (oi !== optionIndex) return opt;
            if (field === 'kcal') {
              const parsed = Number(value);
              return {
                ...opt,
                kcal: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0,
              };
            }
            return { ...opt, [field]: String(value) };
          }),
        };
      }),
    );
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  save(): void {
    const payload = this.buildPayload();
    if (!payload) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.mealsService.save(this.clientId(), this.meal(), payload).subscribe({
      next: (meal) => {
        this.saving.set(false);
        this.saved.emit(meal);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  private buildPayload(): MealSlot[] | null {
    const slots = this.slots();
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
      const options = slot.options
        .map((opt) => ({
          name: opt.name.trim(),
          kcal: opt.kcal,
          description: opt.description.trim(),
        }))
        .filter((opt) => opt.name.length > 0);

      if (options.length === 0) {
        this.saveError.set(`Añade al menos una opción en “${slot.label}”.`);
        this.activeIndex.set(i);
        return null;
      }
    }

    return slots.map((slot, index) => ({
      label: slot.label.trim(),
      time: slot.time.trim() || SLOT_PRESETS[index]?.time || '12:00',
      icon: slot.icon || 'restaurant-outline',
      options: slot.options
        .map((opt): MealOption => {
          const base: MealOption = {
            name: opt.name.trim(),
            kcal: opt.kcal,
          };
          const description = opt.description.trim();
          return description ? { ...base, description } : base;
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
