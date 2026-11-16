import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeWeight } from '../core/normalizers';
import {
  upsertWeightPoint,
  type Weight,
  type WeightWritePayload,
} from '../models/weight';
import { ApiService } from './api.service';

function unwrapEntity(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const rec = raw as Record<string, unknown>;
  const nested = rec['data'] ?? rec['item'] ?? rec['weight'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  return raw;
}

@Injectable({ providedIn: 'root' })
export class WeightsService {
  private readonly api = inject(ApiService);

  savePoint(
    clientId: string,
    current: Weight | null,
    input: { date: string; value: number },
  ): Observable<Weight> {
    const body = upsertWeightPoint(current, clientId, input.date, input.value);
    const request$ = current
      ? this.api.put<unknown>(`/api/weights/${encodeURIComponent(current._id)}`, body)
      : this.api.post<unknown>('/api/weights', body);

    return request$.pipe(map((raw) => this.mergeResult(raw, body, current?._id ?? '')));
  }

  saveTarget(current: Weight, target: number): Observable<Weight> {
    const body: WeightWritePayload = {
      clientId: current.clientId,
      labels: current.labels,
      data: current.data,
      start: current.start,
      current: current.current,
      target,
      unit: current.unit || 'kg',
    };
    return this.api
      .put<unknown>(`/api/weights/${encodeURIComponent(current._id)}`, { target })
      .pipe(map((raw) => this.mergeResult(raw, body, current._id)));
  }

  private mergeResult(raw: unknown, input: WeightWritePayload, fallbackId: string): Weight {
    const parsed = normalizeWeight(unwrapEntity(raw));
    return {
      _id: parsed._id || fallbackId,
      clientId: parsed.clientId || input.clientId,
      labels: parsed.labels.length ? parsed.labels : input.labels,
      data: parsed.data.length ? parsed.data : input.data,
      start: parsed.start || input.start,
      current: parsed.current || input.current,
      target: parsed.target || input.target,
      unit: parsed.unit || input.unit,
    };
  }
}
