import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      this.error.set('Introduce tu email y contraseña.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(loginErrorMessage(err));
      },
    });
  }
}

function loginErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message.trim() : '';
  if (message === 'Error 401' || message === 'Unauthorized') {
    return 'Email o contraseña incorrectos.';
  }
  return message || 'No se pudo iniciar sesión.';
}

function safeReturnUrl(url: string | null): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/login')) {
    return '/';
  }
  return url;
}
