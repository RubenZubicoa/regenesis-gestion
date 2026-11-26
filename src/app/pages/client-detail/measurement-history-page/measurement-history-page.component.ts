import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';

import type { MeasurementHistorySeries } from '../../../models/measurement';
import { ClientsService } from '../../../services/clients.service';
import { MeasurementsService } from '../../../services/measurements.service';
import { MeasurementHistoryChartComponent } from '../measurement-history-chart/measurement-history-chart.component';

@Component({
  selector: 'app-measurement-history-page',
  standalone: true,
  imports: [RouterLink, MeasurementHistoryChartComponent],
  templateUrl: './measurement-history-page.component.html',
  styleUrl: './measurement-history-page.component.scss',
})
export class MeasurementHistoryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientsApi = inject(ClientsService);
  private readonly measurementsApi = inject(MeasurementsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly clientId = signal('');
  readonly clientName = signal('');
  readonly series = signal<MeasurementHistorySeries[]>([]);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id') ?? '';
          this.clientId.set(id);
          this.loading.set(true);
          this.error.set(null);
          this.series.set([]);
          if (!id) {
            this.loading.set(false);
            this.error.set('Cliente no encontrado.');
            return of(null);
          }
          return forkJoin({
            client: this.clientsApi.get(id),
            series: this.measurementsApi.listHistoryByClient(id),
          });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (payload) => {
          this.loading.set(false);
          if (!payload) return;
          this.clientName.set(payload.client.fullName || payload.client.name);
          this.series.set(payload.series);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.error.set(err.message || 'No se pudo cargar el histórico de medidas.');
        },
      });
  }

  goBack(): void {
    const id = this.clientId();
    if (!id) {
      void this.router.navigate(['/']);
      return;
    }
    void this.router.navigate(['/clients', id], { queryParams: { tab: 'progress' } });
  }
}
