import { Component, HostListener, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { lastDailyStepsChartDays } from '../../../core/normalizers';
import { findDailyStepsByDate, type DailySteps } from '../../../models/daily-steps';
import { todayIsoDate } from '../../../models/weight';
import { DailyStepsService } from '../../../services/daily-steps.service';

@Component({
  selector: 'app-steps-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './steps-dialog.component.html',
  styleUrls: [
    '../weight-dialog/weight-dialog.component.scss',
    './steps-dialog.component.scss',
  ],
})
export class StepsDialogComponent implements OnInit {
  private readonly stepsApi = inject(DailyStepsService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly records = input<DailySteps[]>([]);
  readonly initialDate = input<string | null>(null);

  readonly saved = output<DailySteps[]>();
  readonly closed = output<void>();

  readonly date = signal(todayIsoDate());
  readonly steps = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly days = computed(() => {
    const windowDays = lastDailyStepsChartDays(this.records(), 15);
    const inWindow = new Set(windowDays.map((day) => day.date));
    const extra = this.records()
      .map((record) => record.date.slice(0, 10))
      .filter((date) => date && !inWindow.has(date))
      .filter((date, index, all) => all.indexOf(date) === index)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const record = findDailyStepsByDate(this.records(), date);
        return {
          date,
          label: date,
          steps: record?.steps ?? 0,
          goal: record?.goal && record.goal > 0 ? record.goal : 0,
        };
      });
    return [...extra, ...windowDays].sort((a, b) => b.date.localeCompare(a.date));
  });

  ngOnInit(): void {
    this.applyDate(this.initialDate() || todayIsoDate());
  }

  get isEdit(): boolean {
    return Boolean(findDailyStepsByDate(this.records(), this.date()));
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  applyDate(value: string): void {
    const date = String(value ?? '').slice(0, 10);
    if (!date) return;
    this.date.set(date);
    const current = findDailyStepsByDate(this.records(), date);
    this.steps.set(current ? String(current.steps) : '');
    this.saveError.set(null);
  }

  setSteps(value: string | number | null): void {
    this.steps.set(value == null ? '' : String(value));
  }

  formatDayLabel(iso: string): string {
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  save(): void {
    const date = this.date().trim();
    const steps = Number(this.steps());

    if (!date) {
      this.saveError.set('Elige el día que quieres registrar o editar.');
      return;
    }
    if (!Number.isFinite(steps) || steps < 0) {
      this.saveError.set('Los pasos deben ser un número mayor o igual que 0.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.stepsApi
      .savePoint(this.clientId(), this.records(), {
        date,
        steps: Math.round(steps),
      })
      .subscribe({
        next: (records) => {
          this.saving.set(false);
          this.saved.emit(records);
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
