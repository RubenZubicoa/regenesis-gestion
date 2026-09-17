import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly coachName = this.auth.trainerName;
  readonly coachRole = 'Health Coach';

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
