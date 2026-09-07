import { Component, HostListener, computed, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import type { MealMaster } from '../../models/meal-master';
import { mealPlanOptionsCount, mealPlanTitle } from '../../models/meal-master';
import { MealMastersService } from '../../services/meal-masters.service';

@Component({
  selector: 'app-load-meal-plan-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './load-meal-plan-dialog.component.html',
  styleUrl: './load-meal-plan-dialog.component.scss',
})
export class LoadMealPlanDialogComponent {
  private readonly api = inject(MealMastersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly blank = output<void>();
  readonly picked = output<MealMaster>();
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly templates = signal<MealMaster[]>([]);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.templates().filter((item) => {
      if (!q) return true;
      const haystack = [
        item.nombre,
        item.descripcion,
        mealPlanTitle(item),
        ...item.slots.map((slot) => slot.label),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  constructor() {
    this.api
      .list()
      .pipe(
        catchError(() => of([] as MealMaster[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => {
        this.templates.set(list);
        this.loading.set(false);
      });
  }

  title(plan: MealMaster): string {
    return mealPlanTitle(plan);
  }

  optionsCount(plan: MealMaster): number {
    return mealPlanOptionsCount(plan);
  }

  close(): void {
    this.closed.emit();
  }

  startBlank(): void {
    this.blank.emit();
  }

  pick(template: MealMaster): void {
    this.picked.emit(template);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
