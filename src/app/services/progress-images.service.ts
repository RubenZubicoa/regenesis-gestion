import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, of, switchMap, throwError } from 'rxjs';

import { asRecordArray, normalizeProgressImage } from '../core/normalizers';
import {
  isProgressImagePose,
  progressImageDateInput,
  type ProgressImage,
  type ProgressImagePose,
} from '../models/progress-image';
import { ApiService } from './api.service';

const CLIENT_DATES_KEY = 'progressImageDates';

function unwrapList(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    if (Array.isArray(rec['data'])) return rec['data'];
    if (Array.isArray(rec['items'])) return rec['items'];
    if (Array.isArray(rec['results'])) return rec['results'];
    if (Array.isArray(rec['images'])) return rec['images'];
    if (Array.isArray(rec['progressImages'])) return rec['progressImages'];
  }
  return [];
}

function poseOf(image: ProgressImage): ProgressImagePose {
  return isProgressImagePose(image.pose) ? image.pose : 'De frente';
}

function dateOf(image: ProgressImage): string {
  return progressImageDateInput(image.date || image.createdAt);
}

function isMissingUpdateRoute(err: Error): boolean {
  return /404|405|501|not_found|not found|cannot put/i.test(err.message);
}

function readDateMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const nested = (raw as Record<string, unknown>)[CLIENT_DATES_KEY];
  const source =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : {};
  const map: Record<string, string> = {};
  for (const [id, value] of Object.entries(source)) {
    const date = String(value ?? '').slice(0, 10);
    if (id && /^\d{4}-\d{2}-\d{2}$/.test(date)) map[id] = date;
  }
  return map;
}

function applyDate(image: ProgressImage, date: string): ProgressImage {
  const day = date.slice(0, 10);
  return {
    ...image,
    date: day,
    createdAt: `${day}T12:00:00.000Z`,
  };
}

@Injectable({ providedIn: 'root' })
export class ProgressImagesService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/progress-images';

  listByClient(clientId: string): Observable<ProgressImage[]> {
    return forkJoin({
      images: this.api.get<unknown>(`${this.path}?clientId=${encodeURIComponent(clientId)}`),
      dates: this.loadDateMap(clientId),
    }).pipe(
      map(({ images, dates }) =>
        asRecordArray(unwrapList(images))
          .map(normalizeProgressImage)
          .filter((item) => item._id)
          .map((item) => (dates[item._id] ? applyDate(item, dates[item._id]) : item))
          .sort((a, b) => dateOf(b).localeCompare(dateOf(a)) || b.createdAt.localeCompare(a.createdAt)),
      ),
    );
  }

  save(
    clientId: string,
    input: { pose: ProgressImagePose; file: File; date: string },
  ): Observable<ProgressImage[]> {
    const date = input.date.slice(0, 10);
    return this.create(clientId, input.pose, input.file, date).pipe(
      switchMap((created) => this.rememberDate(clientId, created._id, date).pipe(map(() => created))),
      switchMap(() => this.listByClient(clientId)),
    );
  }

  update(
    clientId: string,
    current: ProgressImage,
    input: { pose: ProgressImagePose; file?: File | null; date: string },
  ): Observable<ProgressImage[]> {
    const date = input.date.slice(0, 10);
    const poseChanged = poseOf(current) !== input.pose;
    const dateChanged = dateOf(current) !== date;
    const file = input.file ?? null;

    if (!file && !poseChanged && !dateChanged) {
      return this.listByClient(clientId);
    }

    return this.putUpdate(current._id, { pose: input.pose, file, date }).pipe(
      catchError((err: Error) => {
        if (!isMissingUpdateRoute(err)) return throwError(() => err);
        if (file || poseChanged) {
          return this.replace(clientId, current, { pose: input.pose, file, date });
        }
        return of(undefined);
      }),
      switchMap((created) => {
        const id = created?._id || current._id;
        return this.rememberDate(clientId, id, date, created?._id ? current._id : undefined);
      }),
      switchMap(() => this.listByClient(clientId)),
    );
  }

  remove(clientId: string, id: string): Observable<ProgressImage[]> {
    return this.api.delete(`${this.path}/${encodeURIComponent(id)}`).pipe(
      switchMap(() => this.rememberDate(clientId, id, null)),
      switchMap(() => this.listByClient(clientId)),
      catchError(() => this.listByClient(clientId).pipe(catchError(() => of([])))),
    );
  }

  latestByPose(images: ProgressImage[]): Partial<Record<ProgressImagePose, ProgressImage>> {
    const sorted = [...images].sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
    const latest: Partial<Record<ProgressImagePose, ProgressImage>> = {};
    for (const image of sorted) {
      const pose = poseOf(image);
      if (!latest[pose]) latest[pose] = image;
    }
    return latest;
  }

  private putUpdate(
    id: string,
    input: { pose: ProgressImagePose; file?: File | null; date: string },
  ): Observable<ProgressImage | undefined> {
    const body = new FormData();
    body.append('pose', input.pose);
    body.append('createdAt', input.date);
    body.append('date', input.date);
    if (input.file) body.append('image', input.file, input.file.name);
    return this.api.put<unknown>(`${this.path}/${encodeURIComponent(id)}`, body).pipe(
      map((raw) => (raw ? normalizeProgressImage(raw) : undefined)),
    );
  }

  private replace(
    clientId: string,
    current: ProgressImage,
    input: { pose: ProgressImagePose; file?: File | null; date: string },
  ): Observable<ProgressImage> {
    const file$ = input.file
      ? of(input.file)
      : from(this.fileFromUrl(current.image)).pipe(
          catchError(() => {
            throw new Error('Para cambiar el tipo o la fecha, vuelve a elegir el archivo.');
          }),
        );

    return file$.pipe(
      switchMap((imageFile) => this.create(clientId, input.pose, imageFile, input.date)),
      switchMap((created) =>
        this.api.delete(`${this.path}/${encodeURIComponent(current._id)}`).pipe(
          catchError(() => of(undefined)),
          map(() => created),
        ),
      ),
    );
  }

  private create(
    clientId: string,
    pose: ProgressImagePose,
    file: File,
    date: string,
  ): Observable<ProgressImage> {
    const body = new FormData();
    const createdAt = date.slice(0, 10);
    body.append('clientId', clientId);
    body.append('pose', pose);
    body.append('createdAt', createdAt);
    body.append('date', createdAt);
    body.append('image', file, file.name);
    return this.api.post<unknown>(this.path, body).pipe(
      map((raw) => normalizeProgressImage(raw)),
      map((created) => (created._id ? applyDate(created, createdAt) : created)),
    );
  }

  private loadDateMap(clientId: string): Observable<Record<string, string>> {
    return this.api.get<unknown>(`/api/clients/${encodeURIComponent(clientId)}`).pipe(
      map(readDateMap),
      catchError(() => of({})),
    );
  }

  private rememberDate(
    clientId: string,
    imageId: string,
    date: string | null,
    previousId?: string,
  ): Observable<void> {
    if (!imageId) return of(undefined);
    return this.loadDateMap(clientId).pipe(
      switchMap((current) => {
        const next = { ...current };
        if (previousId && previousId !== imageId) delete next[previousId];
        if (date) next[imageId] = date.slice(0, 10);
        else delete next[imageId];
        return this.api.put<unknown>(`/api/clients/${encodeURIComponent(clientId)}`, {
          [CLIENT_DATES_KEY]: next,
        });
      }),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  private async fileFromUrl(url: string): Promise<File> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('No se pudo leer la imagen actual.');
    }
    const blob = await response.blob();
    const type = blob.type || 'image/jpeg';
    const ext = type.split('/')[1]?.split('+')[0] || 'jpg';
    return new File([blob], `photo.${ext}`, { type });
  }
}
