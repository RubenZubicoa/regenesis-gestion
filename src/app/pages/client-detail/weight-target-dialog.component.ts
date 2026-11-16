import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Weight } from '../../models/weight';
import { WeightsService } from '../../services/weights.service';

@Component({
  selector: 'app-weight-target-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './weight-target-dialog.component.html',
  styleUrl: './weight-dialog.component.scss',
})
export class WeightTargetDialogComponent implements OnInit {
  private readonly weightsApi = inject(WeightsService);

  readonly clientName = input.required<string>();
  readonly weight = input<Weight | null>(null);

  readonly saved = output<Weight>();
  readonly closed = output<void>();

  readonly target = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = this.weight();
    this.target.set(current?.target ? String(current.target) : '');
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  setTarget(value: string | number | null): void {
    this.target.set(value == null ? '' : String(value));
  }

  save(): void {
    const current = this.weight();
    if (!current) {
      this.saveError.set('Primero registra un peso corporal.');
      return;
    }

    const target = Number(this.target());
    if (!Number.isFinite(target) || target <= 0) {
      this.saveError.set('El objetivo debe ser un número mayor que 0.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.weightsApi.saveTarget(current, target).subscribe({
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
