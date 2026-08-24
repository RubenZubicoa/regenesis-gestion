import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Client } from '../../models/client';
import type { Review, ReviewStatus } from '../../models/review';
import { ReviewsService } from '../../services/reviews.service';
import { ReviewDialogComponent } from './review-dialog.component';

type FilterKey = 'all' | 'upcoming' | 'past';

@Component({
  selector: 'app-reviews-page',
  standalone: true,
  imports: [FormsModule, RouterLink, ReviewDialogComponent],
  templateUrl: './reviews-page.component.html',
  styleUrl: './reviews-page.component.scss',
})
export class ReviewsPageComponent {
  private readonly reviewsApi = inject(ReviewsService);
  private readonly route = inject(ActivatedRoute);

  readonly query = signal('');
  readonly filter = signal<FilterKey>('all');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly clients = signal<Client[]>([]);
  readonly dialogOpen = signal(false);
  readonly editing = signal<Review | null>(null);
  readonly presetClientId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'upcoming', label: 'Pendientes' },
    { key: 'past', label: 'Pasadas' },
  ];

  readonly clientNameById = computed(() => {
    const map = new Map<string, string>();
    for (const c of this.clients()) {
      map.set(c._id, c.fullName);
    }
    return map;
  });

  readonly pending = computed(() =>
    this.sortReviews(
      this.reviews().filter((r) => r.status === 'upcoming'),
      'asc',
    ),
  );

  readonly past = computed(() =>
    this.sortReviews(
      this.reviews().filter((r) => r.status === 'done' || r.status === 'canceled'),
      'desc',
    ),
  );

  readonly filteredPending = computed(() => this.applyQuery(this.pending()));
  readonly filteredPast = computed(() => this.applyQuery(this.past()));

  readonly showPending = computed(() => {
    const f = this.filter();
    return f === 'all' || f === 'upcoming';
  });

  readonly showPast = computed(() => {
    const f = this.filter();
    return f === 'all' || f === 'past';
  });

  readonly stats = computed(() => {
    const list = this.reviews();
    return {
      total: list.length,
      upcoming: list.filter((r) => r.status === 'upcoming').length,
      done: list.filter((r) => r.status === 'done').length,
      canceled: list.filter((r) => r.status === 'canceled').length,
    };
  });

  constructor() {
    const preset = this.route.snapshot.queryParamMap.get('client');
    if (preset) this.presetClientId.set(preset);

    this.reload();
  }

  setFilter(key: FilterKey): void {
    this.filter.set(key);
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  clientName(clientId: string): string {
    return this.clientNameById().get(clientId) ?? 'Cliente';
  }

  formatDate(raw: string): string {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    return raw;
  }

  statusLabel(status: ReviewStatus): string {
    switch (status) {
      case 'upcoming':
        return 'Pendiente';
      case 'done':
        return 'Hecha';
      case 'canceled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  openCreate(clientId?: string): void {
    this.editing.set(null);
    this.presetClientId.set(clientId ?? this.presetClientId());
    this.dialogOpen.set(true);
  }

  openEdit(review: Review): void {
    this.editing.set(review);
    this.presetClientId.set(null);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  onSaved(review: Review): void {
    this.reviews.update((list) => {
      const idx = list.findIndex((item) => item._id === review._id);
      if (idx === -1) return [...list, review];
      const next = [...list];
      next[idx] = review;
      return next;
    });
    this.closeDialog();
  }

  onDeleted(id: string): void {
    this.reviews.update((list) => list.filter((item) => item._id !== id));
    this.closeDialog();
  }

  markDone(review: Review): void {
    this.patchStatus(review, 'done');
  }

  markCanceled(review: Review): void {
    this.patchStatus(review, 'canceled');
  }

  reopen(review: Review): void {
    this.patchStatus(review, 'upcoming');
  }

  private patchStatus(review: Review, status: ReviewStatus): void {
    if (this.busyId()) return;
    this.busyId.set(review._id);
    this.actionError.set(null);
    this.reviewsApi.update(review._id, { status }).subscribe({
      next: (updated) => {
        this.reviews.update((list) =>
          list.map((item) => (item._id === updated._id ? updated : item)),
        );
        this.busyId.set(null);
      },
      error: (err: Error) => {
        this.actionError.set(err.message);
        this.busyId.set(null);
      },
    });
  }

  private applyQuery(list: Review[]): Review[] {
    const q = this.query().trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const name = this.clientName(r.clientId).toLowerCase();
      return (
        name.includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q)
      );
    });
  }

  private sortReviews(list: Review[], dir: 'asc' | 'desc'): Review[] {
    const sorted = [...list].sort((a, b) => {
      const ta = this.dateSortKey(a.date);
      const tb = this.dateSortKey(b.date);
      return ta - tb;
    });
    return dir === 'desc' ? sorted.reverse() : sorted;
  }

  private dateSortKey(raw: string): number {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return d.getTime();
    }
    return Number.MAX_SAFE_INTEGER;
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      reviews: this.reviewsApi.list(),
      clients: this.reviewsApi.listClients(),
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ reviews, clients }) => {
          this.reviews.set(reviews);
          this.clients.set(clients);
          this.loading.set(false);

          const preset = this.presetClientId();
          if (preset && !this.dialogOpen()) {
            this.openCreate(preset);
          }
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
