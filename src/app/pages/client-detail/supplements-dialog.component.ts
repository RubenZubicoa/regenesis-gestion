import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { SupplementElement, Supplements } from '../../models/supplements';
import { SupplementsService } from '../../services/supplements.service';

export interface EditableSupplement {
  name: string;
  dose: string;
  when: string;
  icon: string;
  purchaseLink: string;
}

const WHEN_PRESETS = [
  'Con el desayuno',
  'Con la comida',
  'Con la cena',
  'Antes de entrenar',
  'Después de entrenar',
  'Antes de dormir',
];

const ICONS = ['flask-outline', 'fitness-outline', 'leaf-outline', 'water-outline'];

@Component({
  selector: 'app-supplements-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './supplements-dialog.component.html',
  styleUrl: './supplements-dialog.component.scss',
})
export class SupplementsDialogComponent implements OnInit {
  private readonly supplementsService = inject(SupplementsService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly supplements = input<Supplements | null>(null);

  readonly saved = output<Supplements>();
  readonly closed = output<void>();

  readonly elements = signal<EditableSupplement[]>([]);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = this.supplements();
    if (current?.elements?.length) {
      this.elements.set(
        current.elements.map((el) => ({
          name: el.name,
          dose: el.dose,
          when: el.when,
          icon: el.icon || 'flask-outline',
          purchaseLink: el.purchaseLink ?? '',
        })),
      );
    } else {
      this.elements.set([this.blank()]);
    }
  }

  get isEdit(): boolean {
    return this.supplements() != null;
  }

  addElement(): void {
    this.elements.update((list) => [...list, this.blank(list.length)]);
  }

  whenOptionsFor(current: string): string[] {
    const value = current.trim();
    if (value && !WHEN_PRESETS.includes(value)) {
      return [value, ...WHEN_PRESETS];
    }
    return WHEN_PRESETS;
  }

  removeElement(index: number): void {
    if (this.elements().length <= 1) {
      this.elements.set([this.blank()]);
      return;
    }
    this.elements.update((list) => list.filter((_, i) => i !== index));
  }

  updateElement(
    index: number,
    field: keyof EditableSupplement,
    value: string,
  ): void {
    this.elements.update((list) =>
      list.map((el, i) => (i === index ? { ...el, [field]: value } : el)),
    );
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  save(): void {
    const elements = this.buildPayload();
    if (!elements) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.supplementsService
      .save(this.clientId(), this.supplements(), elements)
      .subscribe({
        next: (supplements) => {
          this.saving.set(false);
          this.saved.emit(supplements);
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

  private buildPayload(): SupplementElement[] | null {
    const cleaned = this.elements()
      .map((el) => ({
        name: el.name.trim(),
        dose: el.dose.trim(),
        when: el.when.trim(),
        icon: el.icon || 'flask-outline',
        purchaseLink: el.purchaseLink.trim(),
      }))
      .filter((el) => el.name || el.dose || el.when || el.purchaseLink);

    if (cleaned.length === 0) {
      this.saveError.set('Añade al menos un suplemento.');
      return null;
    }

    for (const [i, el] of cleaned.entries()) {
      if (!el.name) {
        this.saveError.set(`El suplemento ${i + 1} necesita un nombre.`);
        return null;
      }
      if (!el.dose) {
        this.saveError.set(`Indica la dosis de “${el.name}”.`);
        return null;
      }
      if (!el.when) {
        this.saveError.set(`Indica cuándo tomar “${el.name}”.`);
        return null;
      }
    }

    return cleaned.map((el) => {
      const base: SupplementElement = {
        name: el.name,
        dose: el.dose,
        when: el.when,
        icon: el.icon,
      };
      return el.purchaseLink ? { ...base, purchaseLink: el.purchaseLink } : base;
    });
  }

  private blank(index = 0): EditableSupplement {
    return {
      name: '',
      dose: '',
      when: '',
      icon: ICONS[index % ICONS.length] ?? 'flask-outline',
      purchaseLink: '',
    };
  }
}
