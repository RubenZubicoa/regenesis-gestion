import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { asRecordArray, normalizeClient, normalizeDailySteps } from '../core/normalizers';
import type { DailySteps } from '../models/daily-steps';
import {
  communityAvatarUrl,
  normalizeCommunityStats,
  normalizeSocialFeedEntry,
  type CommunityStats,
  type SocialFeedEntry,
} from '../models/social-feed';
import {
  normalizeStepsRankingEntry,
  type RankingClient,
  type StepsRankingEntry,
  type StepsRankingPeriod,
} from '../models/steps-ranking';
import { ApiService } from './api.service';

export type CommunityBoard = {
  feed: SocialFeedEntry[];
  stats: CommunityStats;
  weekRanking: StepsRankingEntry[];
  monthRanking: StepsRankingEntry[];
};

export type RankingArchive = {
  clients: RankingClient[];
  records: DailySteps[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function unwrapList(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  const rec = asRecord(raw);
  if (Array.isArray(rec['data'])) return rec['data'];
  if (Array.isArray(rec['items'])) return rec['items'];
  if (Array.isArray(rec['feed'])) return rec['feed'];
  if (Array.isArray(rec['entries'])) return rec['entries'];
  if (Array.isArray(rec['posts'])) return rec['posts'];
  return [];
}

function unwrapStats(raw: unknown): Record<string, unknown> {
  const rec = asRecord(raw);
  if (rec['data'] && typeof rec['data'] === 'object' && !Array.isArray(rec['data'])) {
    return rec['data'] as Record<string, unknown>;
  }
  if (rec['stats'] && typeof rec['stats'] === 'object' && !Array.isArray(rec['stats'])) {
    return rec['stats'] as Record<string, unknown>;
  }
  return rec;
}

@Injectable({ providedIn: 'root' })
export class SocialFeedService {
  private readonly api = inject(ApiService);

  list(): Observable<SocialFeedEntry[]> {
    return this.api.get<unknown>('/api/social-feed').pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeSocialFeedEntry)
          .filter((item): item is SocialFeedEntry => item != null),
      ),
    );
  }

  stats(): Observable<CommunityStats> {
    return this.api
      .get<unknown>('/api/social-feed/stats')
      .pipe(map((raw) => normalizeCommunityStats(unwrapStats(raw))));
  }

  loadRankingArchive(): Observable<RankingArchive> {
    return this.api.get<unknown>('/api/clients').pipe(
      switchMap((raw) => {
        const clients = asRecordArray(unwrapList(raw)).map(normalizeClient);
        if (!clients.length) {
          return of({ clients: [] as RankingClient[], records: [] as DailySteps[] });
        }

        return forkJoin(
          clients.map((client) =>
            this.api
              .get<unknown>(`/api/daily-steps/${encodeURIComponent(client._id)}`)
              .pipe(
                map((stepsRaw) => asRecordArray(unwrapList(stepsRaw)).map(normalizeDailySteps)),
                catchError(() => of([] as DailySteps[])),
              ),
          ),
        ).pipe(
          map((groups) => ({
            clients: clients.map((client) => {
              const fullName = client.fullName || client.name || 'Cliente';
              return {
                clientId: client._id,
                fullName,
                avatar: communityAvatarUrl(fullName, client.avatar),
              };
            }),
            records: groups.flat(),
          })),
        );
      }),
    );
  }

  ranking(period: StepsRankingPeriod): Observable<StepsRankingEntry[]> {
    return this.api.get<unknown>(`/api/daily-steps/ranking?period=${period}`).pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeStepsRankingEntry)
          .filter((item) => item.clientId && item.steps > 0),
      ),
    );
  }

  loadBoard(): Observable<CommunityBoard> {
    return forkJoin({
      feed: this.list(),
      stats: this.stats(),
      weekRanking: this.ranking('week').pipe(catchError(() => of([] as StepsRankingEntry[]))),
      monthRanking: this.ranking('month').pipe(catchError(() => of([] as StepsRankingEntry[]))),
    }).pipe(
      map(({ feed, stats, weekRanking, monthRanking }) => ({
        feed,
        stats,
        weekRanking: stats.hasEmbeddedRanking ? stats.weekRanking : weekRanking,
        monthRanking: stats.hasEmbeddedRanking ? stats.monthRanking : monthRanking,
      })),
    );
  }
}
