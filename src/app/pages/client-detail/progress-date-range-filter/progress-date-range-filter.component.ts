import { Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  DEFAULT_PROGRESS_WEEKS,
  defaultProgressDateRange,
  progressWeeksLabel,
} from '../../../models/progress-date-range';

@Component({
  selector: 'app-progress-date-range-filter',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './progress-date-range-filter.component.html',
  styleUrl: './progress-date-range-filter.component.scss',
  host: {
    '[class.is-embedded]': 'embedded()',
  },
})
export class ProgressDateRangeFilterComponent {
  readonly from = model.required<string>();
  readonly to = model.required<string>();
  readonly embedded = input(false);
  readonly ariaLabel = input('Rango de fechas');
  readonly hint = input('Rango visible en los gráficos');

  readonly weeksLabel = computed(() => progressWeeksLabel(this.from(), this.to()));

  readonly isDefaultRange = computed(() => {
    const range = defaultProgressDateRange();
    return this.from() === range.from && this.to() === range.to;
  });

  readonly defaultWeeks = DEFAULT_PROGRESS_WEEKS;

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
    const range = defaultProgressDateRange();
    this.from.set(range.from);
    this.to.set(range.to);
  }
}
