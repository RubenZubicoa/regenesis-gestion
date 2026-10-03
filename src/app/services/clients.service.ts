import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import {
  asRecordArray,
  normalizeClient,
  normalizeProgram,
  normalizeReview,
  normalizeWeight,
} from '../core/normalizers';
import type { Client } from '../models/client';
import type { ClientListItem } from '../models/client-list-item';
import type { Program } from '../models/program';
import type { Review } from '../models/review';
import type { Weight } from '../models/weight';
import { ApiService } from './api.service';

/** Alta de cliente: ficha administrativa, sin nutrición ni entrenamiento. */
export interface ClientCreatePayload {
  name: string;
  fullName: string;
  email: string;
  telefono: string;
  password: string;
  goal: string;
  coach: string;
  plan: string;
  /** ObjectId de Program; si no viene, se asigna uno por defecto. */
  program?: string;
  startDate: string;
  endDate: string;
  week: number;
  totalWeeks: number;
  phase: number;
  totalPhases: number;
  avatar?: string;
  avatarFile?: File;
}

export type ClientUpdatePayload = Omit<ClientCreatePayload, 'password'>;

/** Toda renovación de plan dura exactamente 90 días. */
export const PLAN_RENEWAL_DAYS = 90;
export const PLAN_RENEWAL_WEEKS = Math.round(PLAN_RENEWAL_DAYS / 7);

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(ApiService);

  listPrograms(): Observable<Program[]> {
    return this.api
      .get<unknown[]>('/api/programs')
      .pipe(map((raw) => asRecordArray(raw).map(normalizeProgram)));
  }

  create(payload: ClientCreatePayload): Observable<Client> {
    return this.resolveProgramId(payload.program).pipe(
      switchMap((program) => {
        const { password, avatarFile, ...rest } = payload;
        return this.api
          .post<unknown>('/api/clients', {
            ...rest,
            program,
            contraseña: password,
          })
          .pipe(
            map(normalizeClient),
            switchMap((client) => {
              if (!avatarFile) return of(client);
              const { _id, ...fields } = client;
              return this.update(_id, { ...fields, avatarFile });
            }),
          );
      }),
    );
  }

  update(id: string, payload: ClientUpdatePayload): Observable<Client> {
    return this.api
      .put<unknown>(`/api/clients/${encodeURIComponent(id)}`, this.toFormData(payload))
      .pipe(map(normalizeClient));
  }

  changePassword(id: string, password: string): Observable<void> {
    return this.api
      .put<unknown>(`/api/clients/${encodeURIComponent(id)}`, { contraseña: password })
      .pipe(map(() => undefined));
  }

  changePhase(client: Client, phase: number): Observable<Client> {
    const { _id, ...fields } = client;
    return this.update(_id, { ...fields, phase });
  }

  private toFormData(
    payload: ClientCreatePayload | ClientUpdatePayload,
    program?: string,
  ): FormData {
    const body = new FormData();
    body.append('name', payload.name);
    body.append('fullName', payload.fullName);
    body.append('email', payload.email);
    body.append('telefono', payload.telefono);
    body.append('goal', payload.goal);
    body.append('coach', payload.coach);
    body.append('plan', payload.plan);
    body.append('program', program ?? payload.program ?? '');
    body.append('startDate', payload.startDate);
    body.append('endDate', payload.endDate);
    body.append('week', String(payload.week));
    body.append('totalWeeks', String(payload.totalWeeks));
    body.append('phase', String(payload.phase));
    body.append('totalPhases', String(payload.totalPhases));

    if ('password' in payload && payload.password) {
      body.append('contraseña', payload.password);
    }

    if (payload.avatarFile) {
      body.append('avatar', payload.avatarFile, payload.avatarFile.name);
    } else if (payload.avatar) {
      body.append('avatar', payload.avatar);
    }

    return body;
  }

  renewPlan(
    client: Client,
    dates: { startDate: string; endDate: string },
  ): Observable<void> {
    const weeks = weeksBetween(dates.startDate, dates.endDate) ?? PLAN_RENEWAL_WEEKS;
    const { _id, ...fields } = client;
    return this.api
      .post<unknown>(`/api/clients/${encodeURIComponent(_id)}/renew`, {
        ...fields,
        startDate: dates.startDate,
        endDate: dates.endDate,
        week: 1,
        totalWeeks: weeks,
      })
      .pipe(map(() => undefined));
  }

  private resolveProgramId(program?: string): Observable<string> {
    if (program) return of(program);
    return this.listPrograms().pipe(
      map((programs) => {
        const preferred =
          programs.find((item) => /nutrici[oó]n \+ entrenamiento/i.test(item.name)) ??
          programs[0];
        if (!preferred?._id) {
          throw new Error('No hay programas disponibles para asignar al cliente.');
        }
        return preferred._id;
      }),
    );
  }

  loadListItems(): Observable<ClientListItem[]> {
    return forkJoin({
      clients: this.api.get<unknown[]>('/api/clients'),
      programs: this.api.get<unknown[]>('/api/programs'),
      reviews: this.api.get<unknown[]>('/api/reviews'),
      weights: this.api.get<unknown[]>('/api/weights'),
    }).pipe(map((payload) => this.buildListItems(payload)));
  }

  private buildListItems(payload: {
    clients: unknown[];
    programs: unknown[];
    reviews: unknown[];
    weights: unknown[];
  }): ClientListItem[] {
    const programs = asRecordArray(payload.programs).map(normalizeProgram);
    const reviews = asRecordArray(payload.reviews).map(normalizeReview);
    const weights = asRecordArray(payload.weights).map(normalizeWeight);

    const programById = new Map(programs.map((p) => [p._id, p]));
    const reviewsByClient = new Map<string, Review[]>();
    for (const review of reviews) {
      const list = reviewsByClient.get(review.clientId) ?? [];
      list.push(review);
      reviewsByClient.set(review.clientId, list);
    }
    const weightByClient = new Map(weights.map((w) => [w.clientId, w]));

    return asRecordArray(payload.clients).map((raw, index) =>
      this.toListItem(normalizeClient(raw), index, programById, reviewsByClient, weightByClient),
    );
  }

  private toListItem(
    client: Client,
    index: number,
    programById: Map<string, Program>,
    reviewsByClient: Map<string, Review[]>,
    weightByClient: Map<string, Weight>,
  ): ClientListItem {
    const program = programById.get(client.program);
    const clientReviews = reviewsByClient.get(client._id) ?? [];
    const upcomingReview =
      clientReviews.find((review) => review.status === 'upcoming') ?? null;
    const weight = weightByClient.get(client._id);
    const weightDelta =
      weight != null ? Number((weight.current - weight.start).toFixed(1)) : null;

    return {
      ...client,
      programName: program?.name ?? 'Sin programa',
      upcomingReview,
      weightDelta,
      weightUnit: weight?.unit ?? 'kg',
      timeline: this.resolveTimeline(client.startDate, client.endDate),
      accent: (['gold', 'teal', 'coral', 'blue'] as const)[index % 4],
    };
  }

  private resolveTimeline(
    startDate: string,
    endDate: string,
  ): ClientListItem['timeline'] {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'active';
    }
    if (today < start) return 'upcoming';
    if (today > end) return 'finished';
    return 'active';
  }
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
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
