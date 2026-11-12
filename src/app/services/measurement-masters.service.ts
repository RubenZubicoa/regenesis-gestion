import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { asRecordArray, normalizeMeasurementMaster } from '../core/normalizers';
import type {
  CreateMeasurementMasterInput,
  MeasurementMaster,
  UpdateMeasurementMasterInput,
} from '../models/MeasurementMaster';
import { ApiService } from './api.service';

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

function unwrapEntity(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const rec = raw as Record<string, unknown>;
  const nested = rec['data'] ?? rec['item'] ?? rec['master'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  return raw;
}

@Injectable({ providedIn: 'root' })
export class MeasurementMastersService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/measurement-masters';

  list(): Observable<MeasurementMaster[]> {
    return this.api.get<unknown>(this.path).pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeMeasurementMaster)
          .filter((item) => item._id)
          .sort((a, b) => a.label.localeCompare(b.label, 'es')),
      ),
    );
  }

  create(input: CreateMeasurementMasterInput): Observable<MeasurementMaster> {
    return this.api
      .post<unknown>(this.path, this.toBody(input))
      .pipe(map((raw) => this.mergeResult(raw, input)));
  }

  update(id: string, input: UpdateMeasurementMasterInput): Observable<MeasurementMaster> {
    return this.api
      .put<unknown>(`${this.path}/${encodeURIComponent(id)}`, this.toBody(input))
      .pipe(map((raw) => this.mergeResult(raw, input, id)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`${this.path}/${encodeURIComponent(id)}`);
  }

  private mergeResult(
    raw: unknown,
    input: CreateMeasurementMasterInput | UpdateMeasurementMasterInput,
    fallbackId = '',
  ): MeasurementMaster {
    const parsed = normalizeMeasurementMaster(unwrapEntity(raw));
    return {
      _id: parsed._id || fallbackId,
      key: parsed.key || input.key?.trim() || '',
      label: parsed.label || input.label?.trim() || '',
      unit: parsed.unit || input.unit?.trim() || '',
      icon: parsed.icon || input.icon?.trim() || '',
    };
  }

  private toBody(
    input: CreateMeasurementMasterInput | UpdateMeasurementMasterInput,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (input.key !== undefined) body['key'] = input.key.trim();
    if (input.label !== undefined) body['label'] = input.label.trim();
    if (input.unit !== undefined) body['unit'] = input.unit.trim();
    if (input.icon !== undefined) body['icon'] = input.icon.trim();
    return body;
  }
}
