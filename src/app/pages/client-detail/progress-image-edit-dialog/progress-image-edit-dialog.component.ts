import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  PROGRESS_IMAGE_POSES,
  isProgressImagePose,
  progressImageDateInput,
  progressImageTakenAt,
  type ProgressImage,
  type ProgressImagePose,
} from '../../../models/progress-image';
import { ProgressImagesService } from '../../../services/progress-images.service';

@Component({
  selector: 'app-progress-image-edit-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './progress-image-edit-dialog.component.html',
  styleUrls: [
    '../weight-dialog/weight-dialog.component.scss',
    '../progress-images-dialog/progress-images-dialog.component.scss',
  ],
})
export class ProgressImageEditDialogComponent implements OnInit, OnDestroy {
  private readonly imagesApi = inject(ProgressImagesService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly image = input.required<ProgressImage>();

  readonly saved = output<ProgressImage[]>();
  readonly closed = output<void>();

  readonly poses = PROGRESS_IMAGE_POSES;
  readonly date = signal(progressImageDateInput());
  readonly pose = signal<ProgressImagePose>('De frente');
  readonly file = signal<File | null>(null);
  readonly fileName = signal('Imagen actual');
  readonly preview = signal('');
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);
  private objectUrl: string | null = null;

  ngOnInit(): void {
    const current = this.image();
    this.date.set(progressImageTakenAt(current));
    this.pose.set(isProgressImagePose(current.pose) ? current.pose : 'De frente');
    this.preview.set(current.image);
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  close(): void {
    if (this.saving() || this.deleting()) return;
    this.closed.emit();
  }

  setPose(pose: ProgressImagePose): void {
    this.pose.set(pose);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      this.saveError.set('El archivo debe ser una imagen.');
      input.value = '';
      return;
    }

    this.revokePreview();
    this.objectUrl = URL.createObjectURL(selected);
    this.file.set(selected);
    this.fileName.set(selected.name);
    this.preview.set(this.objectUrl);
    this.saveError.set(null);
    input.value = '';
  }

  save(): void {
    const date = this.date().trim();
    if (!date) {
      this.saveError.set('La fecha es obligatoria.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.imagesApi
      .update(this.clientId(), this.image(), {
        pose: this.pose(),
        file: this.file(),
        date,
      })
      .subscribe({
        next: (images) => {
          this.saving.set(false);
          this.saved.emit(images);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.saveError.set(err.message);
        },
      });
  }

  remove(): void {
    if (this.saving() || this.deleting()) return;
    this.deleting.set(true);
    this.saveError.set(null);
    this.imagesApi.remove(this.clientId(), this.image()._id).subscribe({
      next: (images) => {
        this.deleting.set(false);
        this.saved.emit(images);
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
