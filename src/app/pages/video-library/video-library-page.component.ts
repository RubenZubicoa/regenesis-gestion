import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import type {
  VideoLibraryCategory,
  VideoLibraryItem,
  VideoLibraryKind,
} from '../../models/video-library';
import {
  libraryIconGlyph,
  videoLibraryPoster,
} from '../../models/video-library';
import { VideoLibraryService } from '../../services/video-library.service';
import { VideoCollectionDialogComponent } from './video-collection-dialog.component';
import { VideoPieceDialogComponent } from './video-piece-dialog.component';

type KindFilter = 'all' | VideoLibraryKind;
type PhaseFilter = 'all' | 1 | 2 | 3;

@Component({
  selector: 'app-video-library-page',
  standalone: true,
  imports: [FormsModule, VideoCollectionDialogComponent, VideoPieceDialogComponent],
  templateUrl: './video-library-page.component.html',
  styleUrl: './video-library-page.component.scss',
})
export class VideoLibraryPageComponent {
  private readonly api = inject(VideoLibraryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly collections = signal<VideoLibraryCategory[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly query = signal('');
  readonly kindFilter = signal<KindFilter>('all');
  readonly phaseFilter = signal<PhaseFilter>('all');

  readonly collectionDialogOpen = signal(false);
  readonly editingCollection = signal<VideoLibraryCategory | null>(null);
  readonly pieceDialogOpen = signal(false);
  readonly editingPiece = signal<VideoLibraryItem | null>(null);
  readonly editingPieceIndex = signal<number | null>(null);

  readonly kindFilters: { key: KindFilter; label: string }[] = [
    { key: 'all', label: 'Todo' },
    { key: 'Vídeo', label: 'Vídeos' },
    { key: 'PDF', label: 'PDFs' },
  ];

  readonly phaseFilters: { key: PhaseFilter; label: string }[] = [
    { key: 'all', label: 'Todas las fases' },
    { key: 1, label: 'Fase 1' },
    { key: 2, label: 'Fase 2' },
    { key: 3, label: 'Fase 3' },
  ];

  readonly selected = computed(() => {
    const id = this.selectedId();
    return this.collections().find((item) => item.uuid === id) ?? this.collections()[0] ?? null;
  });

  readonly stats = computed(() => {
    const list = this.collections();
    const items = list.flatMap((col) => col.items);
    return {
      collections: list.length,
      videos: items.filter((item) => item.type === 'Vídeo').length,
      pdfs: items.filter((item) => item.type === 'PDF').length,
    };
  });

  readonly visiblePieces = computed(() => {
    const col = this.selected();
    if (!col) return [];
    const q = this.query().trim().toLowerCase();
    const kind = this.kindFilter();
    const phase = this.phaseFilter();
    return col.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (kind === 'all' ? true : item.type === kind))
      .filter(({ item }) => (phase === 'all' ? true : item.phase === phase))
      .filter(({ item }) => {
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          col.category.toLowerCase().includes(q)
        );
      });
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.collections.set(list);
          const current = this.selectedId();
          this.selectedId.set(
            list.some((item) => item.uuid === current) ? current : list[0]?.uuid ?? null,
          );
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  iconGlyph(icon: string): string {
    return libraryIconGlyph(icon);
  }

  poster(item: VideoLibraryItem): string | null {
    return videoLibraryPoster(item);
  }

  setKind(kind: KindFilter): void {
    this.kindFilter.set(kind);
  }

  setPhase(phase: PhaseFilter): void {
    this.phaseFilter.set(phase);
  }

  selectCollection(id: string): void {
    this.selectedId.set(id);
  }

  openCreateCollection(): void {
    this.editingCollection.set(null);
    this.collectionDialogOpen.set(true);
  }

  openEditCollection(): void {
    const current = this.selected();
    if (!current) return;
    this.editingCollection.set(current);
    this.collectionDialogOpen.set(true);
  }

  closeCollectionDialog(): void {
    this.collectionDialogOpen.set(false);
    this.editingCollection.set(null);
  }

  onCollectionSaved(saved: VideoLibraryCategory): void {
    this.collections.update((list) => {
      const idx = list.findIndex((item) => item.uuid === saved.uuid);
      const next =
        idx === -1 ? [...list, saved] : list.map((item, i) => (i === idx ? saved : item));
      return next.sort((a, b) => a.category.localeCompare(b.category, 'es'));
    });
    this.selectedId.set(saved.uuid);
    this.closeCollectionDialog();
  }

  onCollectionDeleted(id: string): void {
    this.collections.update((list) => list.filter((item) => item.uuid !== id));
    const next = this.collections()[0];
    this.selectedId.set(next?.uuid ?? null);
    this.closeCollectionDialog();
  }

  openCreatePiece(): void {
    this.editingPiece.set(null);
    this.editingPieceIndex.set(null);
    this.pieceDialogOpen.set(true);
  }

  openEditPiece(index: number): void {
    const current = this.selected();
    if (!current) return;
    this.editingPiece.set(current.items[index] ?? null);
    this.editingPieceIndex.set(index);
    this.pieceDialogOpen.set(true);
  }

  closePieceDialog(): void {
    if (this.saving()) return;
    this.pieceDialogOpen.set(false);
    this.editingPiece.set(null);
    this.editingPieceIndex.set(null);
    this.actionError.set(null);
  }

  onPieceSaved(item: VideoLibraryItem): void {
    const current = this.selected();
    if (!current) return;
    const items = [...current.items];
    const idx = this.editingPieceIndex();
    if (idx == null) items.push(item);
    else items[idx] = item;
    this.persistItems(current, items);
  }

  onPieceDeleted(): void {
    const current = this.selected();
    const idx = this.editingPieceIndex();
    if (!current || idx == null) return;
    const items = current.items.filter((_, i) => i !== idx);
    this.persistItems(current, items);
  }

  openExternal(event: Event, url: string): void {
    event.stopPropagation();
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  private persistItems(current: VideoLibraryCategory, items: VideoLibraryItem[]): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.api
      .update(current.uuid, {
        category: current.category,
        icon: current.icon,
        tone: current.tone,
        items,
      })
      .subscribe({
        next: (saved) => {
          this.collections.update((list) =>
            list.map((item) => (item.uuid === saved.uuid ? saved : item)),
          );
          this.saving.set(false);
          this.closePieceDialog();
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.actionError.set(err.message);
        },
      });
  }
}
