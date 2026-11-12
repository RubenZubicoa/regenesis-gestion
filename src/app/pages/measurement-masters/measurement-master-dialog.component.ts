import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';

import {
  emptyMeasurementMasterDraft,
  slugifyMeasurementKey,
  toMeasurementMasterDraft,
  type MeasurementMaster,
  type MeasurementMasterDraft,
} from '../../models/MeasurementMaster';
import { MeasurementMastersService } from '../../services/measurement-masters.service';
import { MeasurementMasterFormComponent } from './measurement-master-form.component';

@Component({
  selector: 'app-measurement-master-dialog',
  standalone: true,
  imports: [MeasurementMasterFormComponent],
  templateUrl: './measurement-master-dialog.component.html',
  styleUrl: './measurement-master-dialog.component.scss',
})
export class MeasurementMasterDialogComponent implements OnInit {
  private readonly mastersApi = inject(MeasurementMastersService);

  readonly master = input<MeasurementMaster | null>(null);

  readonly saved = output<MeasurementMaster>();
  readonly deleted = output<string>();
  readonly closed = output<void>();

  readonly draft = signal<MeasurementMasterDraft>(emptyMeasurementMasterDraft());
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    const current = this.master();
    if (current) this.draft.set(toMeasurementMasterDraft(current));
  }

  get isEdit(): boolean {
    return this.master() != null;
  }

  close(): void {
    if (this.saving() || this.deleting()) return;
    this.closed.emit();
  }

  save(): void {
    const payload = this.normalizedDraft();
    const missing = this.missingFields(payload);
    if (missing.length > 0) {
      this.saveError.set(`Faltan campos obligatorios: ${missing.join(', ')}.`);
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const current = this.master();
    const request$ = current
      ? this.mastersApi.update(current._id, payload)
      : this.mastersApi.create(payload);

    request$.subscribe({
      next: (master) => {
        this.saving.set(false);
        this.saved.emit(master);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  remove(): void {
    const current = this.master();
    if (!current || this.saving() || this.deleting()) return;

    this.deleting.set(true);
    this.saveError.set(null);
    this.mastersApi.remove(current._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit(current._id);
      },
      error: (err: Error) => {
        this.deleting.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  private normalizedDraft(): MeasurementMasterDraft {
    const current = this.draft();
    const label = current.label.trim();
    return {
      label,
      key: current.key.trim() || slugifyMeasurementKey(label),
      unit: current.unit.trim(),
      icon: current.icon.trim(),
    };
  }

  private missingFields(payload: MeasurementMasterDraft): string[] {
    const labels: Record<keyof MeasurementMasterDraft, string> = {
      key: 'clave',
      label: 'nombre',
      unit: 'unidad',
      icon: 'icono',
    };
    return (Object.keys(payload) as (keyof MeasurementMasterDraft)[])
      .filter((field) => !payload[field])
      .map((field) => labels[field]);
  }
}
