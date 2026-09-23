import { Component, HostListener, computed, inject, input, output, signal } from '@angular/core';

import type { Client } from '../../models/client';
import {
  ClientsService,
  PLAN_RENEWAL_DAYS,
  PLAN_RENEWAL_WEEKS,
} from '../../services/clients.service';

@Component({
  selector: 'app-renew-plan-dialog',
  standalone: true,
  templateUrl: './renew-plan-dialog.component.html',
  styleUrl: './renew-plan-dialog.component.scss',
})
export class RenewPlanDialogComponent {
  private readonly clients = inject(ClientsService);

  readonly client = input.required<Client>();

  readonly saved = output<Client>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly renewalDays = PLAN_RENEWAL_DAYS;
  readonly renewalWeeks = PLAN_RENEWAL_WEEKS;
  readonly planStillActive = computed(() => isBeforeEndDate(this.client().endDate));
  readonly nextStart = computed(() => toDateInput(startOfToday()));
  readonly nextEnd = computed(() =>
    toDateInput(addDays(startOfToday(), PLAN_RENEWAL_DAYS)),
  );

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  confirm(): void {
    this.saving.set(true);
    this.saveError.set(null);

    this.clients.renewPlan(this.client()).subscribe({
      next: (client) => {
        this.saving.set(false);
        this.saved.emit(client);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}

function isBeforeEndDate(endDate: string): boolean {
  const today = startOfToday();
  const end = new Date(`${endDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(end.getTime())) return false;
  return today < end;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
