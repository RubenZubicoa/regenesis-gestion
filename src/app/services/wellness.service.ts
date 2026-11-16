import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';

import { normalizeWellness } from '../core/normalizers';
import { todayIsoDate } from '../models/weight';
import {
  isSameWellnessDay,
  type Wellness,
  type WellnessCreatePayload,
} from '../models/wellness';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class WellnessService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/wellness';

  create(payload: WellnessCreatePayload): Observable<Wellness> {
    return this.api.post<unknown>(this.path, payload).pipe(
      map((raw) => ({
        ...normalizeWellness(raw),
        label: '',
        icon: '',
        tone: '',
      })),
    );
  }

  update(
    id: string,
    payload: Pick<WellnessCreatePayload, 'value' | 'date'>,
  ): Observable<Wellness> {
    return this.api.put<unknown>(`${this.path}/${encodeURIComponent(id)}`, payload).pipe(
      map((raw) => ({
        ...normalizeWellness(raw),
        label: '',
        icon: '',
        tone: '',
      })),
    );
  }

  saveValue(clientId: string, current: Wellness, value: number): Observable<Wellness> {
    const date = todayIsoDate();
    const request$ = isSameWellnessDay(current, date)
      ? this.update(current._id, { value, date })
      : this.create({
          clientId,
          wellnessId: current.wellnessId,
          value,
          date,
        });

    return request$.pipe(
      map((saved) => ({
        ...saved,
        clientId: saved.clientId || clientId,
        wellnessId: saved.wellnessId || current.wellnessId,
        label: current.label,
        icon: current.icon,
        tone: current.tone,
        value: Number.isFinite(saved.value) ? saved.value : value,
        date: saved.date || date,
      })),
    );
  }

  saveMany(
    clientId: string,
    entries: { current: Wellness; value: number }[],
  ): Observable<Wellness[]> {
    if (entries.length === 0) return of([]);
    return forkJoin(
      entries.map((entry) => this.saveValue(clientId, entry.current, entry.value)),
    );
  }
}
