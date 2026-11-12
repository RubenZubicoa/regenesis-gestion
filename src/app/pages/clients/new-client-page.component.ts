import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, throwError, type Observable } from 'rxjs';

import type { Client } from '../../models/client';
import {
  DAILY_RECALL_ENTRY_FIELDS,
  DAILY_RECALL_MEALS,
  EATING_HABITS_FIELDS,
  EXERCISE_HABITS_FIELDS,
  LABORAL_HABITS_FIELDS,
  LIFESTYLE_FIELDS,
  PERSONAL_HISTORY_FIELDS,
  emptyDailyRecall,
  emptyEatingHabits,
  emptyExerciseHabits,
  emptyLaboralHabits,
  emptyLifestyle,
  emptyPersonalHistory,
  hasTechnicalSpecContent,
  type DailyRecall,
  type DailyRecallEntry,
  type EatingHabits,
  type ExerciseHabits,
  type LaboralHabits,
  type Lifestyle,
  type PersonalHistory,
} from '../../models/technical-specifications';
import { ClientsService } from '../../services/clients.service';
import { TechnicalSpecificationsService } from '../../services/technical-specifications.service';

type SpecGroupKey =
  | 'personalHistory'
  | 'eatingHabits'
  | 'lifestyle'
  | 'exerciseHabits'
  | 'laboralHabits';

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
  private readonly specsApi = inject(TechnicalSpecificationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isEdit = signal(false);
  readonly clientId = signal<string | null>(null);
  readonly pageLoading = signal(false);
  readonly pageError = signal<string | null>(null);
  private originalClient: Client | null = null;
  private existingSpecId: string | null = null;

  readonly personalHistoryFields = PERSONAL_HISTORY_FIELDS;
  readonly eatingHabitsFields = EATING_HABITS_FIELDS;
  readonly lifestyleFields = LIFESTYLE_FIELDS;
  readonly exerciseHabitsFields = EXERCISE_HABITS_FIELDS;
  readonly laboralHabitsFields = LABORAL_HABITS_FIELDS;
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

  readonly personalHistory = signal<PersonalHistory>(emptyPersonalHistory());
  readonly eatingHabits = signal<EatingHabits>(emptyEatingHabits());
  readonly lifestyle = signal<Lifestyle>(emptyLifestyle());
  readonly exerciseHabits = signal<ExerciseHabits>(emptyExerciseHabits());
  readonly laboralHabits = signal<LaboralHabits>(emptyLaboralHabits());
  readonly expectations = signal('');
  readonly dailyRecall = signal<DailyRecall>(emptyDailyRecall());
  readonly extraNotes = signal('');

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEdit.set(true);
    this.clientId.set(id);
    this.pageLoading.set(true);
    this.loadEdit(id);
  }

  ngOnDestroy(): void {
    this.revokePreview();
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
    if (group === 'exerciseHabits') {
      this.exerciseHabits.update((current) => ({ ...current, [key]: next }));
      return;
    }
    this.laboralHabits.update((current) => ({ ...current, [key]: next }));
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
    if (group === 'exerciseHabits') return this.exerciseHabits();
    return this.laboralHabits();
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
          this.saveTechnicalSpecs(client._id).pipe(map((): typeof client => client)),
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

  private loadEdit(id: string): void {
    forkJoin({
      client: this.clients.get(id),
      specs: this.specsApi.getByClient(id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ client, specs }) => {
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

        if (specs) {
          this.existingSpecId = specs._id;
          this.personalHistory.set(specs.personalHistory);
          this.eatingHabits.set(specs.eatingHabits);
          this.lifestyle.set(specs.lifestyle);
          this.exerciseHabits.set(specs.exerciseHabits);
          this.laboralHabits.set(specs.laboralHabits ?? emptyLaboralHabits());
          this.dailyRecall.set(specs.dailyRecall);
          this.expectations.set(specs.expectations ?? '');
          this.extraNotes.set(specs.observations ?? '');
        }

        this.pageLoading.set(false);
      },
      error: (err: Error) => {
        this.pageError.set(err.message || 'No se pudo cargar la ficha del cliente.');
        this.pageLoading.set(false);
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

  private saveTechnicalSpecs(clientId: string): Observable<void> {
    const payload = {
      clientId,
      personalHistory: this.personalHistory(),
      eatingHabits: this.eatingHabits(),
      lifestyle: this.lifestyle(),
      exerciseHabits: this.exerciseHabits(),
      dailyRecall: this.dailyRecall(),
      expectations: this.expectations().trim(),
      laboralHabits: this.laboralHabits(),
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
