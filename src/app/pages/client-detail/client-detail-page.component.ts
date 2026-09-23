import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { lastDailyStepsChartDays } from '../../core/normalizers';
import type { Client } from '../../models/client';
import type { ClientDetail } from '../../models/client-detail';
import type { Macros } from '../../models/macros';
import type { Meal, MealSlot } from '../../models/meal';
import type { MealMaster } from '../../models/meal-master';
import type { Supplements } from '../../models/supplements';
import type { Weight } from '../../models/weight';
import { ClientDetailService } from '../../services/client-detail.service';
import { ClientDialogComponent } from '../clients/client-dialog.component';
import { PasswordDialogComponent } from '../clients/password-dialog.component';
import { PhaseDialogComponent } from '../clients/phase-dialog.component';
import { MacrosDialogComponent } from './macros-dialog.component';
import { MealsDialogComponent } from './meals-dialog.component';
import { LoadMealPlanDialogComponent } from './load-meal-plan-dialog.component';
import { RenewPlanDialogComponent } from './renew-plan-dialog.component';
import { SupplementsDialogComponent } from './supplements-dialog.component';



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

  imports: [
    RouterLink,
    MacrosDialogComponent,
    MealsDialogComponent,
    LoadMealPlanDialogComponent,
    SupplementsDialogComponent,
    ClientDialogComponent,
    PasswordDialogComponent,
    PhaseDialogComponent,
    RenewPlanDialogComponent,
  ],

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

  readonly mealsDialogOpen = signal(false);
  readonly loadMealPlanOpen = signal(false);
  readonly mealSeed = signal<MealSlot[] | null>(null);

  readonly supplementsDialogOpen = signal(false);
  readonly personalDialogOpen = signal(false);
  readonly passwordDialogOpen = signal(false);
  readonly phaseDialogOpen = signal(false);
  readonly renewPlanDialogOpen = signal(false);



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



  readonly stepsChartDays = computed(() =>
    lastDailyStepsChartDays(this.detail()?.dailySteps ?? [], 15),
  );

  readonly hasRecentSteps = computed(() =>
    this.stepsChartDays().some((day) => day.steps > 0),
  );

  readonly maxSteps = computed(() => {
    const days = this.stepsChartDays();
    return Math.max(...days.map((d) => d.steps), 1);
  });



  readonly workoutsThisWeekCount = computed(() => {
    const items = this.detail()?.workoutHistory ?? [];
    return items.filter((item) => isInCurrentIsoWeek(item.date)).length;
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

  macroTarget(macros: Macros, key: string): number {
    return macros.items.find((item) => item.key === key)?.target ?? 0;
  }

  macrosEstimatedKcal(macros: Macros): number {
    return (
      this.macroTarget(macros, 'prot') * 4 +
      this.macroTarget(macros, 'carbs') * 4 +
      this.macroTarget(macros, 'fats') * 9
    );
  }

  macrosMixGradient(macros: Macros): string {
    const protein = this.macroTarget(macros, 'prot') * 4;
    const carbs = this.macroTarget(macros, 'carbs') * 4;
    const fats = this.macroTarget(macros, 'fats') * 9;
    const total = protein + carbs + fats;
    if (total <= 0) {
      return 'conic-gradient(#1c3358 0deg, #1c3358 360deg)';
    }
    const proteinEnd = (protein / total) * 360;
    const carbsEnd = proteinEnd + (carbs / total) * 360;
    return `conic-gradient(#f2c868 0deg ${proteinEnd}deg, #4c8df6 ${proteinEnd}deg ${carbsEnd}deg, #12b5a5 ${carbsEnd}deg 360deg)`;
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

  formatSteps(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(value);
  }

  formatReviewDate(raw: string): string {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    return raw;
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

  onMacrosDeleted(): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, macros: null });
    }
    this.macrosDialogOpen.set(false);
  }

  openMealsDialog(): void {
    if (!this.detail()?.meal) {
      this.mealSeed.set(null);
      this.loadMealPlanOpen.set(true);
      return;
    }
    this.mealSeed.set(null);
    this.mealsDialogOpen.set(true);
  }

  closeLoadMealPlan(): void {
    this.loadMealPlanOpen.set(false);
  }

  startBlankMealPlan(): void {
    this.mealSeed.set(null);
    this.loadMealPlanOpen.set(false);
    this.mealsDialogOpen.set(true);
  }

  useMealPlanTemplate(plan: MealMaster): void {
    this.mealSeed.set(plan.slots);
    this.loadMealPlanOpen.set(false);
    this.mealsDialogOpen.set(true);
  }

  closeMealsDialog(): void {
    this.mealsDialogOpen.set(false);
    this.mealSeed.set(null);
  }

  onMealsSaved(meal: Meal): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, meal });
    }
    this.closeMealsDialog();
  }

  onMealsDeleted(): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, meal: null });
    }
    this.closeMealsDialog();
  }

  openSupplementsDialog(): void {
    this.supplementsDialogOpen.set(true);
  }

  closeSupplementsDialog(): void {
    this.supplementsDialogOpen.set(false);
  }

  onSupplementsSaved(supplements: Supplements): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, supplements });
    }
    this.supplementsDialogOpen.set(false);
  }

  openRoutineManager(): void {
    const id = this.detail()?.client._id;
    if (!id) return;
    void this.router.navigate(['/clients', id, 'rutina']);
  }

  openPersonalDialog(): void {
    this.personalDialogOpen.set(true);
  }

  closePersonalDialog(): void {
    this.personalDialogOpen.set(false);
  }

  onPersonalSaved(client: Client): void {
    const current = this.detail();
    if (current) {
      this.detail.set({
        ...current,
        client: { ...current.client, ...client },
      });
    }
    this.personalDialogOpen.set(false);
  }

  openPasswordDialog(): void {
    this.passwordDialogOpen.set(true);
  }

  closePasswordDialog(): void {
    this.passwordDialogOpen.set(false);
  }

  onPasswordSaved(): void {
    this.passwordDialogOpen.set(false);
  }

  openPhaseDialog(): void {
    this.phaseDialogOpen.set(true);
  }

  closePhaseDialog(): void {
    this.phaseDialogOpen.set(false);
  }

  onPhaseSaved(client: Client): void {
    const current = this.detail();
    if (current) {
      this.detail.set({
        ...current,
        client: { ...current.client, ...client },
      });
    }
    this.phaseDialogOpen.set(false);
  }

  openRenewPlanDialog(): void {
    this.renewPlanDialogOpen.set(true);
  }

  closeRenewPlanDialog(): void {
    this.renewPlanDialogOpen.set(false);
  }

  onPlanRenewed(client: Client): void {
    const current = this.detail();
    if (current) {
      this.detail.set({
        ...current,
        client: { ...current.client, ...client },
      });
    }
    this.renewPlanDialogOpen.set(false);
  }

}

function isInCurrentIsoWeek(isoDate: string): boolean {
  const date = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const start = startOfIsoWeek(new Date());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function startOfIsoWeek(value: Date): Date {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const weekday = date.getDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  date.setDate(date.getDate() - offset);
  return date;
}

