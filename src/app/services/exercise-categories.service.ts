import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { normalizeId } from '../core/normalizers';
import type { ExerciseCategory } from '../models/exercise-master';
import { slugifyCategoryKey } from '../models/exercise-master';
import { ApiService } from './api.service';

export interface ExerciseCategoryInput {
  label: string;
  key?: string;
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function extractList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const rec = raw as Record<string, unknown>;
  for (const key of ['data', 'items', 'results', 'categories', 'docs', 'rows']) {
    if (Array.isArray(rec[key])) return rec[key] as unknown[];
  }
  return [];
}

function extractEntity(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const rec = raw as Record<string, unknown>;
  const nested = rec['data'] ?? rec['item'] ?? rec['category'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  return raw;
}

export function normalizeExerciseCategory(raw: unknown): ExerciseCategory {
  const r = asRecord(extractEntity(raw));
  const label = String(
    r['label'] ?? r['name'] ?? r['nombre'] ?? r['title'] ?? '',
  ).trim();
  const key = String(r['key'] ?? r['slug'] ?? '').trim() || slugifyCategoryKey(label);
  return {
    _id: normalizeId(r['_id'] || r['id']),
    key,
    label: label || key,
  };
}

@Injectable({ providedIn: 'root' })
export class ExerciseCategoriesService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/exercise-categories';

  list(): Observable<ExerciseCategory[]> {
    return this.api.get<unknown>(this.path).pipe(
      map((raw) =>
        extractList(raw)
          .map(normalizeExerciseCategory)
          .filter((item) => item._id || item.label)
          .sort((a, b) => a.label.localeCompare(b.label, 'es')),
      ),
    );
  }

  create(input: ExerciseCategoryInput): Observable<ExerciseCategory> {
    return this.api
      .post<unknown>(this.path, this.toBody(input))
      .pipe(map((raw) => this.mergeResult(raw, input)));
  }

  update(id: string, input: ExerciseCategoryInput): Observable<ExerciseCategory> {
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

  private mergeResult(
    raw: unknown,
    input: ExerciseCategoryInput,
    fallbackId = '',
  ): ExerciseCategory {
    const parsed = normalizeExerciseCategory(raw);
    const label = parsed.label || input.label.trim();
    return {
      _id: parsed._id || fallbackId,
      label,
      key: parsed.key || input.key?.trim() || slugifyCategoryKey(label),
    };
  }

  private toBody(input: ExerciseCategoryInput): Record<string, unknown> {
    const label = input.label.trim();
    const key = input.key?.trim() || slugifyCategoryKey(label);
    return { label, key };
  }
}
