import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { asRecordArray, normalizeId } from '../core/normalizers';
import type { ExerciseMaster, ExerciseType } from '../models/exercise-master';
import { ApiService } from './api.service';

export interface ExerciseMasterInput {
  name: string;
  type: ExerciseType;
  category?: string;
  imageUrl?: string;
  explanation?: string;
}

const CATEGORY_STORE_KEY = 'regenesis.exercise-master.categories';

function readStoredCategories(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATEGORY_STORE_KEY) ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const category = String(value ?? '').trim();
      if (id && category) out[id] = category;
    }
    return out;
  } catch {
    return {};
  }
}

function writeStoredCategory(id: string, category?: string): void {
  if (!id) return;
  const map = readStoredCategories();
  if (category) map[id] = category;
  else delete map[id];
  localStorage.setItem(CATEGORY_STORE_KEY, JSON.stringify(map));
}

function withCategory(exercise: ExerciseMaster, category?: string): ExerciseMaster {
  const next: ExerciseMaster = { ...exercise };
  if (category) next.category = category;
  else delete next.category;
  return next;
}

function applyStoredCategory(
  exercise: ExerciseMaster,
  stored = readStoredCategories(),
): ExerciseMaster {
  return exercise.category ? exercise : withCategory(exercise, stored[exercise._id]);
}

function readCategoryRef(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'string') {
    const value = raw.trim();
    return value || undefined;
  }
  if (typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    return (
      normalizeId(rec['_id']) ||
      String(rec['key'] ?? rec['label'] ?? rec['name'] ?? '').trim() ||
      undefined
    );
  }
  return undefined;
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
  const category = readCategoryRef(r['category'] ?? r['categoria'] ?? r['categoryId']);

  return {
    _id: normalizeId(r['_id']),
    name: String(r['name'] ?? ''),
    type,
    ...(category ? { category } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(explanation ? { explanation } : {}),
  };
}

@Injectable({ providedIn: 'root' })
export class ExerciseMastersService {
  private readonly api = inject(ApiService);

  list(): Observable<ExerciseMaster[]> {
    return this.api.get<unknown[]>('/api/exercise-masters').pipe(
      map((raw) => {
        const stored = readStoredCategories();
        return asRecordArray(raw)
          .map(normalizeExerciseMaster)
          .map((exercise) => applyStoredCategory(exercise, stored));
      }),
    );
  }

  create(input: ExerciseMasterInput): Observable<ExerciseMaster> {
    return this.api
      .post<unknown>('/api/exercise-masters', this.toBody(input))
      .pipe(map((raw) => this.persistCategory(normalizeExerciseMaster(raw), input.category)));
  }

  update(id: string, input: ExerciseMasterInput): Observable<ExerciseMaster> {
    return this.api
      .put<unknown>(`/api/exercise-masters/${encodeURIComponent(id)}`, this.toBody(input))
      .pipe(map((raw) => this.persistCategory(normalizeExerciseMaster(raw), input.category)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/api/exercise-masters/${encodeURIComponent(id)}`).pipe(
      tap(() => writeStoredCategory(id)),
    );
  }

  private persistCategory(exercise: ExerciseMaster, rawCategory?: string): ExerciseMaster {
    const category = rawCategory?.trim() || exercise.category;
    writeStoredCategory(exercise._id, category);
    return withCategory(exercise, category);
  }

  private toBody(input: ExerciseMasterInput): Record<string, unknown> {
    return {
      name: input.name.trim(),
      type: input.type,
      category: input.category?.trim() ?? '',
      imageUrl: input.imageUrl?.trim() ?? '',
      explanation: input.explanation?.trim() ?? '',
    };
  }
}
