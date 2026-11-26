import { Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  MEASUREMENT_HISTORY_WEEKS,
  defaultMeasurementHistoryRange,
  measurementHistoryWeeksLabel,
} from '../../../models/measurement';

@Component({
  selector: 'app-measurement-history-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './measurement-history-filter.component.html',
  styleUrl: './measurement-history-filter.component.scss',
})
export class MeasurementHistoryFilterComponent {
  readonly from = model.required<string>();
  readonly to = model.required<string>();

  readonly weeksLabel = computed(() =>
    measurementHistoryWeeksLabel(this.from(), this.to()),
  );

  readonly isDefaultRange = computed(() => {
    const range = defaultMeasurementHistoryRange();
    return this.from() === range.from && this.to() === range.to;
  });

  setFrom(value: string): void {
    if (!value) return;
    const from = value.slice(0, 10);
    this.from.set(from);
    if (this.to() < from) this.to.set(from);
  }

  setTo(value: string): void {
    if (!value) return;
    const to = value.slice(0, 10);
    this.to.set(to);
    if (this.from() > to) this.from.set(to);
  }

  reset(): void {
    const range = defaultMeasurementHistoryRange();
    this.from.set(range.from);
    this.to.set(range.to);
  }

  readonly defaultWeeks = MEASUREMENT_HISTORY_WEEKS;
}
