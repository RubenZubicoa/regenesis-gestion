import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { asRecordArray, normalizeProgressImage } from '../core/normalizers';
import {
  isProgressImagePose,
  type ProgressImage,
  type ProgressImagePose,
} from '../models/progress-image';
import { ApiService } from './api.service';

function unwrapList(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    if (Array.isArray(rec['data'])) return rec['data'];
    if (Array.isArray(rec['items'])) return rec['items'];
    if (Array.isArray(rec['results'])) return rec['results'];
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class ProgressImagesService {
  private readonly api = inject(ApiService);

  listByClient(clientId: string): Observable<ProgressImage[]> {
    return this.api
      .get<unknown>(`/api/progress-images?clientId=${encodeURIComponent(clientId)}`)
      .pipe(
        map((raw) =>
          asRecordArray(unwrapList(raw))
            .map(normalizeProgressImage)
            .filter((item) => item._id),
        ),
      );
  }

  create(clientId: string, file: File, pose: ProgressImagePose): Observable<ProgressImage> {
    const body = new FormData();
    body.append('clientId', clientId);
    body.append('pose', pose);
    body.append('image', file, file.name);
    return this.api
      .post<unknown>('/api/progress-images', body)
      .pipe(map((raw) => normalizeProgressImage(raw)));
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/api/progress-images/${encodeURIComponent(id)}`);
  }

  latestByPose(images: ProgressImage[]): Partial<Record<ProgressImagePose, ProgressImage>> {
    const sorted = [...images].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest: Partial<Record<ProgressImagePose, ProgressImage>> = {};
    for (const image of sorted) {
      const pose = isProgressImagePose(image.pose) ? image.pose : 'De frente';
      if (!latest[pose]) latest[pose] = image;
    }
    return latest;
  }
}
