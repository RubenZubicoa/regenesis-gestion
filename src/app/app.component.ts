import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { HeaderComponent } from './layout/header/header.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showChrome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.shouldShowChrome()),
      startWith(this.shouldShowChrome()),
    ),
    { initialValue: false },
  );

  private shouldShowChrome(): boolean {
    return this.auth.isLoggedIn() && !this.router.url.startsWith('/login');
  }
}
