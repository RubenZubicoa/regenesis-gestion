import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  asRecordArray,
  latestMeasurements,
  normalizeMeasurement,
} from '../core/normalizers';
import type { Measurement, MeasurementCreatePayload, MeasurementMaster } from '../models/measurement';
import { ApiService } from './api.service';
import { MeasurementMastersService } from './measurement-masters.service';

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
  private readonly mastersApi = inject(MeasurementMastersService);

  listMasters(): Observable<MeasurementMaster[]> {
    return this.mastersApi.list();
  }

  listByClient(clientId: string): Observable<Measurement[]> {
    return this.api
      .get<unknown>(`/api/clients/${encodeURIComponent(clientId)}/measurements`)
      .pipe(
        map((raw) =>
          latestMeasurements(
            asRecordArray(unwrapList(raw)).map((item) => ({
              ...normalizeMeasurement(item),
              label: '',
              unit: '',
            })),
          ),
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

  update(
    id: string,
    payload: Pick<MeasurementCreatePayload, 'value' | 'delta' | 'date'>,
  ): Observable<Measurement> {
    return this.api.put<unknown>(`/api/measurements/${encodeURIComponent(id)}`, payload).pipe(
      map((raw) => ({
        ...normalizeMeasurement(raw),
        label: '',
        unit: '',
      })),
    );
  }
}
