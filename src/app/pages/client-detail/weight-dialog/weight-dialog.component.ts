import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { todayIsoDate, type Weight } from '../../../models/weight';
import { WeightsService } from '../../../services/weights.service';

@Component({
  selector: 'app-weight-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './weight-dialog.component.html',
  styleUrl: './weight-dialog.component.scss',
})
export class WeightDialogComponent implements OnInit {
  private readonly weightsApi = inject(WeightsService);

  readonly clientId = input.required<string>();
  readonly clientName = input.required<string>();
  readonly weight = input<Weight | null>(null);

  readonly saved = output<Weight>();
  readonly closed = output<void>();

  readonly date = signal(todayIsoDate());
  readonly value = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = this.weight();
    this.date.set(todayIsoDate());
    this.value.set(current ? String(current.current) : '');
  }

  get isEdit(): boolean {
    return this.weight() != null;
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  setValue(value: string | number | null): void {
    this.value.set(value == null ? '' : String(value));
  }

  save(): void {
    const date = this.date().trim();
    const value = Number(this.value());

    if (!date) {
      this.saveError.set('La fecha es obligatoria.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      this.saveError.set('El peso corporal debe ser un número mayor que 0.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.weightsApi
      .savePoint(this.clientId(), this.weight(), { date, value })
      .subscribe({
        next: (weight) => {
          this.saving.set(false);
          this.saved.emit(weight);
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
