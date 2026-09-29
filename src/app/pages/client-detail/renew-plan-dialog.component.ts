import { Component, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Client } from '../../models/client';
import {
  ClientsService,
  PLAN_RENEWAL_DAYS,
  PLAN_RENEWAL_WEEKS,
} from '../../services/clients.service';

@Component({
  selector: 'app-renew-plan-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './renew-plan-dialog.component.html',
  styleUrl: './renew-plan-dialog.component.scss',
})
export class RenewPlanDialogComponent {
  private readonly clients = inject(ClientsService);

  readonly client = input.required<Client>();

  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly startDate = signal(toDateInput(startOfToday()));
  readonly endDate = signal(toDateInput(addDays(startOfToday(), PLAN_RENEWAL_DAYS)));

  readonly renewalDays = PLAN_RENEWAL_DAYS;
  readonly renewalWeeks = PLAN_RENEWAL_WEEKS;
  readonly planStillActive = computed(() => isBeforeEndDate(this.client().endDate));

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  onStartDate(value: string): void {
    const previousStart = this.startDate();
    this.startDate.set(value);
    const duration = daysBetween(previousStart, this.endDate()) ?? PLAN_RENEWAL_DAYS;
    const nextStart = parseDate(value);
    if (!nextStart) return;
    this.endDate.set(toDateInput(addDays(nextStart, duration)));
  }

  onEndDate(value: string): void {
    this.endDate.set(value);
  }

  confirm(): void {
    const startDate = this.startDate();
    const endDate = this.endDate();
    if (!startDate || !endDate) {
      this.saveError.set('Indica la fecha de inicio y la de fin.');
      return;
    }
    if ((daysBetween(startDate, endDate) ?? -1) < 0) {
      this.saveError.set('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    this.clients.renewPlan(this.client(), { startDate, endDate }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
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

function parseDate(value: string): Date | null {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start: string, end: string): number | null {
  const from = parseDate(start);
  const to = parseDate(end);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
