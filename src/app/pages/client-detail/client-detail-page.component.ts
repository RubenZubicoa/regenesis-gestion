import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import type { ClientDetail } from '../../models/client-detail';
import type { MacroItem, Macros } from '../../models/macros';
import type { Weight } from '../../models/weight';
import { ClientDetailService } from '../../services/client-detail.service';
import { MacrosDialogComponent } from './macros-dialog.component';



type TabKey = 'nutrition' | 'training' | 'progress';



interface WeightChartPoint {

  x: number;

  y: number;

  value: number;

  label: string;

}



export interface WeightChartView {

  width: number;

  height: number;

  points: WeightChartPoint[];

  linePath: string;

  areaPath: string;

  targetY: number;

  yTicks: { y: number; label: string }[];

}



@Component({

  selector: 'app-client-detail-page',

  standalone: true,

  imports: [RouterLink, MacrosDialogComponent],

  templateUrl: './client-detail-page.component.html',

  styleUrl: './client-detail-page.component.scss',

})

export class ClientDetailPageComponent {

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly clientDetailService = inject(ClientDetailService);



  readonly activeTab = signal<TabKey>('nutrition');

  readonly loading = signal(true);

  readonly error = signal<string | null>(null);

  readonly detail = signal<ClientDetail | null>(null);

  readonly macrosDialogOpen = signal(false);



  readonly weekProgress = computed(() => {

    const d = this.detail();

    if (!d) return 0;

    return Math.min(100, Math.round((d.client.week / d.client.totalWeeks) * 100));

  });



  readonly weightDelta = computed(() => {

    const w = this.detail()?.weight;

    if (!w) return null;

    return Number((w.current - w.start).toFixed(1));

  });



  readonly maxSteps = computed(() => {

    const days = this.detail()?.dailySteps?.days ?? [];

    return Math.max(...days.map((d) => d.value), 1);

  });



  readonly routineDoneCount = computed(() => {

    const days = this.detail()?.routineDays ?? [];

    return days.filter((day) => day.done).length;

  });



  readonly routineTotalCount = computed(() => this.detail()?.routineDays.length ?? 0);



  private readonly chartWidth = 400;

  private readonly chartHeight = 180;

  private readonly chartPad = { top: 24, right: 20, bottom: 32, left: 44 };



  constructor() {

    this.route.paramMap

      .pipe(

        switchMap((params) => {

          const id = params.get('id');

          this.loading.set(true);

          this.error.set(null);

          this.detail.set(null);

          if (!id) {
            this.loading.set(false);
            return of(null);
          }

          return this.clientDetailService.loadDetail(id);

        }),

        takeUntilDestroyed(),

      )

      .subscribe({

        next: (detail) => {

          this.detail.set(detail);

          this.loading.set(false);

          if (!detail) {

            this.error.set('Cliente no encontrado.');

          }

        },

        error: (err: Error) => {

          this.error.set(err.message);

          this.loading.set(false);

        },

      });

  }



  setTab(tab: TabKey): void {

    this.activeTab.set(tab);

  }



  macroPct(item: MacroItem): number {

    return Math.min(100, Math.round((item.grams / item.target) * 100));

  }



  macroToneClass(tone: string): string {

    return `tone-${tone}`;

  }



  deltaClass(delta: number): string {

    if (delta < 0) return 'down';

    if (delta > 0) return 'up';

    return '';

  }



  formatDate(iso: string): string {

    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);

    if (Number.isNaN(d.getTime())) return iso;

    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  }



  reviewStatusLabel(status: string): string {

    switch (status) {

      case 'upcoming':

        return 'Próxima';

      case 'done':

        return 'Hecha';

      case 'canceled':

        return 'Cancelada';

      default:

        return status;

    }

  }



  buildWeightChart(w: Weight): WeightChartView {

    const min = Math.min(...w.data, w.target) - 0.8;

    const max = Math.max(...w.data, w.start) + 0.8;

    const range = max - min || 1;

    const innerW = this.chartWidth - this.chartPad.left - this.chartPad.right;

    const innerH = this.chartHeight - this.chartPad.top - this.chartPad.bottom;

    const count = w.data.length;

    const baseline = this.chartHeight - this.chartPad.bottom;



    const points: WeightChartPoint[] = w.data.map((value, i) => ({

      x:

        this.chartPad.left +

        (count === 1 ? innerW / 2 : (i / (count - 1)) * innerW),

      y: this.chartPad.top + innerH - ((value - min) / range) * innerH,

      value,

      label: w.labels[i] ?? '',

    }));



    const linePath =

      points.length > 0

        ? points

            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)

            .join(' ')

        : '';



    const areaPath =

      points.length > 0

        ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`

        : '';



    const targetY =

      this.chartPad.top + innerH - ((w.target - min) / range) * innerH;



    const steps = 4;

    const yTicks = Array.from({ length: steps + 1 }, (_, i) => {

      const val = min + ((max - min) * i) / steps;

      const y = this.chartPad.top + innerH - ((val - min) / range) * innerH;

      return { y, label: val.toFixed(1) };

    });



    return {

      width: this.chartWidth,

      height: this.chartHeight,

      points,

      linePath,

      areaPath,

      targetY,

      yTicks,

    };

  }



  goBack(): void {

    void this.router.navigate(['/']);

  }

  openMacrosDialog(): void {
    this.macrosDialogOpen.set(true);
  }

  closeMacrosDialog(): void {
    this.macrosDialogOpen.set(false);
  }

  onMacrosSaved(macros: Macros): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, macros });
    }
    this.macrosDialogOpen.set(false);
  }

}

