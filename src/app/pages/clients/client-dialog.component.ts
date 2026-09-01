import { Component, HostListener, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Client } from '../../models/client';
import { ClientsService } from '../../services/clients.service';

const DEFAULT_COACH = 'Onatz Health Coach';
const DEFAULT_PLAN = 'Método Regenesis';
const DEFAULT_TOTAL_WEEKS = 12;
const DEFAULT_TOTAL_PHASES = 3;

@Component({
  selector: 'app-client-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './client-dialog.component.html',
  styleUrl: './client-dialog.component.scss',
})
export class ClientDialogComponent {
  private readonly clients = inject(ClientsService);

  readonly saved = output<Client>();
  readonly closed = output<void>();

  readonly fullName = signal('');
  readonly email = signal('');
  readonly telefono = signal('');
  readonly password = signal('');
  readonly goal = signal('');
  readonly coach = signal(DEFAULT_COACH);
  readonly plan = signal(DEFAULT_PLAN);
  readonly startDate = signal(toDateInput(new Date()));
  readonly endDate = signal(toDateInput(addWeeks(new Date(), DEFAULT_TOTAL_WEEKS)));
  readonly totalWeeks = signal(DEFAULT_TOTAL_WEEKS);
  readonly avatar = signal('');

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  onStartDate(value: string): void {
    this.startDate.set(value);
    this.syncTotalWeeks();
  }

  onEndDate(value: string): void {
    this.endDate.set(value);
    this.syncTotalWeeks();
  }

  save(): void {
    const fullName = this.fullName().trim();
    const email = this.email().trim();
    const telefono = this.telefono().trim();
    const password = this.password();
    const goal = this.goal().trim();
    const coach = this.coach().trim();
    const plan = this.plan().trim();
    const startDate = this.startDate().trim();
    const endDate = this.endDate().trim();
    const totalWeeks = Number(this.totalWeeks());
    const avatar = this.avatar().trim();

    if (!fullName) {
      this.saveError.set('El nombre completo es obligatorio.');
      return;
    }
    if (!email) {
      this.saveError.set('El email es obligatorio.');
      return;
    }
    if (!isValidEmail(email)) {
      this.saveError.set('El email no es válido.');
      return;
    }
    if (!telefono) {
      this.saveError.set('El teléfono es obligatorio.');
      return;
    }
    if (!password.trim()) {
      this.saveError.set('La contraseña es obligatoria.');
      return;
    }
    if (password.trim().length < 6) {
      this.saveError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!goal) {
      this.saveError.set('El objetivo es obligatorio.');
      return;
    }
    if (!coach) {
      this.saveError.set('El coach es obligatorio.');
      return;
    }
    if (!plan) {
      this.saveError.set('El plan es obligatorio.');
      return;
    }
    if (!startDate || !endDate) {
      this.saveError.set('Indica las fechas de inicio y fin.');
      return;
    }
    if (endDate < startDate) {
      this.saveError.set('La fecha de fin no puede ser anterior al inicio.');
      return;
    }
    if (!Number.isFinite(totalWeeks) || totalWeeks < 1) {
      this.saveError.set('Las semanas totales deben ser al menos 1.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    this.clients
      .create({
        name: firstNameFrom(fullName),
        fullName,
        email,
        telefono,
        password: password.trim(),
        goal,
        coach,
        plan,
        startDate,
        endDate,
        week: 1,
        totalWeeks,
        phase: 1,
        totalPhases: DEFAULT_TOTAL_PHASES,
        avatar: avatar || defaultAvatar(fullName),
      })
      .subscribe({
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  private syncTotalWeeks(): void {
    const weeks = weeksBetween(this.startDate(), this.endDate());
    if (weeks != null) this.totalWeeks.set(weeks);
  }
}

function firstNameFrom(fullName: string): string {
  return fullName.split(/\s+/).find((part) => part.length > 0) ?? fullName;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addWeeks(d: Date, weeks: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function weeksBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const from = new Date(`${start}T12:00:00`);
  const to = new Date(`${end}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return null;
  }
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(days / 7));
}

function defaultAvatar(fullName: string): string {
  const name = encodeURIComponent(fullName || 'Cliente');
  return `https://ui-avatars.com/api/?name=${name}&background=0A1B33&color=F2C868&size=400`;
}
