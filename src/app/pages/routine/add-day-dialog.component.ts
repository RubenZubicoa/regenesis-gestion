import { Component, HostListener, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { RoutineMaster } from '../../models/routine-master';

@Component({
  selector: 'app-add-day-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-day-dialog.component.html',
  styleUrl: './add-day-dialog.component.scss',
})
export class AddDayDialogComponent {
  readonly templates = input<RoutineMaster[]>([]);

  readonly blank = output<void>();
  readonly picked = output<RoutineMaster>();
  readonly closed = output<void>();

  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.templates().filter((item) => {
      if (!q) return true;
      const haystack = [item.day, item.focus, item.duration, ...item.exercises.map((ex) => ex.name)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  close(): void {
    this.closed.emit();
  }

  startBlank(): void {
    this.blank.emit();
  }

  pick(template: RoutineMaster): void {
    this.picked.emit(template);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
