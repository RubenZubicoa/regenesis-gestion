import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Macros } from '../../models/macros';
import { MacrosService } from '../../services/macros.service';

@Component({
  selector: 'app-macros-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './macros-dialog.component.html',
  styleUrl: './macros-dialog.component.scss',
})
export class MacrosDialogComponent implements OnInit {
  private readonly macrosService = inject(MacrosService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly macros = input<Macros | null>(null);

  readonly saved = output<Macros>();
  readonly closed = output<void>();

  readonly calories = signal(0);
  readonly protein = signal(0);
  readonly carbs = signal(0);
  readonly fats = signal(0);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = this.macros();
    this.calories.set(current?.target ?? 1900);
    this.protein.set(this.itemTarget(current, 'prot', 150));
    this.carbs.set(this.itemTarget(current, 'carbs', 200));
    this.fats.set(this.itemTarget(current, 'fats', 60));
  }

  get isEdit(): boolean {
    return this.macros() != null;
  }

  get estimatedKcal(): number {
    return this.protein() * 4 + this.carbs() * 4 + this.fats() * 9;
  }

  get mixGradient(): string {
    const p = this.protein() * 4;
    const c = this.carbs() * 4;
    const f = this.fats() * 9;
    const total = p + c + f;
    if (total <= 0) {
      return 'conic-gradient(#1c3358 0deg, #1c3358 360deg)';
    }
    const pEnd = (p / total) * 360;
    const cEnd = pEnd + (c / total) * 360;
    return `conic-gradient(#f2c868 0deg ${pEnd}deg, #4c8df6 ${pEnd}deg ${cEnd}deg, #12b5a5 ${cEnd}deg 360deg)`;
  }

  nudge(field: 'calories' | 'protein' | 'carbs' | 'fats', delta: number): void {
    const next = Math.max(0, this[field]() + delta);
    this[field].set(next);
  }

  setField(field: 'calories' | 'protein' | 'carbs' | 'fats', value: string | number): void {
    const parsed = Number(value);
    this[field].set(Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0);
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  save(): void {
    if (this.calories() <= 0 || this.protein() <= 0 || this.carbs() <= 0 || this.fats() <= 0) {
      this.saveError.set('Completa calorías, proteínas, carbohidratos y grasas.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.macrosService
      .save(this.clientId(), this.macros(), {
        calories: this.calories(),
        protein: this.protein(),
        carbs: this.carbs(),
        fats: this.fats(),
      })
      .subscribe({
        next: (macros) => {
          this.saving.set(false);
          this.saved.emit(macros);
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

  private itemTarget(macros: Macros | null, key: string, fallback: number): number {
    return macros?.items.find((item) => item.key === key)?.target ?? fallback;
  }
}
