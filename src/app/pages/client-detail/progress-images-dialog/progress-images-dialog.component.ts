import {
  Component,
  HostListener,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  PROGRESS_IMAGE_POSES,
  type ProgressImage,
  type ProgressImagePose,
} from '../../../models/progress-image';
import { todayIsoDate } from '../../../models/weight';
import { ProgressImagesService } from '../../../services/progress-images.service';

@Component({
  selector: 'app-progress-images-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './progress-images-dialog.component.html',
  styleUrls: [
    '../weight-dialog/weight-dialog.component.scss',
    './progress-images-dialog.component.scss',
  ],
})
export class ProgressImagesDialogComponent implements OnDestroy {
  private readonly imagesApi = inject(ProgressImagesService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();

  readonly saved = output<ProgressImage[]>();
  readonly closed = output<void>();

  readonly poses = PROGRESS_IMAGE_POSES;
  readonly date = signal(todayIsoDate());
  readonly pose = signal<ProgressImagePose>('De frente');
  readonly file = signal<File | null>(null);
  readonly fileName = signal('');
  readonly preview = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  private objectUrl: string | null = null;

  ngOnDestroy(): void {
    this.revokePreview();
  }

  close(): void {
    if (this.saving()) return;
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
    const file = this.file();
    if (!date) {
      this.saveError.set('La fecha es obligatoria.');
      return;
    }
    if (!file) {
      this.saveError.set('Elige una imagen para añadirla.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.imagesApi.save(this.clientId(), { pose: this.pose(), file, date }).subscribe({
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
