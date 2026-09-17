import { HttpContextToken } from '@angular/common/http';

/** Peticiones públicas (login). El interceptor no añade JWT. */
export const SKIP_AUTH = new HttpContextToken(() => false);
