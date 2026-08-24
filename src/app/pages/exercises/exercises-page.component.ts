import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import type { ExerciseMaster, ExerciseType } from '../../models/exercise-master';
import { ExerciseMastersService } from '../../services/exercise-masters.service';
import { ExerciseDialogComponent } from './exercise-dialog.component';

type FilterKey = 'all' | ExerciseType;

@Component({
  selector: 'app-exercises-page',
  standalone: true,
  imports: [FormsModule, ExerciseDialogComponent],
  templateUrl: './exercises-page.component.html',
  styleUrl: './exercises-page.component.scss',
})
export class ExercisesPageComponent {
  private readonly exerciseMasters = inject(ExerciseMastersService);

  readonly query = signal('');
  readonly filter = signal<FilterKey>('all');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exercises = signal<ExerciseMaster[]>([]);
  readonly dialogOpen = signal(false);
  readonly editing = signal<ExerciseMaster | null>(null);

  readonly filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'strength', label: 'Fuerza' },
    { key: 'cardio', label: 'Cardio' },
  ];

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.exercises()
      .filter((ex) => (f === 'all' ? true : ex.type === f))
      .filter((ex) => {
        if (!q) return true;
        return (
          ex.name.toLowerCase().includes(q) ||
          (ex.explanation ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  readonly stats = computed(() => {
    const list = this.exercises();
    return {
      total: list.length,
      strength: list.filter((ex) => ex.type === 'strength').length,
      cardio: list.filter((ex) => ex.type === 'cardio').length,
    };
  });

  constructor() {
    this.reload();
  }

  setFilter(key: FilterKey): void {
    this.filter.set(key);
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(exercise: ExerciseMaster): void {
    this.editing.set(exercise);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  onSaved(exercise: ExerciseMaster): void {
    this.exercises.update((list) => {
      const idx = list.findIndex((item) => item._id === exercise._id);
      if (idx === -1) return [...list, exercise];
      const next = [...list];
      next[idx] = exercise;
      return next;
    });
    this.closeDialog();
  }

  onDeleted(id: string): void {
    this.exercises.update((list) => list.filter((item) => item._id !== id));
    this.closeDialog();
  }

  typeLabel(type: ExerciseType): string {
    return type === 'cardio' ? 'Cardio' : 'Fuerza';
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.exerciseMasters
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (list) => {
          this.exercises.set(list);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
