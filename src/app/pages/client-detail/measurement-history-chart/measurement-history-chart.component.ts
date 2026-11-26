import { Component, computed, input } from '@angular/core';

import type { MeasurementHistorySeries } from '../../../models/measurement';
import { ProgressLineChartComponent } from '../progress-line-chart/progress-line-chart.component';

@Component({
  selector: 'app-measurement-history-chart',
  standalone: true,
  imports: [ProgressLineChartComponent],
  templateUrl: './measurement-history-chart.component.html',
  styleUrl: './measurement-history-chart.component.scss',
})
export class MeasurementHistoryChartComponent {
  readonly series = input.required<MeasurementHistorySeries>();

  readonly points = computed(() =>
    this.series().records.map((record) => ({
      label: record.date,
      value: record.value,
    })),
  );

  readonly start = computed(() => this.series().records[0]?.value ?? 0);
  readonly current = computed(
    () => this.series().records[this.series().records.length - 1]?.value ?? 0,
  );
}
