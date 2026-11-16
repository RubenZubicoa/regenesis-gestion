import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { latestDailyStepsGoal, type DailySteps } from '../../../models/daily-steps';
import { DailyStepsService } from '../../../services/daily-steps.service';

@Component({
  selector: 'app-steps-target-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './steps-target-dialog.component.html',
  styleUrl: '../weight-dialog/weight-dialog.component.scss',
})
export class StepsTargetDialogComponent implements OnInit {
  private readonly stepsApi = inject(DailyStepsService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly records = input<DailySteps[]>([]);

  readonly saved = output<DailySteps[]>();
  readonly closed = output<void>();

  readonly goal = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = latestDailyStepsGoal(this.records());
    this.goal.set(current != null ? String(current) : '');
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  setGoal(value: string | number | null): void {
    this.goal.set(value == null ? '' : String(value));
  }

  save(): void {
    const goal = Number(this.goal());
    if (!Number.isFinite(goal) || goal <= 0) {
      this.saveError.set('El objetivo debe ser un número mayor que 0.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.stepsApi.saveGoal(this.clientId(), this.records(), Math.round(goal)).subscribe({
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
