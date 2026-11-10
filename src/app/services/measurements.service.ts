import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { asRecordArray, normalizeMeasurement, normalizeMeasurementMaster } from '../core/normalizers';
import type { Measurement, MeasurementCreatePayload, MeasurementMaster } from '../models/measurement';
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

@Injectable({ providedIn: 'root' })
export class MeasurementsService {
  private readonly api = inject(ApiService);

  listMasters(): Observable<MeasurementMaster[]> {
    return this.api.get<unknown>('/api/measurement-masters').pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeMeasurementMaster)
          .filter((item) => item._id),
      ),
    );
  }

  create(payload: MeasurementCreatePayload): Observable<Measurement> {
    return this.api.post<unknown>('/api/measurements', payload).pipe(
      map((raw) => ({
        ...normalizeMeasurement(raw),
        label: '',
        unit: '',
      })),
    );
  }
}
