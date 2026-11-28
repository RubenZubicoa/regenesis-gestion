import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeFilesAttachment } from '../core/normalizers';
import type { FilesAttachment, FilesAttachmentField } from '../models/files-attachment';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class FilesAttachmentsService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/files-attachments';

  getByClient(clientId: string): Observable<FilesAttachment | null> {
    return this.api
      .getOptional<unknown>(`${this.path}/client/${encodeURIComponent(clientId)}`)
      .pipe(map((raw) => (raw ? normalizeFilesAttachment(raw) : null)));
  }

  upsertField(
    clientId: string,
    current: FilesAttachment | null,
    field: FilesAttachmentField,
    file: File,
  ): Observable<FilesAttachment> {
    const body = new FormData();
    body.append('clientId', clientId);
    body.append(field, file, file.name);

    const request$ = current?._id
      ? this.api.put<unknown>(`${this.path}/${encodeURIComponent(current._id)}`, body)
      : this.api.post<unknown>(this.path, body);

    return request$.pipe(map((raw) => normalizeFilesAttachment(raw)));
  }

  clearField(
    current: FilesAttachment,
    field: FilesAttachmentField,
  ): Observable<FilesAttachment> {
    return this.api
      .delete<unknown>(
        `${this.path}/${encodeURIComponent(current._id)}/${encodeURIComponent(field)}`,
      )
      .pipe(
        map((raw) =>
          raw && typeof raw === 'object'
            ? normalizeFilesAttachment(raw)
            : { ...current, [field]: '' },
        ),
      );
  }
}
