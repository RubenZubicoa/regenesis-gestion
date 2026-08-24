import {
  Component,
  HostListener,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Client } from '../../models/client';
import type { Review, ReviewStatus } from '../../models/review';
import { ReviewsService } from '../../services/reviews.service';

@Component({
  selector: 'app-review-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './review-dialog.component.html',
  styleUrl: './review-dialog.component.scss',
})
export class ReviewDialogComponent implements OnInit {
  private readonly reviews = inject(ReviewsService);

  readonly review = input<Review | null>(null);
  readonly clients = input<Client[]>([]);
  readonly presetClientId = input<string | null>(null);

  readonly saved = output<Review>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly clientId = signal('');
  readonly title = signal('');
  readonly dateLocal = signal('');
  readonly status = signal<ReviewStatus>('upcoming');
  readonly note = signal('');
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly statuses: { key: ReviewStatus; label: string }[] = [
    { key: 'upcoming', label: 'Pendiente' },
    { key: 'done', label: 'Hecha' },
    { key: 'canceled', label: 'Cancelada' },
  ];

  ngOnInit(): void {
    const current = this.review();
    if (current) {
      this.clientId.set(current.clientId);
      this.title.set(current.title);
      this.dateLocal.set(toDatetimeLocalValue(current.date));
      this.status.set(current.status);
      this.note.set(current.note);
      return;
    }

    const preset = this.presetClientId();
    this.clientId.set(preset ?? this.clients()[0]?._id ?? '');
    this.title.set('Revisión de seguimiento');
    this.dateLocal.set(defaultDatetimeLocal());
    this.status.set('upcoming');
    this.note.set('');
  }

  get isEdit(): boolean {
    return this.review() != null;
  }

  setStatus(status: ReviewStatus): void {
    this.status.set(status);
  }

  close(): void {
    if (this.saving() || this.deleting()) return;
    this.closed.emit();
  }

  save(): void {
    const clientId = this.clientId().trim();
    const title = this.title().trim();
    const dateLocal = this.dateLocal().trim();
    const note = this.note().trim();

    if (!clientId) {
      this.saveError.set('Selecciona un cliente.');
      return;
    }
    if (!title) {
      this.saveError.set('El título es obligatorio.');
      return;
    }
    if (!dateLocal) {
      this.saveError.set('Indica fecha y hora.');
      return;
    }

    const date = formatStoredDate(dateLocal);
    if (!date) {
      this.saveError.set('Fecha u hora no válida.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const payload = {
      clientId,
      title,
      date,
      status: this.status(),
      note,
    };

    const current = this.review();
    const request$ = current
      ? this.reviews.update(current._id, payload)
      : this.reviews.create(payload);

    request$.subscribe({
      next: (review) => {
        this.saving.set(false);
        this.saved.emit(review);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  remove(): void {
    const current = this.review();
    if (!current || this.saving() || this.deleting()) return;

    this.deleting.set(true);
    this.saveError.set(null);
    this.reviews.remove(current._id).subscribe({
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

function defaultDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  return toLocalInput(d);
}

function toDatetimeLocalValue(raw: string): string {
  const parsed = tryParseDate(raw);
  if (parsed) return toLocalInput(parsed);
  return defaultDatetimeLocal();
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Guarda el valor local del datetime picker (sin conversión UTC). */
function formatStoredDate(localValue: string): string | null {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return localValue;
}

function tryParseDate(raw: string): Date | null {
  if (!raw.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
