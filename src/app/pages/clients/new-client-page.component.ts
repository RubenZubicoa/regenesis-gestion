import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, throwError, type Observable } from 'rxjs';

import type { Client } from '../../models/client';
import type { Measurement, MeasurementMaster } from '../../models/measurement';
import {
  PROGRESS_IMAGE_POSES,
  type ProgressImagePose,
} from '../../models/progress-image';
import {
  DAILY_RECALL_ENTRY_FIELDS,
  DAILY_RECALL_MEALS,
  EATING_HABITS_FIELDS,
  EXERCISE_HABITS_FIELDS,
  LIFESTYLE_FIELDS,
  PERSONAL_HISTORY_FIELDS,
  emptyDailyRecall,
  emptyEatingHabits,
  emptyExerciseHabits,
  emptyLifestyle,
  emptyPersonalHistory,
  hasTechnicalSpecContent,
  type DailyRecall,
  type DailyRecallEntry,
  type EatingHabits,
  type ExerciseHabits,
  type Lifestyle,
  type PersonalHistory,
} from '../../models/technical-specifications';
import { ClientsService } from '../../services/clients.service';
import { MeasurementsService } from '../../services/measurements.service';
import { ProgressImagesService } from '../../services/progress-images.service';
import { TechnicalSpecificationsService } from '../../services/technical-specifications.service';

type SpecGroupKey = 'personalHistory' | 'eatingHabits' | 'lifestyle' | 'exerciseHabits';

type ProgressDraft = {
  file: File | null;
  preview: string;
  name: string;
  existingId?: string;
};

function emptyProgressDrafts(): Record<ProgressImagePose, ProgressDraft> {
  return {
    'De frente': { file: null, preview: '', name: '' },
    Lateral: { file: null, preview: '', name: '' },
    'De espaldas': { file: null, preview: '', name: '' },
  };
}

const DEFAULT_COACH = 'Onatz Health Coach';
const DEFAULT_PLAN = 'Método Regenesis';
const DEFAULT_TOTAL_WEEKS = 12;
const DEFAULT_TOTAL_PHASES = 3;

@Component({
  selector: 'app-new-client-page',
  standalone: true,
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './new-client-page.component.html',
  styleUrl: './new-client-page.component.scss',
})
export class NewClientPageComponent implements OnInit, OnDestroy {
  private readonly clients = inject(ClientsService);
  private readonly measurementsApi = inject(MeasurementsService);
  private readonly progressImagesApi = inject(ProgressImagesService);
  private readonly specsApi = inject(TechnicalSpecificationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isEdit = signal(false);
  readonly clientId = signal<string | null>(null);
  readonly pageLoading = signal(false);
  readonly pageError = signal<string | null>(null);
  private originalClient: Client | null = null;
  private existingSpecId: string | null = null;
  private existingMeasurements: Record<string, Measurement> = {};
  private readonly progressToDelete = new Set<string>();

  readonly poses = PROGRESS_IMAGE_POSES;
  readonly personalHistoryFields = PERSONAL_HISTORY_FIELDS;
  readonly eatingHabitsFields = EATING_HABITS_FIELDS;
  readonly lifestyleFields = LIFESTYLE_FIELDS;
  readonly exerciseHabitsFields = EXERCISE_HABITS_FIELDS;
  readonly dailyRecallMeals = DAILY_RECALL_MEALS;
  readonly dailyRecallEntryFields = DAILY_RECALL_ENTRY_FIELDS;

  readonly fullName = signal('');
  readonly email = signal('');
  readonly telefono = signal('');
  readonly password = signal('');
  readonly goal = signal('');
  readonly coach = signal(DEFAULT_COACH);
  readonly plan = signal(DEFAULT_PLAN);
  readonly startDate = signal(toDateInput(new Date()));
  readonly endDate = signal(toDateInput(addWeeks(new Date(), DEFAULT_TOTAL_WEEKS)));
  readonly totalWeeks = signal(DEFAULT_TOTAL_WEEKS);
  readonly avatar = signal('');
  readonly avatarFile = signal<File | null>(null);
  readonly avatarName = signal('');
  private objectUrl: string | null = null;

  readonly progressDrafts = signal<Record<ProgressImagePose, ProgressDraft>>(emptyProgressDrafts());
  private readonly progressObjectUrls = new Map<ProgressImagePose, string>();

  readonly masters = signal<MeasurementMaster[]>([]);
  readonly measureValues = signal<Record<string, string>>({});
  readonly mastersLoading = signal(true);
  readonly mastersError = signal<string | null>(null);

  readonly personalHistory = signal<PersonalHistory>(emptyPersonalHistory());
  readonly eatingHabits = signal<EatingHabits>(emptyEatingHabits());
  readonly lifestyle = signal<Lifestyle>(emptyLifestyle());
  readonly exerciseHabits = signal<ExerciseHabits>(emptyExerciseHabits());
  readonly expectations = signal('');
  readonly dailyRecall = signal<DailyRecall>(emptyDailyRecall());
  readonly extraNotes = signal('');

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadMasters();
      return;
    }

    this.isEdit.set(true);
    this.clientId.set(id);
    this.pageLoading.set(true);
    this.loadEdit(id);
  }

  ngOnDestroy(): void {
    this.revokePreview();
    this.revokeAllProgressPreviews();
  }

  progressDraft(pose: ProgressImagePose): ProgressDraft {
    return this.progressDrafts()[pose];
  }

  poseInputId(pose: ProgressImagePose): string {
    return `progress-${pose.toLowerCase().replace(/\s+/g, '-')}`;
  }

  onProgressSelected(pose: ProgressImagePose, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.saveError.set(`El archivo de «${pose}» debe ser una imagen.`);
      input.value = '';
      return;
    }

    const previous = this.progressDrafts()[pose];
    this.revokeProgressPreview(pose);
    const preview = URL.createObjectURL(file);
    this.progressObjectUrls.set(pose, preview);
    this.progressDrafts.update((current) => ({
      ...current,
      [pose]: {
        file,
        preview,
        name: file.name,
        existingId: previous.existingId,
      },
    }));
    this.saveError.set(null);
  }

  clearProgress(pose: ProgressImagePose, input: HTMLInputElement): void {
    const current = this.progressDrafts()[pose];
    if (current.existingId) this.progressToDelete.add(current.existingId);
    this.revokeProgressPreview(pose);
    this.progressDrafts.update((drafts) => ({
      ...drafts,
      [pose]: { file: null, preview: '', name: '' },
    }));
    input.value = '';
  }

  measureValue(masterId: string): string {
    return this.measureValues()[masterId] ?? '';
  }

  updateMeasure(masterId: string, value: string | number | null): void {
    const next = value == null || value === '' ? '' : String(value);
    this.measureValues.update((current) => ({ ...current, [masterId]: next }));
  }

  specValue(group: SpecGroupKey, key: string): string {
    return String(this.specGroup(group)[key] ?? '');
  }

  patchSpec(group: SpecGroupKey, key: string, value: string): void {
    const next = value ?? '';
    if (group === 'personalHistory') {
      this.personalHistory.update((current) => ({ ...current, [key]: next }));
      return;
    }
    if (group === 'eatingHabits') {
      this.eatingHabits.update((current) => ({ ...current, [key]: next }));
      return;
    }
    if (group === 'lifestyle') {
      this.lifestyle.update((current) => ({ ...current, [key]: next }));
      return;
    }
    this.exerciseHabits.update((current) => ({ ...current, [key]: next }));
  }

  recallValue(meal: keyof DailyRecall, field: keyof DailyRecallEntry): string {
    return this.dailyRecall()[meal][field] ?? '';
  }

  patchRecall(meal: keyof DailyRecall, field: keyof DailyRecallEntry, value: string): void {
    this.dailyRecall.update((current) => ({
      ...current,
      [meal]: { ...current[meal], [field]: value ?? '' },
    }));
  }

  private specGroup(group: SpecGroupKey): Record<string, string> {
    if (group === 'personalHistory') return this.personalHistory();
    if (group === 'eatingHabits') return this.eatingHabits();
    if (group === 'lifestyle') return this.lifestyle();
    return this.exerciseHabits();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.saveError.set('El archivo debe ser una imagen.');
      input.value = '';
      return;
    }

    this.revokePreview();
    this.objectUrl = URL.createObjectURL(file);
    this.avatarFile.set(file);
    this.avatarName.set(file.name);
    this.avatar.set(this.objectUrl);
    this.saveError.set(null);
  }

  onStartDate(value: string): void {
    this.startDate.set(value);
    this.syncTotalWeeks();
  }

  onEndDate(value: string): void {
    this.endDate.set(value);
    this.syncTotalWeeks();
  }

  save(): void {
    const fullName = this.fullName().trim();
    const email = this.email().trim();
    const telefono = this.telefono().trim();
    const password = this.password();
    const goal = this.goal().trim();
    const coach = this.coach().trim();
    const plan = this.plan().trim();
    const startDate = this.startDate().trim();
    const endDate = this.endDate().trim();
    const totalWeeks = Number(this.totalWeeks());
    const avatarFile = this.avatarFile();

    if (!fullName) {
      this.saveError.set('El nombre completo es obligatorio.');
      return;
    }
    if (!email) {
      this.saveError.set('El email es obligatorio.');
      return;
    }
    if (!isValidEmail(email)) {
      this.saveError.set('El email no es válido.');
      return;
    }
    if (!this.isEdit()) {
      if (!password.trim()) {
        this.saveError.set('La contraseña es obligatoria.');
        return;
      }
      if (password.trim().length < 6) {
        this.saveError.set('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }
    if (!goal) {
      this.saveError.set('El objetivo es obligatorio.');
      return;
    }
    if (!coach) {
      this.saveError.set('El coach es obligatorio.');
      return;
    }
    if (!plan) {
      this.saveError.set('El plan es obligatorio.');
      return;
    }
    if (!startDate || !endDate) {
      this.saveError.set('Indica las fechas de inicio y fin.');
      return;
    }
    if (endDate < startDate) {
      this.saveError.set('La fecha de fin no puede ser anterior al inicio.');
      return;
    }
    if (!Number.isFinite(totalWeeks) || totalWeeks < 1) {
      this.saveError.set('Las semanas totales deben ser al menos 1.');
      return;
    }

    const invalidMeasure = this.masters().find((master) => {
      const raw = this.measureValue(master._id).trim();
      if (!raw) return false;
      const parsed = Number(raw.replace(',', '.'));
      return !Number.isFinite(parsed) || parsed < 0;
    });
    if (invalidMeasure) {
      this.saveError.set(`La medida «${invalidMeasure.label}» no es válida.`);
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const request$ = this.isEdit()
      ? this.updateClient({
          fullName,
          email,
          telefono,
          goal,
          coach,
          plan,
          startDate,
          endDate,
          totalWeeks,
          avatarFile,
        })
      : this.clients.create({
          name: firstNameFrom(fullName),
          fullName,
          email,
          telefono,
          password: password.trim(),
          goal,
          coach,
          plan,
          startDate,
          endDate,
          week: 1,
          totalWeeks,
          phase: 1,
          totalPhases: DEFAULT_TOTAL_PHASES,
          avatar: avatarFile ? undefined : defaultAvatar(fullName),
          avatarFile: avatarFile ?? undefined,
        });

    request$
      .pipe(
        switchMap((client) =>
          forkJoin({
            measures: this.saveMeasurements(client._id, startDate),
            images: this.saveProgressImages(client._id),
            specs: this.saveTechnicalSpecs(client._id),
          }).pipe(map((): typeof client => client)),
        ),
      )
      .subscribe({
        next: (client) => {
          this.saving.set(false);
          void this.router.navigate(['/clients', client._id]);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.saveError.set(err.message);
        },
      });
  }

  private loadMasters(): void {
    this.measurementsApi.listMasters().subscribe({
      next: (items) => {
        this.masters.set(items);
        this.mastersLoading.set(false);
      },
      error: (err: Error) => {
        this.mastersError.set(err.message || 'No se pudieron cargar los tipos de medida.');
        this.mastersLoading.set(false);
      },
    });
  }

  private loadEdit(id: string): void {
    forkJoin({
      client: this.clients.get(id),
      masters: this.measurementsApi.listMasters().pipe(
        catchError((err: Error) => {
          this.mastersError.set(err.message || 'No se pudieron cargar los tipos de medida.');
          return of([] as MeasurementMaster[]);
        }),
      ),
      measurements: this.measurementsApi.listByClient(id).pipe(catchError(() => of([]))),
      images: this.progressImagesApi.listByClient(id).pipe(catchError(() => of([]))),
      specs: this.specsApi.getByClient(id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ client, masters, measurements, images, specs }) => {
        this.originalClient = client;
        this.fullName.set(client.fullName);
        this.email.set(client.email);
        this.telefono.set(client.telefono ?? '');
        this.goal.set(client.goal);
        this.coach.set(client.coach || DEFAULT_COACH);
        this.plan.set(client.plan || DEFAULT_PLAN);
        this.startDate.set(client.startDate.slice(0, 10));
        this.endDate.set(client.endDate.slice(0, 10));
        this.totalWeeks.set(client.totalWeeks || DEFAULT_TOTAL_WEEKS);
        this.avatar.set(client.avatar);
        this.avatarName.set(client.avatar ? 'Imagen actual' : '');

        this.masters.set(masters);
        this.mastersLoading.set(false);

        const measureValues: Record<string, string> = {};
        const existing: Record<string, Measurement> = {};
        for (const item of measurements) {
          existing[item.MeasurementId] = item;
          measureValues[item.MeasurementId] = String(item.value);
        }
        this.existingMeasurements = existing;
        this.measureValues.set(measureValues);

        const drafts = emptyProgressDrafts();
        const latest = this.progressImagesApi.latestByPose(images);
        for (const pose of this.poses) {
          const image = latest[pose];
          if (!image) continue;
          drafts[pose] = {
            file: null,
            preview: image.image,
            name: 'Imagen actual',
            existingId: image._id,
          };
        }
        this.progressDrafts.set(drafts);

        if (specs) {
          this.existingSpecId = specs._id;
          this.personalHistory.set(specs.personalHistory);
          this.eatingHabits.set(specs.eatingHabits);
          this.lifestyle.set(specs.lifestyle);
          this.exerciseHabits.set(specs.exerciseHabits);
          this.dailyRecall.set(specs.dailyRecall);
          this.expectations.set(specs.expectations ?? '');
          this.extraNotes.set(specs.observations ?? '');
        }

        this.pageLoading.set(false);
      },
      error: (err: Error) => {
        this.pageError.set(err.message || 'No se pudo cargar la ficha del cliente.');
        this.pageLoading.set(false);
        this.mastersLoading.set(false);
      },
    });
  }

  private updateClient(input: {
    fullName: string;
    email: string;
    telefono: string;
    goal: string;
    coach: string;
    plan: string;
    startDate: string;
    endDate: string;
    totalWeeks: number;
    avatarFile: File | null;
  }): Observable<Client> {
    const current = this.originalClient;
    if (!current) {
      return throwError(() => new Error('No se encontró el cliente a editar.'));
    }

    return this.clients.update(current._id, {
      name: firstNameFrom(input.fullName),
      fullName: input.fullName,
      email: input.email,
      telefono: input.telefono,
      goal: input.goal,
      coach: input.coach,
      plan: input.plan,
      program: current.program,
      startDate: input.startDate,
      endDate: input.endDate,
      week: current.week,
      totalWeeks: input.totalWeeks,
      phase: current.phase,
      totalPhases: current.totalPhases,
      avatar: input.avatarFile ? undefined : this.avatar() || current.avatar,
      avatarFile: input.avatarFile ?? undefined,
    });
  }

  private saveMeasurements(clientId: string, date: string): Observable<void> {
    const jobs = this.masters()
      .map((master) => {
        const raw = this.measureValue(master._id).trim();
        if (!raw) return null;
        const value = Number(raw.replace(',', '.'));
        if (!Number.isFinite(value)) return null;
        const current = this.existingMeasurements[master._id];
        if (current) {
          if (current.value === value) return null;
          return this.measurementsApi.update(current._id, {
            value,
            delta: current.delta,
            date: current.date,
          });
        }
        return this.measurementsApi.create({
          client: clientId,
          MeasurementId: master._id,
          value,
          delta: 0,
          date,
        });
      })
      .filter((job): job is NonNullable<typeof job> => job != null);

    if (jobs.length === 0) return of(undefined);
    return forkJoin(jobs.map((job) => job.pipe(catchError(() => of(null))))).pipe(
      map(() => undefined),
    );
  }

  private saveProgressImages(clientId: string): Observable<void> {
    const jobs: Observable<unknown>[] = [];

    for (const pose of this.poses) {
      const draft = this.progressDrafts()[pose];
      if (!draft.file) continue;
      if (draft.existingId) this.progressToDelete.add(draft.existingId);
      jobs.push(this.progressImagesApi.create(clientId, draft.file, pose));
    }

    for (const id of this.progressToDelete) {
      jobs.push(this.progressImagesApi.remove(id));
    }

    if (jobs.length === 0) return of(undefined);
    return forkJoin(jobs.map((job) => job.pipe(catchError(() => of(null))))).pipe(
      map(() => undefined),
    );
  }

  private saveTechnicalSpecs(clientId: string): Observable<void> {
    const payload = {
      clientId,
      personalHistory: this.personalHistory(),
      eatingHabits: this.eatingHabits(),
      lifestyle: this.lifestyle(),
      exerciseHabits: this.exerciseHabits(),
      dailyRecall: this.dailyRecall(),
      expectations: this.expectations().trim(),
      observations: this.extraNotes().trim(),
    };

    if (this.existingSpecId) {
      return this.specsApi.update(this.existingSpecId, payload).pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      );
    }

    if (!hasTechnicalSpecContent(payload)) return of(undefined);
    return this.specsApi.create(payload).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  private revokeProgressPreview(pose: ProgressImagePose): void {
    const url = this.progressObjectUrls.get(pose);
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    this.progressObjectUrls.delete(pose);
  }

  private revokeAllProgressPreviews(): void {
    for (const pose of this.poses) {
      this.revokeProgressPreview(pose);
    }
  }

  private syncTotalWeeks(): void {
    const weeks = weeksBetween(this.startDate(), this.endDate());
    if (weeks != null) this.totalWeeks.set(weeks);
  }

  private revokePreview(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}

function firstNameFrom(fullName: string): string {
  return fullName.split(/\s+/).find((part) => part.length > 0) ?? fullName;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addWeeks(d: Date, weeks: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function weeksBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const from = new Date(`${start}T12:00:00`);
  const to = new Date(`${end}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return null;
  }
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(days / 7));
}

function defaultAvatar(fullName: string): string {
  const name = encodeURIComponent(fullName || 'Cliente');
  return `https://ui-avatars.com/api/?name=${name}&background=0A1B33&color=F2C868&size=400`;
}
