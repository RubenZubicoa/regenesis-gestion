import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`).pipe(
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(this.readErrorMessage(err))),
      ),
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body).pipe(
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(this.readErrorMessage(err))),
      ),
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body).pipe(
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(this.readErrorMessage(err))),
      ),
    );
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body).pipe(
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(this.readErrorMessage(err))),
      ),
    );
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${path}`).pipe(
      catchError((err: HttpErrorResponse) =>
        throwError(() => new Error(this.readErrorMessage(err))),
      ),
    );
  }

  /** GET que devuelve null en 404 en lugar de error. */
  getOptional<T>(path: string): Observable<T | null> {
    return this.http.get<T>(`${this.baseUrl}${path}`).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        return throwError(() => new Error(this.readErrorMessage(err)));
      }),
    );
  }

  private readErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está el API en marcha?';
    }
    const parsed = this.parseErrorBody(err.error);
    if (parsed) return parsed;
    return `Error ${err.status}`;
  }

  private parseErrorBody(body: unknown): string | null {
    if (typeof body === 'string' && body.trim()) {
      const trimmed = body.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return this.parseErrorBody(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    if (!body || typeof body !== 'object') return null;

    const rec = body as Record<string, unknown>;
    const fromMessage = this.stringifyErrorValue(rec['message']);
    if (fromMessage) return fromMessage;

    if (Array.isArray(rec['errors'])) {
      const parts = rec['errors']
        .map((item) => this.stringifyErrorValue(item))
        .filter((part): part is string => !!part);
      if (parts.length) return parts.join('. ');
    } else if (rec['errors'] && typeof rec['errors'] === 'object') {
      const parts = Object.values(rec['errors'] as Record<string, unknown>)
        .map((item) => this.stringifyErrorValue(item))
        .filter((part): part is string => !!part);
      if (parts.length) return parts.join('. ');
    }

    const fromError = this.stringifyErrorValue(rec['error']);
    if (fromError && fromError !== 'Bad Request') return fromError;

    return null;
  }

  private stringifyErrorValue(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      const parts = value
        .map((item) => this.stringifyErrorValue(item))
        .filter((part): part is string => !!part);
      return parts.length ? parts.join('. ') : null;
    }
    if (value && typeof value === 'object') {
      const rec = value as Record<string, unknown>;
      return this.stringifyErrorValue(rec['msg'] ?? rec['message'] ?? rec['error']);
    }
    return null;
  }
}
