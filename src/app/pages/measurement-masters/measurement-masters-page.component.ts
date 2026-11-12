import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import type { MeasurementMaster } from '../../models/MeasurementMaster';
import { MeasurementMastersService } from '../../services/measurement-masters.service';
import { MeasurementMasterDialogComponent } from './measurement-master-dialog.component';

@Component({
  selector: 'app-measurement-masters-page',
  standalone: true,
  imports: [FormsModule, MeasurementMasterDialogComponent],
  templateUrl: './measurement-masters-page.component.html',
  styleUrl: './measurement-masters-page.component.scss',
})
export class MeasurementMastersPageComponent {
  private readonly mastersApi = inject(MeasurementMastersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly masters = signal<MeasurementMaster[]>([]);
  readonly dialogOpen = signal(false);
  readonly editing = signal<MeasurementMaster | null>(null);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.masters().filter((item) => {
      if (!q) return true;
      return [item.label, item.key, item.unit].some((value) =>
        value.toLowerCase().includes(q),
      );
    });
  });

  constructor() {
    this.reload();
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(master: MeasurementMaster): void {
    this.editing.set(master);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  onSaved(master: MeasurementMaster): void {
    this.masters.update((list) => {
      const idx = list.findIndex((item) => item._id === master._id);
      const next =
        idx === -1 ? [...list, master] : list.map((item, i) => (i === idx ? master : item));
      return next.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    });
    this.closeDialog();
  }

  onDeleted(id: string): void {
    this.masters.update((list) => list.filter((item) => item._id !== id));
    this.closeDialog();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.mastersApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.masters.set(list);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
