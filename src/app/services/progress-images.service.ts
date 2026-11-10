import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { normalizeProgressImage } from '../core/normalizers';
import type { ProgressImage, ProgressImagePose } from '../models/progress-image';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProgressImagesService {
  private readonly api = inject(ApiService);

  create(clientId: string, file: File, pose: ProgressImagePose): Observable<ProgressImage> {
    const body = new FormData();
    body.append('clientId', clientId);
    body.append('pose', pose);
    body.append('image', file, file.name);
    return this.api
      .post<unknown>('/api/progress-images', body)
      .pipe(map((raw) => normalizeProgressImage(raw)));
  }
}
