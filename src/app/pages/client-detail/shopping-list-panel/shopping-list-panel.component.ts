import { Component, computed, inject, input, output, signal } from '@angular/core';

import {
  filesAttachmentName,
  type FilesAttachment,
} from '../../../models/files-attachment';
import { FilesAttachmentsService } from '../../../services/files-attachments.service';

@Component({
  selector: 'app-shopping-list-panel',
  standalone: true,
  templateUrl: './shopping-list-panel.component.html',
  styleUrl: './shopping-list-panel.component.scss',
})
export class ShoppingListPanelComponent {
  private readonly filesApi = inject(FilesAttachmentsService);

  readonly clientId = input.required<string>();
  readonly filesAttachment = input<FilesAttachment | null>(null);

  readonly saved = output<FilesAttachment>();

  readonly file = signal<File | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveOk = signal(false);

  readonly currentUrl = computed(() => this.filesAttachment()?.shoppingList?.trim() ?? '');

  readonly fileLabel = computed(() => {
    const selected = this.file();
    if (selected) return selected.name;
    return filesAttachmentName(this.currentUrl()) || 'Sin archivo';
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    input.value = '';
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      this.error.set('El archivo no puede superar 10 MB.');
      return;
    }
    this.error.set(null);
    this.saveOk.set(false);
    this.file.set(selected);
  }

  save(): void {
    const file = this.file();
    if (!file || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    this.saveOk.set(false);

    this.filesApi.upsertField(this.clientId(), this.filesAttachment(), 'shoppingList', file).subscribe({
      next: (record) => {
        this.saving.set(false);
        this.file.set(null);
        this.saveOk.set(true);
        this.saved.emit(record);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar la lista de la compra.');
      },
    });
  }
}
