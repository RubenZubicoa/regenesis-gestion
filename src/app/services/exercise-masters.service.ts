import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { asRecordArray, normalizeId } from '../core/normalizers';
import type { ExerciseMaster, ExerciseType } from '../models/exercise-master';
import { ApiService } from './api.service';

export interface ExerciseMasterInput {
  name: string;
  type: ExerciseType;
  imageUrl?: string;
  explanation?: string;
}

function normalizeExerciseMaster(raw: unknown): ExerciseMaster {
  const r =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const typeRaw = String(r['type'] ?? 'strength');
  const type: ExerciseType = typeRaw === 'cardio' ? 'cardio' : 'strength';
  const imageUrl = String(r['imageUrl'] ?? '').trim();
  const explanation = String(r['explanation'] ?? '').trim();

  return {
    _id: normalizeId(r['_id']),
    name: String(r['name'] ?? ''),
    type,
    ...(imageUrl ? { imageUrl } : {}),
    ...(explanation ? { explanation } : {}),
  };
}

@Injectable({ providedIn: 'root' })
export class ExerciseMastersService {
  private readonly api = inject(ApiService);

  list(): Observable<ExerciseMaster[]> {
    return this.api
      .get<unknown[]>('/api/exercise-masters')
      .pipe(map((raw) => asRecordArray(raw).map(normalizeExerciseMaster)));
  }

  create(input: ExerciseMasterInput): Observable<ExerciseMaster> {
    return this.api
      .post<unknown>('/api/exercise-masters', this.toBody(input))
      .pipe(map(normalizeExerciseMaster));
  }

  update(id: string, input: ExerciseMasterInput): Observable<ExerciseMaster> {
    return this.api
      .put<unknown>(`/api/exercise-masters/${encodeURIComponent(id)}`, this.toBody(input))
      .pipe(map(normalizeExerciseMaster));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/api/exercise-masters/${encodeURIComponent(id)}`);
  }

  private toBody(input: ExerciseMasterInput): Record<string, unknown> {
    const body: Record<string, unknown> = {
      name: input.name.trim(),
      type: input.type,
      imageUrl: input.imageUrl?.trim() ?? '',
      explanation: input.explanation?.trim() ?? '',
    };
    return body;
  }
}
