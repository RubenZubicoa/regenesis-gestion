import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { asRecordArray, normalizeClient, normalizeRoutineDay } from '../core/normalizers';
import type { Client } from '../models/client';
import type { RoutineDay, RoutineExercise } from '../models/routine-day';
import { ApiService } from './api.service';

export interface RoutineExercisePayload {
  exerciseId: string;
  sets: string;
  rest: string;
  seriesCount?: number;
  repRange?: { min: number; max: number };
  repUnit?: 'reps' | 's';
  targetKm?: number;
}

export interface RoutineDayPayload {
  clientId: string;
  day: string;
  focus: string;
  done: boolean;
  duration: string;
  exercises: RoutineExercisePayload[];
}

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly api = inject(ApiService);

  loadClient(clientId: string): Observable<Client> {
    return this.api
      .get<unknown>(`/api/clients/${encodeURIComponent(clientId)}`)
      .pipe(map(normalizeClient));
  }

  listByClient(clientId: string): Observable<RoutineDay[]> {
    return this.api
      .get<unknown[]>(`/api/routine-days/${encodeURIComponent(clientId)}`)
      .pipe(map((raw) => asRecordArray(raw).map(normalizeRoutineDay)));
  }

  create(payload: RoutineDayPayload): Observable<RoutineDay> {
    return this.api
      .post<unknown>('/api/routine-days', payload)
      .pipe(map(normalizeRoutineDay));
  }

  update(id: string, payload: RoutineDayPayload): Observable<RoutineDay> {
    return this.api
      .put<unknown>(`/api/routine-days/${encodeURIComponent(id)}`, payload)
      .pipe(map(normalizeRoutineDay));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/api/routine-days/${encodeURIComponent(id)}`);
  }

  /** Sincroniza la rutina local con el API (crear / actualizar / borrar). */
  sync(
    clientId: string,
    originalIds: string[],
    days: {
      _id: string | null;
      day: string;
      focus: string;
      done: boolean;
      duration: string;
      exercises: RoutineExercise[];
    }[],
  ): Observable<RoutineDay[]> {
    const keepIds = new Set(days.map((d) => d._id).filter((id): id is string => !!id));
    const toDelete = originalIds.filter((id) => !keepIds.has(id));

    const deletes$: Observable<unknown> =
      toDelete.length > 0
        ? forkJoin(toDelete.map((id) => this.remove(id)))
        : of(undefined);

    return deletes$.pipe(
      switchMap((): Observable<RoutineDay[]> => {
        if (days.length === 0) return of([]);
        return forkJoin(
          days.map((day) => {
            const payload = this.toPayload(clientId, day);
            return day._id
              ? this.update(day._id, payload)
              : this.create(payload);
          }),
        );
      }),
    );
  }

  toPayload(
    clientId: string,
    day: {
      day: string;
      focus: string;
      done: boolean;
      duration: string;
      exercises: RoutineExercise[];
    },
  ): RoutineDayPayload {
    return {
      clientId,
      day: day.day.trim(),
      focus: day.focus.trim(),
      done: day.done,
      duration: day.duration.trim(),
      exercises: day.exercises.map((ex) => {
        const payload: RoutineExercisePayload = {
          exerciseId: ex.exerciseId,
          sets: ex.sets.trim(),
          rest: ex.rest.trim(),
        };
        if (ex.seriesCount != null) payload.seriesCount = ex.seriesCount;
        if (ex.repRange) payload.repRange = ex.repRange;
        if (ex.repUnit) payload.repUnit = ex.repUnit;
        if (ex.targetKm != null) payload.targetKm = ex.targetKm;
        return payload;
      }),
    };
  }
}
