import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { TrainerSession } from '../models/trainer-session';
import { ApiService } from './api.service';

const STORAGE_KEY = 'regenesis.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly session = signal<TrainerSession | null>(readStoredSession());

  readonly token = computed(() => this.session()?.token ?? null);
  readonly trainerName = computed(() => this.session()?.name || 'Entrenador');
  readonly trainerEmail = computed(() => this.session()?.email ?? '');
  readonly isLoggedIn = computed(() => !!this.token());

  login(email: string, password: string): Observable<TrainerSession> {
    return this.api
      .post<unknown>('/api/trainers/login', { email, password }, { skipAuth: true })
      .pipe(
        map((raw) => {
          const session = normalizeTrainerSession(raw, email);
          this.persist(session);
          return session;
        }),
      );
  }

  logout(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode / SSR */
    }
  }

  private persist(session: TrainerSession): void {
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* private mode / SSR */
    }
  }
}

function readStoredSession(): TrainerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrainerSession>;
    if (!parsed.token || typeof parsed.token !== 'string') return null;
    return {
      token: parsed.token,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
    };
  } catch {
    return null;
  }
}

function normalizeTrainerSession(raw: unknown, fallbackEmail: string): TrainerSession {
  const token = readToken(raw);
  if (!token) {
    throw new Error('La respuesta del servidor no incluye un token.');
  }

  const profile = readProfile(raw);
  const jwt = decodeJwtPayload(token);

  return {
    token,
    name:
      profile.name ||
      str(jwt, 'name') ||
      str(jwt, 'fullName') ||
      str(jwt, 'nombre') ||
      '',
    email: profile.email || str(jwt, 'email') || fallbackEmail,
  };
}

function readToken(raw: unknown): string {
  if (typeof raw === 'string' && looksLikeJwt(raw)) return raw.trim();

  const rec = asRecord(raw);
  const keys = ['token', 'accessToken', 'access_token', 'jwt', 'idToken'];
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  if (rec['data'] && typeof rec['data'] === 'object') {
    return readToken(rec['data']);
  }

  return '';
}

function readProfile(raw: unknown): { name: string; email: string } {
  const rec = asRecord(raw);
  const nested = [rec['trainer'], rec['user'], rec['data'], rec].find(
    (item) => item && typeof item === 'object' && !Array.isArray(item),
  );
  const profile = asRecord(nested);

  return {
    name: str(profile, 'name') || str(profile, 'fullName') || str(profile, 'nombre'),
    email: str(profile, 'email'),
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1];
    if (!part) return {};
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    return asRecord(parsed);
  } catch {
    return {};
  }
}

function looksLikeJwt(value: string): boolean {
  return value.split('.').length === 3;
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function str(rec: Record<string, unknown>, key: string): string {
  const value = rec[key];
  return typeof value === 'string' ? value.trim() : '';
}
