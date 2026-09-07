import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { asRecordArray, normalizeRoutineMaster } from '../core/normalizers';
import type { ExerciseMaster } from '../models/exercise-master';
import type { RoutineExercise } from '../models/routine-day';
import type { RoutineMaster } from '../models/routine-master';
import { ApiService } from './api.service';

export type RoutineMasterInput = Omit<RoutineMaster, '_id'>;

function unwrapList(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    if (Array.isArray(rec['data'])) return rec['data'];
    if (Array.isArray(rec['items'])) return rec['items'];
    if (Array.isArray(rec['results'])) return rec['results'];
  }
  return [];
}

function extractEntity(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const rec = raw as Record<string, unknown>;
  const nested = rec['data'] ?? rec['item'] ?? rec['routine'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  return raw;
}

@Injectable({ providedIn: 'root' })
export class RoutineMastersService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/routine-masters';

  list(): Observable<RoutineMaster[]> {
    return this.api.get<unknown>(this.path).pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeRoutineMaster)
          .filter((item) => item._id)
          .sort((a, b) => a.day.localeCompare(b.day, 'es')),
      ),
    );
  }

  create(input: RoutineMasterInput): Observable<RoutineMaster> {
    return this.api
      .post<unknown>(this.path, this.toBody(input))
      .pipe(map((raw) => this.mergeResult(raw, input)));
  }

  update(id: string, input: RoutineMasterInput): Observable<RoutineMaster> {
    const body = this.toBody(input);
    const path = `${this.path}/${encodeURIComponent(id)}`;
    return this.api.put<unknown>(path, body).pipe(
      catchError((err: Error) => {
        const msg = err.message.toLowerCase();
        const maybeWrongMethod =
          msg.includes('404') ||
          msg.includes('405') ||
          msg.includes('not allowed') ||
          msg.includes('cannot put');
        return maybeWrongMethod
          ? this.api.patch<unknown>(path, body)
          : throwError(() => err);
      }),
      map((raw) => this.mergeResult(raw, input, id)),
    );
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`${this.path}/${encodeURIComponent(id)}`);
  }

  hydrate(routine: RoutineMaster, masters: ExerciseMaster[]): RoutineMaster {
    const byId = new Map(masters.map((item) => [item._id, item]));
    return {
      ...routine,
      exercises: routine.exercises.map((ex) => {
        const master = byId.get(ex.exerciseId);
        if (!master) return ex;
        return {
          ...ex,
          name: !ex.name || ex.name === 'Ejercicio' ? master.name : ex.name,
          type: ex.type ?? master.type,
          image: ex.image || master.imageUrl,
        };
      }),
    };
  }

  private mergeResult(
    raw: unknown,
    input: RoutineMasterInput,
    fallbackId = '',
  ): RoutineMaster {
    const parsed = normalizeRoutineMaster(extractEntity(raw));
    return {
      _id: parsed._id || fallbackId,
      day: parsed.day || input.day,
      focus: parsed.focus || input.focus,
      done: false,
      duration: parsed.duration || input.duration,
      exercises: parsed.exercises.length ? parsed.exercises : input.exercises,
    };
  }

  private toBody(input: RoutineMasterInput): Record<string, unknown> {
    return {
      day: input.day.trim(),
      focus: input.focus.trim(),
      done: false,
      duration: input.duration.trim(),
      exercises: input.exercises.map((ex) => this.toExerciseBody(ex)),
    };
  }

  private toExerciseBody(ex: RoutineExercise): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      exerciseId: ex.exerciseId,
      sets: ex.sets.trim(),
      rest: ex.rest.trim(),
    };
    if (ex.seriesCount != null) payload['seriesCount'] = ex.seriesCount;
    if (ex.repRange) payload['repRange'] = ex.repRange;
    if (ex.repUnit) payload['repUnit'] = ex.repUnit;
    if (ex.targetKm != null) payload['targetKm'] = ex.targetKm;
    return payload;
  }
}
