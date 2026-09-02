import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { ExerciseCategory } from '../../models/exercise-master';
import { ExerciseCategoriesService } from '../../services/exercise-categories.service';
import { ExerciseCategoryDialogComponent } from './exercise-category-dialog.component';

@Component({
  selector: 'app-exercise-categories-page',
  standalone: true,
  imports: [FormsModule, RouterLink, ExerciseCategoryDialogComponent],
  templateUrl: './exercise-categories-page.component.html',
  styleUrl: './exercise-categories-page.component.scss',
})
export class ExerciseCategoriesPageComponent {
  private readonly categoriesApi = inject(ExerciseCategoriesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly categories = signal<ExerciseCategory[]>([]);
  readonly dialogOpen = signal(false);
  readonly editing = signal<ExerciseCategory | null>(null);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.categories().filter((item) => {
      if (!q) return true;
      return item.label.toLowerCase().includes(q);
    });
  });

  constructor() {
    this.reload();
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(category: ExerciseCategory): void {
    this.editing.set(category);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  onSaved(category: ExerciseCategory): void {
    this.categories.update((list) => {
      const idx = list.findIndex((item) => item._id === category._id);
      const next = idx === -1 ? [...list, category] : list.map((item, i) => (i === idx ? category : item));
      return next.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    });
    this.closeDialog();
  }

  onDeleted(id: string): void {
    this.categories.update((list) => list.filter((item) => item._id !== id));
    this.closeDialog();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.categoriesApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.categories.set(list);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
