import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { asRecordArray, normalizeId } from '../core/normalizers';
import type {
  VideoLibraryCategory,
  VideoLibraryCategoryDB,
  VideoLibraryItem,
  VideoLibraryKind,
  VideoLibraryTone,
} from '../models/video-library';
import { toVideoLibraryCategory } from '../models/video-library';
import { ApiService } from './api.service';

export interface VideoLibraryInput {
  category: string;
  icon: string;
  tone: VideoLibraryTone;
  items: VideoLibraryItem[];
}

function unwrapList(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    if (Array.isArray(rec['data'])) return rec['data'];
    if (Array.isArray(rec['items'])) return rec['items'];
    if (Array.isArray(rec['categories'])) return rec['categories'];
  }
  return [];
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function normalizeKind(value: unknown): VideoLibraryKind {
  return String(value).toLowerCase().includes('pdf') ? 'PDF' : 'Vídeo';
}

function normalizeTone(value: unknown): VideoLibraryTone {
  const tone = String(value ?? 'gold');
  if (tone === 'primary' || tone === 'purple') return tone;
  return 'gold';
}

function normalizeItem(raw: unknown): VideoLibraryItem {
  const r = asRecord(raw);
  const phase = Number(r['phase'] ?? 1);
  return {
    title: String(r['title'] ?? '').trim(),
    type: normalizeKind(r['type']),
    length: String(r['length'] ?? '').trim(),
    phase: phase >= 1 && phase <= 3 ? phase : 1,
    url: String(r['url'] ?? '').trim(),
  };
}

function normalizeCategory(raw: unknown): VideoLibraryCategory {
  const r = asRecord(raw);
  const itemsRaw = Array.isArray(r['items']) ? r['items'] : [];
  const db: VideoLibraryCategoryDB = {
    _id: normalizeId(r['_id'] || r['id']),
    category: String(r['category'] ?? r['name'] ?? '').trim(),
    icon: String(r['icon'] ?? 'play-outline').trim() || 'play-outline',
    tone: normalizeTone(r['tone']),
    items: itemsRaw.map(normalizeItem),
  };
  return toVideoLibraryCategory(db);
}

@Injectable({ providedIn: 'root' })
export class VideoLibraryService {
  private readonly api = inject(ApiService);
  private readonly path = '/api/video-library';

  list(): Observable<VideoLibraryCategory[]> {
    return this.api.get<unknown>(this.path).pipe(
      map((raw) =>
        asRecordArray(unwrapList(raw))
          .map(normalizeCategory)
          .filter((item) => item.uuid)
          .sort((a, b) => a.category.localeCompare(b.category, 'es')),
      ),
    );
  }

  create(input: VideoLibraryInput): Observable<VideoLibraryCategory> {
    return this.api
      .post<unknown>(this.path, this.toBody(input))
      .pipe(map(normalizeCategory));
  }

  update(id: string, input: VideoLibraryInput): Observable<VideoLibraryCategory> {
    const body = this.toBody(input);
    const path = `${this.path}/${encodeURIComponent(id)}`;
    return this.api.put<unknown>(path, body).pipe(
      catchError((err: Error) => {
        const msg = err.message.toLowerCase();
        const maybeWrongMethod =
          msg.includes('404') ||
          msg.includes('405') ||
          msg.includes('not allowed') ||
          msg.includes('cannot put');
        return maybeWrongMethod
          ? this.api.patch<unknown>(path, body)
          : throwError(() => err);
      }),
      map(normalizeCategory),
    );
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`${this.path}/${encodeURIComponent(id)}`);
  }

  private toBody(input: VideoLibraryInput): Record<string, unknown> {
    return {
      category: input.category.trim(),
      icon: input.icon.trim(),
      tone: input.tone,
      items: input.items.map((item) => ({
        title: item.title.trim(),
        type: item.type,
        length: item.length.trim(),
        phase: item.phase,
        url: item.url.trim(),
      })),
    };
  }
}
