import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { asRecordArray, normalizeClient, normalizeReview } from '../core/normalizers';
import type { Client } from '../models/client';
import type { Review, ReviewStatus } from '../models/review';
import { ApiService } from './api.service';

export interface ReviewPayload {
  clientId: string;
  title: string;
  date: string;
  status: ReviewStatus;
  note: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly api = inject(ApiService);

  list(status?: ReviewStatus): Observable<Review[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.api
      .get<unknown[]>(`/api/reviews${query}`)
      .pipe(map((raw) => asRecordArray(raw).map(normalizeReview)));
  }

  listByClient(clientId: string): Observable<Review[]> {
    return this.api
      .get<unknown[]>(`/api/reviews/client/${encodeURIComponent(clientId)}`)
      .pipe(map((raw) => asRecordArray(raw).map(normalizeReview)));
  }

  listClients(): Observable<Client[]> {
    return this.api
      .get<unknown[]>('/api/clients')
      .pipe(
        map((raw) =>
          asRecordArray(raw)
            .map(normalizeClient)
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')),
        ),
      );
  }

  create(payload: ReviewPayload): Observable<Review> {
    return this.api
      .post<unknown>('/api/reviews', payload)
      .pipe(map(normalizeReview));
  }

  update(id: string, payload: Partial<ReviewPayload>): Observable<Review> {
    return this.api
      .put<unknown>(`/api/reviews/${encodeURIComponent(id)}`, payload)
      .pipe(map(normalizeReview));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/api/reviews/${encodeURIComponent(id)}`);
  }
}
