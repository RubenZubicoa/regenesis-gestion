import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { communityAvatarUrl, fallbackAvatarUrl } from '../../models/social-feed';
import {
  buildStepsRanking,
  canGoToNextPeriod,
  formatPeriodLabel,
  formatStepsCount,
  isCurrentPeriod,
  shiftPeriod,
  type RankingClient,
  type StepsRankingPeriod,
} from '../../models/steps-ranking';
import type { DailySteps } from '../../models/daily-steps';
import { SocialFeedService } from '../../services/social-feed.service';

@Component({
  selector: 'app-community-ranking-history-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './community-ranking-history-page.component.html',
  styleUrl: './community-ranking-history-page.component.scss',
})
export class CommunityRankingHistoryPageComponent {
  private readonly socialFeed = inject(SocialFeedService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly views: { key: StepsRankingPeriod; label: string }[] = [
    { key: 'week', label: 'Semanas' },
    { key: 'month', label: 'Meses' },
  ];

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly period = signal<StepsRankingPeriod>('week');
  readonly cursor = signal(new Date());
  readonly clients = signal<RankingClient[]>([]);
  readonly records = signal<DailySteps[]>([]);

  readonly ranking = computed(() =>
    buildStepsRanking(this.clients(), this.records(), this.period(), this.cursor()),
  );
  readonly leader = computed(() => this.ranking()[0]?.steps ?? 1);
  readonly periodLabel = computed(() => formatPeriodLabel(this.cursor(), this.period()));
  readonly isCurrent = computed(() => isCurrentPeriod(this.cursor(), this.period()));
  readonly canGoNext = computed(() => canGoToNextPeriod(this.cursor(), this.period()));

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.period.set(params.get('period') === 'month' ? 'month' : 'week');
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.socialFeed
      .loadRankingArchive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (archive) => {
          this.clients.set(archive.clients);
          this.records.set(archive.records);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'No se pudo cargar el histórico de pasos.');
          this.loading.set(false);
        },
      });
  }

  setPeriod(period: StepsRankingPeriod): void {
    if (this.period() === period) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { period },
      queryParamsHandling: 'merge',
    });
  }

  prev(): void {
    this.cursor.set(shiftPeriod(this.cursor(), this.period(), -1));
  }

  next(): void {
    if (!this.canGoNext()) return;
    this.cursor.set(shiftPeriod(this.cursor(), this.period(), 1));
  }

  avatarUrl(name: string, avatar?: string): string {
    return communityAvatarUrl(name, avatar);
  }

  onAvatarError(event: Event, name: string): void {
    const img = event.target as HTMLImageElement;
    const fallback = fallbackAvatarUrl(name);
    if (img.src !== fallback) img.src = fallback;
  }

  formatSteps(value: number): string {
    return formatStepsCount(value);
  }

  progress(steps: number, leader: number): number {
    if (leader <= 0) return 0;
    return Math.max(6, Math.round((steps / leader) * 100));
  }

  emptyLabel(): string {
    return this.period() === 'week'
      ? 'Aún no hay pasos registrados en esta semana.'
      : 'Aún no hay pasos registrados en este mes.';
  }
}
