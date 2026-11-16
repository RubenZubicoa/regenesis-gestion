import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import {
  asRecordArray,
  enrichMeasurement,
  enrichWellness,
  projectClientMeasurements,
  projectClientWellness,
  normalizeClient,
  normalizeMacros,
  normalizeMeal,
  normalizeMeasurement,
  normalizeProgram,
  normalizeReview,
  normalizeRoutineDay,
  normalizeSupplements,
  normalizeTechnicalSpecifications,
  normalizeWeight,
  normalizeWellness,
  normalizeWellnessMaster,
  normalizeWorkoutHistory,
} from '../core/normalizers';
import type { ClientDetail } from '../models/client-detail';
import { ApiService } from './api.service';
import { DailyStepsService } from './daily-steps.service';
import { MeasurementMastersService } from './measurement-masters.service';
import { ProgressImagesService } from './progress-images.service';

@Injectable({ providedIn: 'root' })
export class ClientDetailService {
  private readonly api = inject(ApiService);
  private readonly dailyStepsApi = inject(DailyStepsService);
  private readonly measurementMastersApi = inject(MeasurementMastersService);
  private readonly progressImagesApi = inject(ProgressImagesService);

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
      measurements: this.api
        .get<unknown[]>(`/api/clients/${encodeURIComponent(clientId)}/measurements`)
        .pipe(catchError(() => of([]))),
      measurementMasters: this.measurementMastersApi.list().pipe(catchError(() => of([]))),
      wellness: this.api
        .get<unknown[]>(`/api/wellness/${encodeURIComponent(clientId)}`)
        .pipe(catchError(() => of([]))),
      wellnessMasters: this.api
        .get<unknown[]>('/api/wellness-masters')
        .pipe(catchError(() => of([]))),
      dailyStepsRecords: this.dailyStepsApi
        .listByClient(clientId)
        .pipe(catchError(() => of([]))),
      progressImages: this.progressImagesApi
        .listByClient(clientId)
        .pipe(catchError(() => of([]))),
      technicalSpecifications: this.api
        .getOptional<unknown>(
          `/api/technical-specifications/client/${encodeURIComponent(clientId)}`,
        )
        .pipe(catchError(() => of(null))),
    }).pipe(
      map((payload) => {
        const client = normalizeClient(payload.client);
        const programs = asRecordArray(payload.programs).map(normalizeProgram);
        const programName =
          programs.find((p) => p._id === client.program)?.name ?? 'Sin programa';

        const reviews = asRecordArray(payload.reviews).map(normalizeReview);
        const upcomingReview =
          reviews.find((review) => review.status === 'upcoming') ?? null;

        const measurementMasters = payload.measurementMasters;
        const wellnessMasters = asRecordArray(payload.wellnessMasters).map(
          normalizeWellnessMaster,
        );

        const measurements = projectClientMeasurements(
          measurementMasters,
          asRecordArray(payload.measurements)
            .map(normalizeMeasurement)
            .map((record) => enrichMeasurement(record, measurementMasters)),
        );

        const wellness = projectClientWellness(
          wellnessMasters,
          asRecordArray(payload.wellness)
            .map(normalizeWellness)
            .map((record) => enrichWellness(record, wellnessMasters)),
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
          dailySteps: payload.dailyStepsRecords,
          progressImages: payload.progressImages,
          technicalSpecifications: payload.technicalSpecifications
            ? normalizeTechnicalSpecifications(payload.technicalSpecifications)
            : null,
        } satisfies ClientDetail;
      }),
      catchError(() => of(null)),
    );
  }
}
