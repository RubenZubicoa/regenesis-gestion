import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MOCK_CLIENTS } from '../../data/mock-clients';
import { MOCK_PROGRAMS } from '../../data/mock-programs';
import { MOCK_REVIEWS } from '../../data/mock-reviews';
import { MOCK_WEIGHTS } from '../../data/mock-weights';
import type { Client } from '../../models/client';
import type { ClientFilterKey, ClientListItem } from '../../models/client-list-item';
import type { Review } from '../../models/review';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './clients-page.component.html',
  styleUrl: './clients-page.component.scss',
})
export class ClientsPageComponent {
  readonly query = signal('');
  readonly filter = signal<ClientFilterKey>('all');

  readonly filters: { key: ClientFilterKey; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'En curso' },
    { key: 'review', label: 'Revisión' },
    { key: 'finished', label: 'Finalizados' },
  ];

  private readonly listItems = computed(() =>
    MOCK_CLIENTS.map((client, index) => this.toListItem(client, index)),
  );

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.listItems()
      .filter((item) => {
        const matchFilter =
          f === 'all' ||
          (f === 'review' && item.upcomingReview != null) ||
          (f === 'active' && item.timeline === 'active') ||
          (f === 'finished' && item.timeline === 'finished');

        const matchQuery =
          !q ||
          item.fullName.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.goal.toLowerCase().includes(q) ||
          item.programName.toLowerCase().includes(q) ||
          item.plan.toLowerCase().includes(q);

        return matchFilter && matchQuery;
      })
      .sort((a, b) => Number(!!b.upcomingReview) - Number(!!a.upcomingReview));
  });

  readonly stats = computed(() => {
    const items = this.listItems();
    return {
      total: items.length,
      review: items.filter((i) => i.upcomingReview != null).length,
      active: items.filter((i) => i.timeline === 'active').length,
    };
  });

  setFilter(key: ClientFilterKey): void {
    this.filter.set(key);
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  selectClient(client: ClientListItem): void {
    console.info('Cliente seleccionado:', client._id, client.fullName);
  }

  timelineLabel(timeline: ClientListItem['timeline']): string {
    switch (timeline) {
      case 'active':
        return 'En curso';
      case 'finished':
        return 'Finalizado';
      case 'upcoming':
        return 'Por empezar';
    }
  }

  deltaLabel(delta: number | null, unit: string): string {
    if (delta == null) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)} ${unit}`;
  }

  private toListItem(client: Client, index: number): ClientListItem {
    const program = MOCK_PROGRAMS.find((p) => p._id === client.program);
    const upcomingReview =
      MOCK_REVIEWS.find(
        (r: Review) => r.clientId === client._id && r.status === 'upcoming',
      ) ?? null;
    const weight = MOCK_WEIGHTS.find((w) => w.clientId === client._id);
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
