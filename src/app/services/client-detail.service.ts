import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import {
  asRecordArray,
  enrichMeasurement,
  enrichWellness,
  latestMeasurements,
  latestWellness,
  normalizeClient,
  normalizeDailySteps,
  normalizeMacros,
  normalizeMeal,
  normalizeMeasurement,
  normalizeMeasurementMaster,
  normalizeProgressImage,
  normalizeProgram,
  normalizeReview,
  normalizeRoutineDay,
  normalizeSupplements,
  normalizeWeight,
  normalizeWellness,
  normalizeWellnessMaster,
  normalizeWorkoutHistory,
  pickCurrentDailySteps,
} from '../core/normalizers';
import type { ClientDetail } from '../models/client-detail';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ClientDetailService {
  private readonly api = inject(ApiService);

  loadDetail(clientId: string): Observable<ClientDetail | null> {
    return forkJoin({
      client: this.api.get<unknown>(`/api/clients/${encodeURIComponent(clientId)}`),
      programs: this.api.get<unknown[]>('/api/programs'),
      reviews: this.api.get<unknown[]>(
        `/api/reviews/client/${encodeURIComponent(clientId)}`,
      ),
      weight: this.api
        .get<unknown>(`/api/clients/${encodeURIComponent(clientId)}/weights`)
        .pipe(catchError(() => of(null))),
      macros: this.api
        .get<unknown>(`/api/macros/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of(null))),
      meal: this.api
        .get<unknown>(`/api/meals/client/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of(null))),
      supplements: this.api
        .get<unknown>(`/api/supplements/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of(null))),
      routineDays: this.api
        .get<unknown[]>(`/api/routine-days/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of([]))),
      workoutHistory: this.api
        .get<unknown[]>(`/api/workout-history/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of([]))),
      measurements: this.api.get<unknown[]>(
        `/api/clients/${encodeURIComponent(clientId)}/measurements`,
      ),
      measurementMasters: this.api.get<unknown[]>('/api/measurement-masters'),
      wellness: this.api
        .get<unknown[]>(`/api/wellness/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of([]))),
      wellnessMasters: this.api.get<unknown[]>('/api/wellness-masters'),
      dailyStepsRecords: this.api
        .get<unknown[]>(`/api/daily-steps/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of([]))),
      progressImages: this.api
        .get<unknown[]>(
          `/api/progress-images?clientId=${encodeURIComponent(clientId)}`,
        )
        .pipe(catchError(() => of([]))),
    }).pipe(
      map((payload) => {
        const client = normalizeClient(payload.client);
        const programs = asRecordArray(payload.programs).map(normalizeProgram);
        const programName =
          programs.find((p) => p._id === client.program)?.name ?? 'Sin programa';

        const reviews = asRecordArray(payload.reviews).map(normalizeReview);
        const upcomingReview =
          reviews.find((review) => review.status === 'upcoming') ?? null;

        const measurementMasters = asRecordArray(payload.measurementMasters).map(
          normalizeMeasurementMaster,
        );
        const wellnessMasters = asRecordArray(payload.wellnessMasters).map(
          normalizeWellnessMaster,
        );

        const measurements = latestMeasurements(
          asRecordArray(payload.measurements)
            .map(normalizeMeasurement)
            .map((record) => enrichMeasurement(record, measurementMasters)),
        );

        const wellness = latestWellness(
          asRecordArray(payload.wellness)
            .map(normalizeWellness)
            .map((record) => enrichWellness(record, wellnessMasters)),
        );

        const dailyStepsRecords = asRecordArray(payload.dailyStepsRecords).map(
          normalizeDailySteps,
        );

        return {
          client,
          programName,
          reviews,
          upcomingReview,
          weight: payload.weight ? normalizeWeight(payload.weight) : null,
          macros: payload.macros ? normalizeMacros(payload.macros) : null,
          meal: payload.meal ? normalizeMeal(payload.meal) : null,
          supplements: payload.supplements ? normalizeSupplements(payload.supplements) : null,
          routineDays: asRecordArray(payload.routineDays).map(normalizeRoutineDay),
          workoutHistory: asRecordArray(payload.workoutHistory).map(normalizeWorkoutHistory),
          measurements,
          wellness,
          dailySteps: pickCurrentDailySteps(dailyStepsRecords, client.week),
          progressImages: asRecordArray(payload.progressImages).map(normalizeProgressImage),
        } satisfies ClientDetail;
      }),
      catchError(() => of(null)),
    );
  }
}
