import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeMeal } from '../core/normalizers';
import type { Meal, MealSlot } from '../models/meal';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MealsService {
  private readonly api = inject(ApiService);

  save(clientId: string, current: Meal | null, slots: MealSlot[]): Observable<Meal> {
    const body = { clientId, slots };

    const request$ = current
      ? this.api.put<unknown>(`/api/meals/${encodeURIComponent(current._id)}`, body)
      : this.api.post<unknown>('/api/meals', body);

    return request$.pipe(map((raw) => normalizeMeal(raw)));
  }
}
