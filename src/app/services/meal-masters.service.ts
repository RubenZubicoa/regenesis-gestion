import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { asRecordArray, normalizeMealMaster } from '../core/normalizers';
import type { MealSlot } from '../models/meal';
import type { MealMaster } from '../models/meal-master';
import { mealPlanTitle } from '../models/meal-master';
import { ApiService } from './api.service';

export type MealMasterInput = Omit<MealMaster, '_id'>;

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
  const nested = rec['data'] ?? rec['item'] ?? rec['meal'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  return raw;
}

@Injectable({ providedIn: 'root' })
export class MealMastersService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/meal-masters';

  list(): Observable<MealMaster[]> {
    return this.api.get<unknown>(this.path).pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeMealMaster)
          .filter((item) => item._id)
          .sort((a, b) => mealPlanTitle(a).localeCompare(mealPlanTitle(b), 'es')),
      ),
    );
  }

  create(input: MealMasterInput): Observable<MealMaster> {
    return this.api
      .post<unknown>(this.path, this.toBody(input))
      .pipe(map((raw) => this.mergeResult(raw, input)));
  }

  update(id: string, input: MealMasterInput): Observable<MealMaster> {
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
    input: MealMasterInput,
    fallbackId = '',
  ): MealMaster {
    const parsed = normalizeMealMaster(extractEntity(raw));
    return {
      _id: parsed._id || fallbackId,
      nombre: parsed.nombre || input.nombre,
      descripcion: parsed.descripcion || input.descripcion,
      slots: parsed.slots.length ? parsed.slots : input.slots,
    };
  }

  private toBody(input: MealMasterInput): Record<string, unknown> {
    return {
      nombre: input.nombre.trim(),
      descripcion: input.descripcion.trim(),
      slots: input.slots.map((slot) => this.toSlotBody(slot)),
    };
  }

  private toSlotBody(slot: MealSlot): Record<string, unknown> {
    return {
      label: slot.label.trim(),
      time: slot.time.trim(),
      icon: slot.icon.trim(),
      options: slot.options
        .map((opt) => {
          const description = opt.description?.trim();
          return {
            name: opt.name.trim(),
            kcal: opt.kcal,
            ...(description ? { description } : {}),
          };
        })
        .filter((opt) => opt.name.length > 0),
    };
  }
}
