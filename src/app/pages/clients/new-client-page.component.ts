import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, type Observable } from 'rxjs';

import type { MeasurementMaster } from '../../models/measurement';
import {
  PROGRESS_IMAGE_POSES,
  type ProgressImagePose,
} from '../../models/progress-image';
import { ClientsService } from '../../services/clients.service';
import { MeasurementsService } from '../../services/measurements.service';
import { ProgressImagesService } from '../../services/progress-images.service';

type ProgressDraft = {
  file: File | null;
  preview: string;
  name: string;
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
  imports: [FormsModule, RouterLink],
  templateUrl: './new-client-page.component.html',
  styleUrl: './new-client-page.component.scss',
})
export class NewClientPageComponent implements OnInit, OnDestroy {
  private readonly clients = inject(ClientsService);
  private readonly measurementsApi = inject(MeasurementsService);
  private readonly progressImagesApi = inject(ProgressImagesService);
  private readonly router = inject(Router);

  readonly poses = PROGRESS_IMAGE_POSES;

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

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
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

    this.revokeProgressPreview(pose);
    const preview = URL.createObjectURL(file);
    this.progressObjectUrls.set(pose, preview);
    this.progressDrafts.update((current) => ({
      ...current,
      [pose]: { file, preview, name: file.name },
    }));
    this.saveError.set(null);
  }

  clearProgress(pose: ProgressImagePose, input: HTMLInputElement): void {
    this.revokeProgressPreview(pose);
    this.progressDrafts.update((current) => ({
      ...current,
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
    if (!telefono) {
      this.saveError.set('El teléfono es obligatorio.');
      return;
    }
    if (!password.trim()) {
      this.saveError.set('La contraseña es obligatoria.');
      return;
    }
    if (password.trim().length < 6) {
      this.saveError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
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

    this.clients
      .create({
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
      })
      .pipe(
        switchMap((client) =>
          forkJoin({
            measures: this.saveInitialMeasurements(client._id, startDate),
            images: this.saveInitialProgressImages(client._id),
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

  private saveInitialMeasurements(clientId: string, date: string): Observable<void> {
    const jobs = this.masters()
      .map((master) => {
        const raw = this.measureValue(master._id).trim();
        if (!raw) return null;
        const value = Number(raw.replace(',', '.'));
        if (!Number.isFinite(value)) return null;
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

  private saveInitialProgressImages(clientId: string): Observable<void> {
    const jobs = this.poses
      .map((pose) => {
        const file = this.progressDrafts()[pose].file;
        if (!file) return null;
        return this.progressImagesApi.create(clientId, file, pose);
      })
      .filter((job): job is NonNullable<typeof job> => job != null);

    if (jobs.length === 0) return of(undefined);
    return forkJoin(jobs.map((job) => job.pipe(catchError(() => of(null))))).pipe(
      map(() => undefined),
    );
  }

  private revokeProgressPreview(pose: ProgressImagePose): void {
    const url = this.progressObjectUrls.get(pose);
    if (url) {
      URL.revokeObjectURL(url);
      this.progressObjectUrls.delete(pose);
    }
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
