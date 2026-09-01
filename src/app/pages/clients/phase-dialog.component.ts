import { Component, HostListener, OnInit, inject, input, output, signal } from '@angular/core';

import type { Client } from '../../models/client';
import { ClientsService } from '../../services/clients.service';

@Component({
  selector: 'app-phase-dialog',
  standalone: true,
  templateUrl: './phase-dialog.component.html',
  styleUrl: './phase-dialog.component.scss',
})
export class PhaseDialogComponent implements OnInit {
  private readonly clients = inject(ClientsService);

  readonly client = input.required<Client>();

  readonly saved = output<Client>();
  readonly closed = output<void>();

  readonly phase = signal(1);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    this.phase.set(this.client().phase);
  }

  get phases(): number[] {
    const total = this.client().totalPhases || 3;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  setPhase(phase: number): void {
    this.phase.set(phase);
  }

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  save(): void {
    const phase = this.phase();
    const current = this.client();
    if (phase < 1 || phase > (current.totalPhases || 3)) {
      this.saveError.set('Selecciona una fase válida.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    this.clients.changePhase(current, phase).subscribe({
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
}
