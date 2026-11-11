import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeTechnicalSpecifications } from '../core/normalizers';
import type {
  CreateTechnicalSpecificationsInput,
  TechnicalSpecifications,
  UpdateTechnicalSpecificationsInput,
} from '../models/technical-specifications';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class TechnicalSpecificationsService {
  private readonly api = inject(ApiService);

  getByClient(clientId: string): Observable<TechnicalSpecifications | null> {
    return this.api
      .getOptional<unknown>(
        `/api/technical-specifications/client/${encodeURIComponent(clientId)}`,
      )
      .pipe(map((raw) => (raw ? normalizeTechnicalSpecifications(raw) : null)));
  }

  create(input: CreateTechnicalSpecificationsInput): Observable<TechnicalSpecifications> {
    return this.api
      .post<unknown>('/api/technical-specifications', input)
      .pipe(map((raw) => normalizeTechnicalSpecifications(raw)));
  }

  update(
    id: string,
    input: UpdateTechnicalSpecificationsInput,
  ): Observable<TechnicalSpecifications> {
    return this.api
      .put<unknown>(`/api/technical-specifications/${encodeURIComponent(id)}`, input)
      .pipe(map((raw) => normalizeTechnicalSpecifications(raw)));
  }
}
