import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import {
  COMMUNITY_FEED_KINDS,
  SOCIAL_FEED_FILTERS,
  SOCIAL_FEED_KIND_META,
  communityAvatarUrl,
  fallbackAvatarUrl,
  formatRelativeTime,
  socialFeedAction,
  socialFeedDetail,
  socialFeedMetric,
  type SocialFeedEntry,
  type SocialFeedFilterKey,
  type SocialFeedKind,
  type SocialFeedWorkout,
} from '../../models/social-feed';
import { formatStepsCount, type StepsRankingEntry } from '../../models/steps-ranking';
import { SocialFeedService } from '../../services/social-feed.service';

@Component({
  selector: 'app-community-page',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './community-page.component.html',
  styleUrl: './community-page.component.scss',
})
export class CommunityPageComponent {
  private readonly socialFeed = inject(SocialFeedService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filters = SOCIAL_FEED_FILTERS;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<SocialFeedFilterKey>('all');
  readonly feed = signal<SocialFeedEntry[]>([]);
  readonly weekRanking = signal<StepsRankingEntry[]>([]);
  readonly monthRanking = signal<StepsRankingEntry[]>([]);
  readonly stats = signal({
    activeMembers: 0,
    weeklyWorkouts: 0,
    weeklySteps: 0,
  });

  readonly filteredFeed = computed(() => {
    const kind = this.filter();
    const feed = this.feed().filter((entry) =>
      (COMMUNITY_FEED_KINDS as readonly string[]).includes(entry.kind),
    );
    return kind === 'all' ? feed : feed.filter((entry) => entry.kind === kind);
  });

  readonly weekLeader = computed(() => this.weekRanking()[0]?.steps ?? 1);
  readonly monthLeader = computed(() => this.monthRanking()[0]?.steps ?? 1);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.socialFeed
      .loadBoard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (board) => {
          this.feed.set(board.feed);
          this.weekRanking.set(board.weekRanking);
          this.monthRanking.set(board.monthRanking);
          this.stats.set({
            activeMembers: board.stats.activeMembers,
            weeklyWorkouts: board.stats.weeklyWorkouts,
            weeklySteps: board.stats.weeklySteps,
          });
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'No se pudo cargar la comunidad.');
          this.loading.set(false);
        },
      });
  }

  setFilter(key: SocialFeedFilterKey): void {
    this.filter.set(key);
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

  relativeTime(iso: string): string {
    return formatRelativeTime(iso);
  }

  fullDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  action(entry: SocialFeedEntry): string {
    return socialFeedAction(entry);
  }

  detail(entry: SocialFeedEntry): string {
    return socialFeedDetail(entry);
  }

  metric(entry: SocialFeedEntry): string | undefined {
    return socialFeedMetric(entry);
  }

  kindLabel(kind: SocialFeedKind): string {
    return SOCIAL_FEED_KIND_META[kind].label;
  }

  kindTone(kind: SocialFeedKind): string {
    return SOCIAL_FEED_KIND_META[kind].tone;
  }

  progress(steps: number, leader: number): number {
    if (leader <= 0) return 0;
    return Math.max(6, Math.round((steps / leader) * 100));
  }

  isWorkout(entry: SocialFeedEntry): entry is SocialFeedWorkout {
    return entry.kind === 'workout';
  }
}
