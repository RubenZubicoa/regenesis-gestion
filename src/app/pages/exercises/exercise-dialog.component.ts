import { Component, HostListener, OnDestroy, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ExerciseCategory, ExerciseMaster, ExerciseType } from '../../models/exercise-master';
import { categoryMatches } from '../../models/exercise-master';
import { ExerciseMastersService } from '../../services/exercise-masters.service';

@Component({
  selector: 'app-exercise-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './exercise-dialog.component.html',
  styleUrl: './exercise-dialog.component.scss',
})
export class ExerciseDialogComponent implements OnInit, OnDestroy {
  private readonly exerciseMasters = inject(ExerciseMastersService);

  readonly exercise = input<ExerciseMaster | null>(null);
  readonly categories = input<ExerciseCategory[]>([]);

  readonly saved = output<ExerciseMaster>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly name = signal('');
  readonly type = signal<ExerciseType>('strength');
  readonly category = signal('');
  readonly imageUrl = signal('');
  readonly imageFile = signal<File | null>(null);
  readonly imageName = signal('');
  readonly explanation = signal('');
  private objectUrl: string | null = null;
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = this.exercise();
    if (current) {
      this.name.set(current.name);
      this.type.set(current.type);
      this.category.set(current.category ?? '');
      this.imageUrl.set(current.imageUrl ?? '');
      this.imageName.set(current.imageUrl ? 'Imagen actual' : '');
      this.explanation.set(current.explanation ?? '');
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.saveError.set('El archivo debe ser una imagen.');
      input.value = '';
      return;
    }

    this.revokePreview();
    this.objectUrl = URL.createObjectURL(file);
    this.imageFile.set(file);
    this.imageName.set(file.name);
    this.imageUrl.set(this.objectUrl);
    this.saveError.set(null);
  }

  get isEdit(): boolean {
    return this.exercise() != null;
  }

  setType(type: ExerciseType): void {
    this.type.set(type);
  }

  setCategory(value: string): void {
    this.category.set(value);
  }

  isCategoryOn(item: ExerciseCategory): boolean {
    return categoryMatches(this.category(), item);
  }

  close(): void {
    if (this.saving() || this.deleting()) return;
    this.closed.emit();
  }

  save(): void {
    const name = this.name().trim();
    if (!name) {
      this.saveError.set('El nombre del ejercicio es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const payload = {
      name,
      type: this.type(),
      category: this.category() || undefined,
      image: this.imageFile() ?? undefined,
      explanation: this.explanation().trim() || undefined,
    };

    const current = this.exercise();
    const request$ = current
      ? this.exerciseMasters.update(current._id, payload)
      : this.exerciseMasters.create(payload);

    request$.subscribe({
      next: (exercise) => {
        this.saving.set(false);
        this.saved.emit(exercise);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  remove(): void {
    const current = this.exercise();
    if (!current || this.saving() || this.deleting()) return;

    this.deleting.set(true);
    this.saveError.set(null);
    this.exerciseMasters.remove(current._id).subscribe({
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

  private revokePreview(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
