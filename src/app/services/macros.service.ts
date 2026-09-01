import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeMacros } from '../core/normalizers';
import type { MacroItem, Macros } from '../models/macros';
import { ApiService } from './api.service';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const DEFAULT_ITEMS: Omit<MacroItem, 'grams' | 'target'>[] = [
  { key: 'prot', label: 'Proteínas', shortLabel: 'Proteínas', tone: 'primary' },
  { key: 'carbs', label: 'Carbohidratos', shortLabel: 'Carbohidratos', tone: 'gold' },
  { key: 'fats', label: 'Grasas', shortLabel: 'Grasas', tone: 'teal' },
];

@Injectable({ providedIn: 'root' })
export class MacrosService {
  private readonly api = inject(ApiService);

  save(clientId: string, current: Macros | null, targets: MacroTargets): Observable<Macros> {
    const items = DEFAULT_ITEMS.map((meta) => {
      const existing = current?.items.find((item) => item.key === meta.key);
      const target =
        meta.key === 'prot'
          ? targets.protein
          : meta.key === 'carbs'
            ? targets.carbs
            : targets.fats;

      return {
        ...meta,
        grams: existing?.grams ?? 0,
        target,
      };
    });

    const body = {
      clientId,
      // Conserva el consumo diario del cliente; el plan va en `target`.
      calories: current?.calories ?? 0,
      target: targets.calories,
      items,
    };

    const request$ = current
      ? this.api.put<unknown>(`/api/macros/${encodeURIComponent(current._id)}`, body)
      : this.api.post<unknown>('/api/macros', body);

    return request$.pipe(map((raw) => normalizeMacros(raw)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/api/macros/${encodeURIComponent(id)}`);
  }
}
