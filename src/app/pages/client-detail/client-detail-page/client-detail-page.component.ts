import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { lastDailyStepsChartDays } from '../../../core/normalizers';
import type { Client } from '../../../models/client';
import type { ClientDetail } from '../../../models/client-detail';
import { latestDailyStepsGoal, type DailySteps } from '../../../models/daily-steps';
import type { Macros } from '../../../models/macros';
import type { FilesAttachment } from '../../../models/files-attachment';
import type { Meal, MealSlot } from '../../../models/meal';
import type { MealMaster } from '../../../models/meal-master';
import type { Measurement } from '../../../models/measurement';
import type { ProgressImage } from '../../../models/progress-image';
import type { Supplements } from '../../../models/supplements';
import {
  defaultProgressDateRange,
  filterWeightChartPoints,
  progressWeeksLabel,
} from '../../../models/progress-date-range';
import type { Weight } from '../../../models/weight';
import type { Wellness } from '../../../models/wellness';
import { ClientDetailService } from '../../../services/client-detail.service';
import { MeasurementsDialogComponent } from '../measurements-dialog/measurements-dialog.component';
import { ProgressDateRangeFilterComponent } from '../progress-date-range-filter/progress-date-range-filter.component';
import { ProgressLineChartComponent } from '../progress-line-chart/progress-line-chart.component';
import { ProgressImageEditDialogComponent } from '../progress-image-edit-dialog/progress-image-edit-dialog.component';
import { ProgressImagesDialogComponent } from '../progress-images-dialog/progress-images-dialog.component';
import { StepsDialogComponent } from '../steps-dialog/steps-dialog.component';
import { StepsTargetDialogComponent } from '../steps-target-dialog/steps-target-dialog.component';
import { WellnessDialogComponent } from '../wellness-dialog/wellness-dialog.component';
import { WeightDialogComponent } from '../weight-dialog/weight-dialog.component';
import { WeightTargetDialogComponent } from '../weight-target-dialog/weight-target-dialog.component';
import { PasswordDialogComponent } from '../../clients/password-dialog.component';
import { PhaseDialogComponent } from '../../clients/phase-dialog.component';
import { MacrosDialogComponent } from '../macros-dialog/macros-dialog.component';
import { MealsDialogComponent } from '../meals-dialog/meals-dialog.component';
import { ShoppingListPanelComponent } from '../shopping-list-panel/shopping-list-panel.component';
import { LoadMealPlanDialogComponent } from '../load-meal-plan-dialog/load-meal-plan-dialog.component';
import { RenewPlanDialogComponent } from '../renew-plan-dialog/renew-plan-dialog.component';
import { SupplementsDialogComponent } from '../supplements-dialog/supplements-dialog.component';



type TabKey = 'nutrition' | 'training' | 'progress';



@Component({

  selector: 'app-client-detail-page',

  standalone: true,

  imports: [
    RouterLink,
    MacrosDialogComponent,
    MealsDialogComponent,
    ShoppingListPanelComponent,
    LoadMealPlanDialogComponent,
    SupplementsDialogComponent,
    PasswordDialogComponent,
    PhaseDialogComponent,
    RenewPlanDialogComponent,
    WeightDialogComponent,
    WeightTargetDialogComponent,
    ProgressDateRangeFilterComponent,
    MeasurementsDialogComponent,
    ProgressLineChartComponent,
    WellnessDialogComponent,
    StepsDialogComponent,
    StepsTargetDialogComponent,
    ProgressImagesDialogComponent,
    ProgressImageEditDialogComponent,
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
  readonly passwordDialogOpen = signal(false);
  readonly phaseDialogOpen = signal(false);
  readonly renewPlanDialogOpen = signal(false);
  readonly weightDialogOpen = signal(false);
  readonly weightTargetDialogOpen = signal(false);
  readonly measurementsDialogOpen = signal(false);
  readonly wellnessDialogOpen = signal(false);
  readonly stepsDialogOpen = signal(false);
  readonly stepsDialogDate = signal<string | null>(null);
  readonly stepsTargetDialogOpen = signal(false);
  readonly progressImagesDialogOpen = signal(false);
  readonly progressImageEditOpen = signal(false);
  readonly progressImageEditing = signal<ProgressImage | null>(null);



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

  readonly weightFrom = signal(defaultProgressDateRange().from);
  readonly weightTo = signal(defaultProgressDateRange().to);

  readonly visibleWeightPoints = computed(() => {
    const weight = this.detail()?.weight;
    if (!weight) return [];
    return filterWeightChartPoints(weight, this.weightFrom(), this.weightTo());
  });

  readonly weightWeeksLabel = computed(() =>
    progressWeeksLabel(this.weightFrom(), this.weightTo()),
  );

  readonly visibleWeightStart = computed(() => this.visibleWeightPoints()[0]?.value);

  readonly visibleWeightCurrent = computed(() => {
    const points = this.visibleWeightPoints();
    return points[points.length - 1]?.value;
  });



  readonly stepsChartDays = computed(() =>
    lastDailyStepsChartDays(this.detail()?.dailySteps ?? [], 15),
  );

  readonly hasRecentSteps = computed(() =>
    this.stepsChartDays().some((day) => day.steps > 0),
  );

  readonly stepsGoal = computed(() =>
    latestDailyStepsGoal(this.detail()?.dailySteps ?? []),
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



  constructor() {

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'nutrition' || tab === 'training' || tab === 'progress') {
        this.activeTab.set(tab);
      }
    });

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



  goBack(): void {

    void this.router.navigate(['/']);

  }

  openWeightDialog(): void {
    this.weightDialogOpen.set(true);
  }

  closeWeightDialog(): void {
    this.weightDialogOpen.set(false);
  }

  onWeightSaved(weight: Weight): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, weight });
    }
    this.weightDialogOpen.set(false);
  }

  openWeightTargetDialog(): void {
    this.weightTargetDialogOpen.set(true);
  }

  closeWeightTargetDialog(): void {
    this.weightTargetDialogOpen.set(false);
  }

  onWeightTargetSaved(weight: Weight): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, weight });
    }
    this.weightTargetDialogOpen.set(false);
  }

  hasRecordedMeasurements(items: Measurement[]): boolean {
    return items.some((item) => Boolean(item._id));
  }

  openMeasurementsDialog(): void {
    this.measurementsDialogOpen.set(true);
  }

  closeMeasurementsDialog(): void {
    this.measurementsDialogOpen.set(false);
  }

  onMeasurementsSaved(updated: Measurement[]): void {
    const current = this.detail();
    if (current) {
      const byId = new Map(updated.map((item) => [item.MeasurementId, item]));
      this.detail.set({
        ...current,
        measurements: current.measurements.map((item) => {
          const saved = byId.get(item.MeasurementId);
          if (!saved) return item;
          if (!item._id || saved.date >= item.date) return saved;
          return item;
        }),
      });
    }
    this.measurementsDialogOpen.set(false);
  }

  hasRecordedWellness(items: Wellness[]): boolean {
    return items.some((item) => Boolean(item._id));
  }

  openWellnessDialog(): void {
    this.wellnessDialogOpen.set(true);
  }

  closeWellnessDialog(): void {
    this.wellnessDialogOpen.set(false);
  }

  onWellnessSaved(updated: Wellness[]): void {
    const current = this.detail();
    if (current) {
      const byId = new Map(updated.map((item) => [item.wellnessId, item]));
      this.detail.set({
        ...current,
        wellness: current.wellness.map((item) => {
          const saved = byId.get(item.wellnessId);
          if (!saved) return item;
          if (!item._id || saved.date >= item.date) return saved;
          return item;
        }),
      });
    }
    this.wellnessDialogOpen.set(false);
  }

  hasRecordedSteps(items: DailySteps[]): boolean {
    return items.some((item) => Boolean(item._id));
  }

  openStepsDialog(date?: string): void {
    this.stepsDialogDate.set(date ?? null);
    this.stepsDialogOpen.set(true);
  }

  closeStepsDialog(): void {
    this.stepsDialogOpen.set(false);
    this.stepsDialogDate.set(null);
  }

  onStepsSaved(records: DailySteps[]): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, dailySteps: records });
    }
    this.closeStepsDialog();
  }

  openStepsTargetDialog(): void {
    this.stepsTargetDialogOpen.set(true);
  }

  closeStepsTargetDialog(): void {
    this.stepsTargetDialogOpen.set(false);
  }

  onStepsTargetSaved(records: DailySteps[]): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, dailySteps: records });
    }
    this.closeStepsTargetDialog();
  }

  openProgressImagesDialog(): void {
    this.progressImagesDialogOpen.set(true);
  }

  closeProgressImagesDialog(): void {
    this.progressImagesDialogOpen.set(false);
  }

  onProgressImagesSaved(images: ProgressImage[]): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, progressImages: images });
    }
    this.closeProgressImagesDialog();
    this.closeProgressImageEditDialog();
  }

  openProgressImageEditDialog(image: ProgressImage): void {
    this.progressImageEditing.set(image);
    this.progressImageEditOpen.set(true);
  }

  closeProgressImageEditDialog(): void {
    this.progressImageEditOpen.set(false);
    this.progressImageEditing.set(null);
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

  onFilesAttachmentSaved(filesAttachment: FilesAttachment): void {
    const current = this.detail();
    if (current) {
      this.detail.set({ ...current, filesAttachment });
    }
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

  onPlanRenewed(): void {
    this.renewPlanDialogOpen.set(false);
    this.reloadDetail();
  }

  private reloadDetail(): void {
    const id = this.detail()?.client._id ?? this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.clientDetailService.loadDetail(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.error.set(detail ? null : 'Cliente no encontrado.');
      },
      error: (err: Error) => {
        this.error.set(err.message);
      },
    });
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

