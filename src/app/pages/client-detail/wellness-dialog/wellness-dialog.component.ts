import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Wellness } from '../../../models/wellness';
import { WellnessService } from '../../../services/wellness.service';

interface WellnessRow {
  current: Wellness;
  value: string;
}

@Component({
  selector: 'app-wellness-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './wellness-dialog.component.html',
  styleUrl: '../measurements-dialog/measurements-dialog.component.scss',
})
export class WellnessDialogComponent implements OnInit {
  private readonly wellnessApi = inject(WellnessService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly wellness = input<Wellness[]>([]);

  readonly saved = output<Wellness[]>();
  readonly closed = output<void>();

  readonly rows = signal<WellnessRow[]>([]);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    this.rows.set(
      this.wellness().map((current) => ({
        current,
        value: current._id ? String(current.value) : '',
      })),
    );
  }

  get isEdit(): boolean {
    return this.wellness().some((item) => Boolean(item._id));
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  setRowValue(index: number, value: string | number | null): void {
    const next = value == null ? '' : String(value);
    this.rows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, value: next } : row)),
    );
  }

  save(): void {
    const entries: { current: Wellness; value: number }[] = [];
    for (const row of this.rows()) {
      const raw = row.value.trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        this.saveError.set(`«${row.current.label}» debe estar entre 0 y 100.`);
        return;
      }
      if (row.current._id && row.current.value === value) continue;
      entries.push({ current: row.current, value });
    }

    if (entries.length === 0) {
      this.saveError.set('Cambia al menos una sensación para guardar.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.wellnessApi.saveMany(this.clientId(), entries).subscribe({
      next: (wellness) => {
        this.saving.set(false);
        this.saved.emit(wellness);
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
}
