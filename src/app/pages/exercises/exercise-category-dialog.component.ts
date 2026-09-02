import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ExerciseCategory } from '../../models/exercise-master';
import { slugifyCategoryKey } from '../../models/exercise-master';
import { ExerciseCategoriesService } from '../../services/exercise-categories.service';

@Component({
  selector: 'app-exercise-category-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './exercise-category-dialog.component.html',
  styleUrl: './exercise-category-dialog.component.scss',
})
export class ExerciseCategoryDialogComponent implements OnInit {
  private readonly categoriesApi = inject(ExerciseCategoriesService);

  readonly category = input<ExerciseCategory | null>(null);

  readonly saved = output<ExerciseCategory>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly label = signal('');
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = this.category();
    if (current) this.label.set(current.label);
  }

  get isEdit(): boolean {
    return this.category() != null;
  }

  close(): void {
    if (this.saving() || this.deleting()) return;
    this.closed.emit();
  }

  save(): void {
    const label = this.label().trim();
    if (!label) {
      this.saveError.set('El nombre de la categoría es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const current = this.category();
    const payload = {
      label,
      key: current?.key || slugifyCategoryKey(label),
    };
    const request$ = current
      ? this.categoriesApi.update(current._id, payload)
      : this.categoriesApi.create(payload);

    request$.subscribe({
      next: (category) => {
        this.saving.set(false);
        this.saved.emit(category);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  remove(): void {
    const current = this.category();
    if (!current || this.saving() || this.deleting()) return;

    this.deleting.set(true);
    this.saveError.set(null);
    this.categoriesApi.remove(current._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit(current._id);
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
}
