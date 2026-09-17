import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { SKIP_AUTH } from './http-context';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  const isApiRequest = req.url.startsWith(apiUrl);
  const skipAuth =
    req.context.get(SKIP_AUTH) || req.url.includes('/api/trainers/login');
  const token = auth.token();

  const authedReq =
    isApiRequest && token && !skipAuth
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req.clone({ headers: req.headers.delete('Authorization') });

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApiRequest && !skipAuth) {
        auth.logout();
        void router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
