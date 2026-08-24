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
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      return String((body as { message: string }).message);
    }
    return `Error ${err.status}`;
  }
}
