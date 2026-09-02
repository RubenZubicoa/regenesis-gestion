import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { VideoLibraryCategory, VideoLibraryTone } from '../../models/video-library';
import { VIDEO_LIBRARY_ICONS, VIDEO_LIBRARY_TONES } from '../../models/video-library';
import { VideoLibraryService } from '../../services/video-library.service';

@Component({
  selector: 'app-video-collection-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './video-collection-dialog.component.html',
  styleUrl: './video-collection-dialog.component.scss',
})
export class VideoCollectionDialogComponent implements OnInit {
  private readonly api = inject(VideoLibraryService);

  readonly collection = input<VideoLibraryCategory | null>(null);

  readonly saved = output<VideoLibraryCategory>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly name = signal('');
  readonly icon = signal<string>('play-outline');
  readonly tone = signal<VideoLibraryTone>('gold');
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly icons = VIDEO_LIBRARY_ICONS;
  readonly tones = VIDEO_LIBRARY_TONES;

  ngOnInit(): void {
    const current = this.collection();
    if (!current) return;
    this.name.set(current.category);
    this.icon.set(current.icon);
    this.tone.set(current.tone);
  }

  get isEdit(): boolean {
    return this.collection() != null;
  }

  close(): void {
    if (this.saving() || this.deleting()) return;
    this.closed.emit();
  }

  save(): void {
    const category = this.name().trim();
    if (!category) {
      this.saveError.set('El nombre de la colección es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const current = this.collection();
    const payload = {
      category,
      icon: this.icon(),
      tone: this.tone(),
      items: current?.items ?? [],
    };
    const request$ = current
      ? this.api.update(current.uuid, payload)
      : this.api.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  remove(): void {
    const current = this.collection();
    if (!current || this.saving() || this.deleting()) return;
    this.deleting.set(true);
    this.saveError.set(null);
    this.api.remove(current.uuid).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit(current.uuid);
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
