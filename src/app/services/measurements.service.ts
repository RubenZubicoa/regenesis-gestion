import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';

import {
  asRecordArray,
  latestMeasurements,
  normalizeMeasurement,
} from '../core/normalizers';
import {
  isSameMeasurementDay,
  measurementDelta,
  type Measurement,
  type MeasurementCreatePayload,
  type MeasurementMaster,
} from '../models/measurement';
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

  saveValue(
    clientId: string,
    current: Measurement,
    input: { date: string; value: number },
  ): Observable<Measurement> {
    const date = input.date.slice(0, 10);
    const delta = measurementDelta(current, input.value, date);
    const request$ = isSameMeasurementDay(current, date)
      ? this.update(current._id, { value: input.value, delta, date })
      : this.create({
          client: clientId,
          MeasurementId: current.MeasurementId,
          value: input.value,
          delta,
          date,
        });

    return request$.pipe(
      map((saved) => ({
        ...saved,
        client: saved.client || clientId,
        MeasurementId: saved.MeasurementId || current.MeasurementId,
        label: current.label,
        unit: current.unit,
        value: saved.value || input.value,
        date: saved.date || date,
      })),
    );
  }

  saveMany(
    clientId: string,
    entries: { current: Measurement; date: string; value: number }[],
  ): Observable<Measurement[]> {
    if (entries.length === 0) return of([]);
    return forkJoin(
      entries.map((entry) => this.saveValue(clientId, entry.current, entry)),
    );
  }
}
