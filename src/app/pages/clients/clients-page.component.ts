import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import type { ClientFilterKey, ClientListItem } from '../../models/client-list-item';
import { ClientsService } from '../../services/clients.service';
import { ClientDialogComponent } from './client-dialog.component';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [FormsModule, ClientDialogComponent],
  templateUrl: './clients-page.component.html',
  styleUrl: './clients-page.component.scss',
})
export class ClientsPageComponent {
  private readonly router = inject(Router);
  private readonly clientsService = inject(ClientsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');
  readonly filter = signal<ClientFilterKey>('all');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly listItems = signal<ClientListItem[]>([]);
  readonly dialogOpen = signal(false);

  readonly filters: { key: ClientFilterKey; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 1, label: 'Fase 1' },
    { key: 2, label: 'Fase 2' },
    { key: 3, label: 'Fase 3' },
  ];

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.listItems()
      .filter((item) => {
        const matchFilter = f === 'all' || item.phase === f;

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
      phase1: items.filter((i) => i.phase === 1).length,
      phase2: items.filter((i) => i.phase === 2).length,
      phase3: items.filter((i) => i.phase === 3).length,
    };
  });

  constructor() {
    this.reload(true);
  }

  setFilter(key: ClientFilterKey): void {
    this.filter.set(key);
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  openCreate(): void {
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  onSaved(): void {
    this.closeDialog();
    this.reload(false);
  }

  selectClient(client: ClientListItem): void {
    void this.router.navigate(['/clients', client._id]);
  }

  deltaLabel(delta: number | null, unit: string): string {
    if (delta == null) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)} ${unit}`;
  }

  private reload(showLoading: boolean): void {
    if (showLoading) this.loading.set(true);
    this.error.set(null);
    this.clientsService
      .loadListItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.listItems.set(items);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
