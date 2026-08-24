import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import {
  asRecordArray,
  normalizeClient,
  normalizeProgram,
  normalizeReview,
  normalizeWeight,
} from '../core/normalizers';
import type { Client } from '../models/client';
import type { ClientListItem } from '../models/client-list-item';
import type { Program } from '../models/program';
import type { Review } from '../models/review';
import type { Weight } from '../models/weight';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(ApiService);

  loadListItems(): Observable<ClientListItem[]> {
    return forkJoin({
      clients: this.api.get<unknown[]>('/api/clients'),
      programs: this.api.get<unknown[]>('/api/programs'),
      reviews: this.api.get<unknown[]>('/api/reviews'),
      weights: this.api.get<unknown[]>('/api/weights'),
    }).pipe(map((payload) => this.buildListItems(payload)));
  }

  private buildListItems(payload: {
    clients: unknown[];
    programs: unknown[];
    reviews: unknown[];
    weights: unknown[];
  }): ClientListItem[] {
    const programs = asRecordArray(payload.programs).map(normalizeProgram);
    const reviews = asRecordArray(payload.reviews).map(normalizeReview);
    const weights = asRecordArray(payload.weights).map(normalizeWeight);

    const programById = new Map(programs.map((p) => [p._id, p]));
    const reviewsByClient = new Map<string, Review[]>();
    for (const review of reviews) {
      const list = reviewsByClient.get(review.clientId) ?? [];
      list.push(review);
      reviewsByClient.set(review.clientId, list);
    }
    const weightByClient = new Map(weights.map((w) => [w.clientId, w]));

    return asRecordArray(payload.clients).map((raw, index) =>
      this.toListItem(normalizeClient(raw), index, programById, reviewsByClient, weightByClient),
    );
  }

  private toListItem(
    client: Client,
    index: number,
    programById: Map<string, Program>,
    reviewsByClient: Map<string, Review[]>,
    weightByClient: Map<string, Weight>,
  ): ClientListItem {
    const program = programById.get(client.program);
    const clientReviews = reviewsByClient.get(client._id) ?? [];
    const upcomingReview =
      clientReviews.find((review) => review.status === 'upcoming') ?? null;
    const weight = weightByClient.get(client._id);
    const weightDelta =
      weight != null ? Number((weight.current - weight.start).toFixed(1)) : null;

    return {
      ...client,
      programName: program?.name ?? 'Sin programa',
      upcomingReview,
      weightDelta,
      weightUnit: weight?.unit ?? 'kg',
      timeline: this.resolveTimeline(client.startDate, client.endDate),
      accent: (['gold', 'teal', 'coral', 'blue'] as const)[index % 4],
    };
  }

  private resolveTimeline(
    startDate: string,
    endDate: string,
  ): ClientListItem['timeline'] {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'active';
    }
    if (today < start) return 'upcoming';
    if (today > end) return 'finished';
    return 'active';
  }
}
