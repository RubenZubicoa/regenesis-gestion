import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeSupplements } from '../core/normalizers';
import type { SupplementElement, Supplements } from '../models/supplements';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SupplementsService {
  private readonly api = inject(ApiService);

  save(
    clientId: string,
    current: Supplements | null,
    elements: SupplementElement[],
  ): Observable<Supplements> {
    const body = { clientId, elements };

    const request$ = current
      ? this.api.put<unknown>(
          `/api/supplements/${encodeURIComponent(current._id)}`,
          body,
        )
      : this.api.post<unknown>('/api/supplements', body);

    return request$.pipe(map((raw) => normalizeSupplements(raw)));
  }
}
