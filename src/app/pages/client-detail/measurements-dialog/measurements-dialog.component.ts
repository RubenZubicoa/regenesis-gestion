import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { Measurement } from '../../../models/measurement';
import { todayIsoDate } from '../../../models/weight';
import { MeasurementsService } from '../../../services/measurements.service';

interface MeasurementRow {
  current: Measurement;
  value: string;
}

@Component({
  selector: 'app-measurements-dialog',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './measurements-dialog.component.html',
  styleUrl: './measurements-dialog.component.scss',
})
export class MeasurementsDialogComponent implements OnInit {
  private readonly measurementsApi = inject(MeasurementsService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly measurements = input<Measurement[]>([]);

  readonly saved = output<Measurement[]>();
  readonly closed = output<void>();

  readonly date = signal(todayIsoDate());
  readonly rows = signal<MeasurementRow[]>([]);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    this.date.set(todayIsoDate());
    this.rows.set(
      this.measurements().map((current) => ({
        current,
        value: current._id ? String(current.value) : '',
      })),
    );
  }

  get isEdit(): boolean {
    return this.measurements().some((item) => Boolean(item._id));
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
    const date = this.date().trim();
    if (!date) {
      this.saveError.set('La fecha es obligatoria.');
      return;
    }

    const entries: { current: Measurement; date: string; value: number }[] = [];
    for (const row of this.rows()) {
      const raw = row.value.trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        this.saveError.set(`«${row.current.label}» debe ser un número mayor que 0.`);
        return;
      }
      if (row.current._id && row.current.value === value) continue;
      entries.push({ current: row.current, date, value });
    }

    if (entries.length === 0) {
      this.saveError.set('Cambia al menos una medida para guardar.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.measurementsApi.saveMany(this.clientId(), entries).subscribe({
      next: (measurements) => {
        this.saving.set(false);
        this.saved.emit(measurements);
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
