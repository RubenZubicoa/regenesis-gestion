import { Component, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ClientsService } from '../../services/clients.service';

@Component({
  selector: 'app-password-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './password-dialog.component.html',
  styleUrl: './password-dialog.component.scss',
})
export class PasswordDialogComponent {
  private readonly clients = inject(ClientsService);

  readonly clientId = input.required<string>();
  readonly clientName = input('');

  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly password = signal('');
  readonly confirm = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  save(): void {
    const password = this.password();
    const confirm = this.confirm();

    if (!password.trim()) {
      this.saveError.set('La nueva contraseña es obligatoria.');
      return;
    }
    if (password.trim().length < 6) {
      this.saveError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      this.saveError.set('Las contraseñas no coinciden.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    this.clients.changePassword(this.clientId(), password.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
