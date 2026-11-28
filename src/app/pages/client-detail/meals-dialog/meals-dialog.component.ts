import { Component, HostListener, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, of, switchMap } from 'rxjs';

import { filesAttachmentName, type FilesAttachment } from '../../../models/files-attachment';
import type { Meal, MealOption, MealOptionDraft, MealSlot } from '../../../models/meal';
import {
  emptyMealOptionDraft,
  toMealOption,
  toMealOptionDraft,
} from '../../../models/meal';
import { FilesAttachmentsService } from '../../../services/files-attachments.service';
import { MealsService } from '../../../services/meals.service';

export interface EditableSlot {
  label: string;
  time: string;
  icon: string;
  options: MealOptionDraft[];
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
  private readonly filesApi = inject(FilesAttachmentsService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly meal = input<Meal | null>(null);
  readonly seed = input<MealSlot[] | null>(null);
  readonly filesAttachment = input<FilesAttachment | null>(null);

  readonly saved = output<Meal>();
  readonly filesSaved = output<FilesAttachment>();
  readonly deleted = output<void>();
  readonly closed = output<void>();

  readonly slots = signal<EditableSlot[]>([]);
  readonly activeIndex = signal(0);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly attachmentFile = signal<File | null>(null);
  readonly existingAttachment = signal('');
  readonly removingAttachment = signal(false);

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
    const seed = this.seed();
    if (current?.slots?.length) {
      this.slots.set(current.slots.map((slot) => this.toEditable(slot)));
    } else if (seed?.length) {
      this.slots.set(seed.map((slot) => this.toEditable(slot, true)));
    } else {
      this.slots.set(
        SLOT_PRESETS.map((preset) => ({
          ...preset,
          options: [emptyMealOptionDraft()],
        })),
      );
    }
    this.activeIndex.set(0);
    this.attachmentFile.set(null);
    this.existingAttachment.set(this.filesAttachment()?.meal ?? '');
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
        options: [emptyMealOptionDraft()],
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
          ? { ...slot, options: [...slot.options, emptyMealOptionDraft()] }
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
    field: 'name' | 'kcal' | 'observations',
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

  filledIngredients(list: string[]): string {
    const count = list.filter((item) => item.trim()).length;
    return count === 1 ? '1 ítem' : `${count} ítems`;
  }

  addIngredient(optionIndex: number): void {
    const idx = this.activeIndex();
    this.slots.update((list) =>
      list.map((slot, i) =>
        i === idx
          ? {
              ...slot,
              options: slot.options.map((opt, oi) =>
                oi === optionIndex
                  ? { ...opt, ingredients: [...opt.ingredients, ''] }
                  : opt,
              ),
            }
          : slot,
      ),
    );
  }

  updateIngredient(optionIndex: number, ingredientIndex: number, value: string): void {
    const idx = this.activeIndex();
    this.slots.update((list) =>
      list.map((slot, i) =>
        i === idx
          ? {
              ...slot,
              options: slot.options.map((opt, oi) =>
                oi === optionIndex
                  ? {
                      ...opt,
                      ingredients: opt.ingredients.map((item, ii) =>
                        ii === ingredientIndex ? value : item,
                      ),
                    }
                  : opt,
              ),
            }
          : slot,
      ),
    );
  }

  removeIngredient(optionIndex: number, ingredientIndex: number): void {
    const idx = this.activeIndex();
    this.slots.update((list) =>
      list.map((slot, i) =>
        i === idx
          ? {
              ...slot,
              options: slot.options.map((opt, oi) =>
                oi === optionIndex
                  ? {
                      ...opt,
                      ingredients: opt.ingredients.filter((_, ii) => ii !== ingredientIndex),
                    }
                  : opt,
              ),
            }
          : slot,
      ),
    );
  }

  attachmentLabel(): string {
    const selected = this.attachmentFile();
    if (selected) return selected.name;
    return filesAttachmentName(this.existingAttachment()) || 'Sin archivo';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    input.value = '';
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      this.saveError.set('El archivo no puede superar 10 MB.');
      return;
    }
    this.saveError.set(null);
    this.attachmentFile.set(selected);
  }

  clearPendingAttachment(): void {
    this.attachmentFile.set(null);
    this.saveError.set(null);
  }

  removeAttachment(): void {
    const current = this.filesAttachment();
    if (
      !current?._id ||
      !this.existingAttachment() ||
      this.saving() ||
      this.deleting() ||
      this.removingAttachment()
    ) {
      return;
    }

    this.removingAttachment.set(true);
    this.saveError.set(null);
    this.filesApi.clearField(current, 'meal').subscribe({
      next: (files) => {
        this.removingAttachment.set(false);
        this.existingAttachment.set('');
        this.filesSaved.emit(files);
      },
      error: (err: Error) => {
        this.removingAttachment.set(false);
        this.saveError.set(err.message || 'No se pudo eliminar el archivo.');
      },
    });
  }

  close(): void {
    if (this.saving() || this.deleting() || this.removingAttachment()) return;
    this.closed.emit();
  }

  save(): void {
    if (this.deleting() || this.removingAttachment() || this.saving()) return;
    const payload = this.buildPayload();
    if (!payload) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.mealsService
      .save(this.clientId(), this.meal(), payload)
      .pipe(
        switchMap((meal) => {
          const file = this.attachmentFile();
          if (!file) return of({ meal, files: null as FilesAttachment | null });
          return this.filesApi
            .upsertField(this.clientId(), this.filesAttachment(), 'meal', file)
            .pipe(map((files) => ({ meal, files })));
        }),
      )
      .subscribe({
        next: ({ meal, files }) => {
          this.saving.set(false);
          if (files) this.filesSaved.emit(files);
          this.saved.emit(meal);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.saveError.set(err.message);
        },
      });
  }

  remove(): void {
    const current = this.meal();
    if (!current || this.saving() || this.deleting() || this.removingAttachment()) return;

    this.deleting.set(true);
    this.saveError.set(null);
    this.mealsService.remove(current._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit();
      },
      error: (err: Error) => {
        this.deleting.set(false);
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
        .map((opt) => toMealOption(opt))
        .filter((opt): opt is MealOption => opt != null);

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
        .map((opt) => toMealOption(opt))
        .filter((opt): opt is MealOption => opt != null),
    }));
  }

  private toEditable(slot: MealSlot, ensureOption = false): EditableSlot {
    const options = slot.options.map((opt) => toMealOptionDraft(opt));
    return {
      label: slot.label,
      time: slot.time || '12:00',
      icon: slot.icon || 'restaurant-outline',
      options: options.length || !ensureOption ? options : [emptyMealOptionDraft()],
    };
  }
}
