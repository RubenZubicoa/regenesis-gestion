import { Component, HostListener, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { VideoLibraryItem, VideoLibraryKind } from '../../models/video-library';

@Component({
  selector: 'app-video-piece-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './video-piece-dialog.component.html',
  styleUrl: './video-piece-dialog.component.scss',
})
export class VideoPieceDialogComponent implements OnInit {
  readonly piece = input<VideoLibraryItem | null>(null);
  readonly busy = input(false);
  readonly persistError = input<string | null>(null);

  readonly saved = output<VideoLibraryItem>();
  readonly deleted = output<void>();
  readonly closed = output<void>();

  readonly title = signal('');
  readonly type = signal<VideoLibraryKind>('Vídeo');
  readonly length = signal('');
  readonly phase = signal(1);
  readonly url = signal('');
  readonly saveError = signal<string | null>(null);

  readonly phases = [1, 2, 3];

  ngOnInit(): void {
    const current = this.piece();
    if (!current) return;
    this.title.set(current.title);
    this.type.set(current.type);
    this.length.set(current.length);
    this.phase.set(current.phase);
    this.url.set(current.url);
  }

  get isEdit(): boolean {
    return this.piece() != null;
  }

  close(): void {
    if (this.busy()) return;
    this.closed.emit();
  }

  save(): void {
    if (this.busy()) return;
    const title = this.title().trim();
    const url = this.url().trim();
    const length = this.length().trim();
    if (!title || !url || !length) {
      this.saveError.set('Título, duración y URL son obligatorios.');
      return;
    }
    this.saveError.set(null);
    this.saved.emit({
      title,
      type: this.type(),
      length,
      phase: this.phase(),
      url,
    });
  }

  remove(): void {
    if (this.busy()) return;
    this.deleted.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
