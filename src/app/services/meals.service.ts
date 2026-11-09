import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeMeal } from '../core/normalizers';
import { serializeMealOption, type Meal, type MealSlot } from '../models/meal';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MealsService {
  private readonly api = inject(ApiService);

  save(clientId: string, current: Meal | null, slots: MealSlot[]): Observable<Meal> {
    const body = {
      clientId,
      slots: slots.map((slot) => this.toSlotBody(slot)),
    };

    const request$ = current
      ? this.api.put<unknown>(`/api/meals/${encodeURIComponent(current._id)}`, body)
      : this.api.post<unknown>('/api/meals', body);

    return request$.pipe(map((raw) => normalizeMeal(raw)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/api/meals/${encodeURIComponent(id)}`);
  }

  private toSlotBody(slot: MealSlot): Record<string, unknown> {
    return {
      label: slot.label.trim(),
      time: slot.time.trim(),
      icon: slot.icon.trim(),
      options: slot.options.map((opt) => serializeMealOption(opt)),
    };
  }
}
