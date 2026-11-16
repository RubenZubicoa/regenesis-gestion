import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { asRecordArray, normalizeDailySteps } from '../core/normalizers';
import {
  findDailyStepsByDate,
  latestDailyStepsGoal,
  latestDailyStepsRecord,
  upsertDailyStepsRecord,
  type DailySteps,
  type DailyStepsWritePayload,
} from '../models/daily-steps';
import { todayIsoDate } from '../models/weight';
import { ApiService } from './api.service';

function unwrapList(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    if (Array.isArray(rec['data'])) return rec['data'];
    if (Array.isArray(rec['items'])) return rec['items'];
    if (Array.isArray(rec['results'])) return rec['results'];
    if (Array.isArray(rec['dailySteps'])) return rec['dailySteps'];
    if (Array.isArray(rec['records'])) return rec['records'];
  }
  return [];
}

function unwrapEntity(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const rec = raw as Record<string, unknown>;
  const nested = rec['data'] ?? rec['item'] ?? rec['dailySteps'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  return raw;
}

@Injectable({ providedIn: 'root' })
export class DailyStepsService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/daily-steps';

  listByClient(clientId: string): Observable<DailySteps[]> {
    return this.api.get<unknown>(`${this.path}/${encodeURIComponent(clientId)}`).pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeDailySteps)
          .filter((item) => item.date),
      ),
    );
  }

  savePoint(
    clientId: string,
    records: DailySteps[],
    input: { date: string; steps: number; goal?: number },
  ): Observable<DailySteps[]> {
    const date = input.date.slice(0, 10);
    const current = findDailyStepsByDate(records, date);
    const goal = input.goal ?? current?.goal ?? latestDailyStepsGoal(records);
    const body: DailyStepsWritePayload = {
      clientId,
      date,
      steps: input.steps,
      ...(goal != null ? { goal } : {}),
    };
    const request$ = current
      ? this.api.put<unknown>(`${this.path}/${encodeURIComponent(current._id)}`, body)
      : this.api.post<unknown>(this.path, body);

    return request$.pipe(
      map((raw) => this.mergeSaved(raw, clientId, current, body)),
      switchMap((saved) =>
        this.listByClient(clientId).pipe(
          catchError(() => of(upsertDailyStepsRecord(records, saved))),
        ),
      ),
    );
  }

  saveGoal(clientId: string, records: DailySteps[], goal: number): Observable<DailySteps[]> {
    const current = latestDailyStepsRecord(records);
    const body: DailyStepsWritePayload = {
      clientId,
      date: current?.date.slice(0, 10) || todayIsoDate(),
      steps: current?.steps ?? 0,
      goal,
    };
    const request$ = current
      ? this.api.put<unknown>(`${this.path}/${encodeURIComponent(current._id)}`, { goal })
      : this.api.post<unknown>(this.path, body);

    return request$.pipe(
      map((raw) => this.mergeSaved(raw, clientId, current, body)),
      switchMap((saved) =>
        this.listByClient(clientId).pipe(
          catchError(() => of(upsertDailyStepsRecord(records, saved))),
        ),
      ),
    );
  }

  private mergeSaved(
    raw: unknown,
    clientId: string,
    current: DailySteps | undefined,
    input: DailyStepsWritePayload,
  ): DailySteps {
    const parsed = normalizeDailySteps(unwrapEntity(raw));
    return {
      _id: parsed._id || current?._id || '',
      clientId: parsed.clientId || clientId,
      date: input.date,
      steps: input.steps,
      ...(input.goal != null
        ? { goal: input.goal }
        : parsed.goal != null
          ? { goal: parsed.goal }
          : current?.goal != null
            ? { goal: current.goal }
            : {}),
    };
  }
}
