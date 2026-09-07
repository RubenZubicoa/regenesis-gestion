import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import type { ExerciseCategory, ExerciseMaster } from '../../models/exercise-master';
import { categoryMatches } from '../../models/exercise-master';
import type { RoutineExercise } from '../../models/routine-day';
import type { RoutineMaster } from '../../models/routine-master';
import { ExerciseCategoriesService } from '../../services/exercise-categories.service';
import { ExerciseMastersService } from '../../services/exercise-masters.service';
import { RoutineMastersService } from '../../services/routine-masters.service';

type KindFilter = 'all' | 'strength' | 'cardio';

interface EditableExercise extends RoutineExercise {
  uid: string;
}

interface EditableSession {
  _id: string | null;
  day: string;
  focus: string;
  duration: string;
  exercises: EditableExercise[];
}

@Component({
  selector: 'app-routine-masters-page',
  standalone: true,
  imports: [FormsModule, DragDropModule],
  templateUrl: './routine-masters-page.component.html',
  styleUrl: './routine-masters-page.component.scss',
})
export class RoutineMastersPageComponent {
  private readonly api = inject(RoutineMastersService);
  private readonly exerciseMasters = inject(ExerciseMastersService);
  private readonly categoriesApi = inject(ExerciseCategoriesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveOk = signal(false);

  readonly routines = signal<RoutineMaster[]>([]);
  readonly masters = signal<ExerciseMaster[]>([]);
  readonly categories = signal<ExerciseCategory[]>([]);

  readonly query = signal('');
  readonly focusFilter = signal('all');
  readonly workshopOpen = signal(false);
  readonly draft = signal<EditableSession | null>(null);

  readonly masterQuery = signal('');
  readonly masterFilter = signal<KindFilter>('all');
  readonly masterCategoryFilter = signal('all');

  readonly kindFilters: { key: KindFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'strength', label: 'Fuerza' },
    { key: 'cardio', label: 'Cardio' },
  ];

  readonly stats = computed(() => {
    const list = this.routines();
    const exercises = list.flatMap((item) => item.exercises);
    return {
      templates: list.length,
      exercises: exercises.length,
      cardio: exercises.filter((item) => item.type === 'cardio').length,
    };
  });

  readonly focusFilters = computed(() => {
    const unique = [
      ...new Set(
        this.routines()
          .map((item) => item.focus.trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es'));
    return [{ key: 'all', label: 'Todos los focos' }, ...unique.map((key) => ({ key, label: key }))];
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const focus = this.focusFilter();
    return this.routines().filter((item) => {
      if (focus !== 'all' && item.focus.trim() !== focus) return false;
      if (!q) return true;
      const haystack = [
        item.day,
        item.focus,
        item.duration,
        ...item.exercises.map((ex) => ex.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  readonly filteredMasters = computed(() => {
    const q = this.masterQuery().trim().toLowerCase();
    const kind = this.masterFilter();
    const cat = this.masterCategoryFilter();
    const selected = this.categories().find((item) => item._id === cat);
    return this.masters()
      .filter((item) => (kind === 'all' ? true : item.type === kind))
      .filter((item) =>
        cat === 'all' ? true : selected ? categoryMatches(item.category, selected) : false,
      )
      .filter((item) => !q || item.name.toLowerCase().includes(q));
  });

  readonly connectedLists = computed(() =>
    this.draft() ? ['exercise-library', 'session-dropzone'] : ['exercise-library'],
  );

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      routines: this.api.list(),
      masters: this.exerciseMasters.list().pipe(catchError(() => of([]))),
      categories: this.categoriesApi.list().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ routines, masters, categories }) => {
          this.masters.set(masters);
          this.categories.set(categories);
          this.routines.set(routines.map((item) => this.api.hydrate(item, masters)));
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  setFocusFilter(key: string): void {
    this.focusFilter.set(key);
  }

  setMasterFilter(key: KindFilter): void {
    this.masterFilter.set(key);
  }

  setMasterCategoryFilter(key: string): void {
    this.masterCategoryFilter.set(key);
  }

  previewThumbs(routine: RoutineMaster): RoutineExercise[] {
    return routine.exercises.slice(0, 4);
  }

  openCreate(): void {
    this.saveError.set(null);
    this.saveOk.set(false);
    this.draft.set({
      _id: null,
      day: '',
      focus: '',
      duration: '45 min',
      exercises: [],
    });
    this.workshopOpen.set(true);
  }

  openEdit(routine: RoutineMaster): void {
    this.saveError.set(null);
    this.saveOk.set(false);
    this.draft.set(this.toEditable(routine));
    this.workshopOpen.set(true);
  }

  leaveWorkshop(): void {
    if (this.saving() || this.deleting()) return;
    this.workshopOpen.set(false);
    this.draft.set(null);
    this.saveError.set(null);
    this.saveOk.set(false);
  }

  updateDraft(field: 'day' | 'focus' | 'duration', value: string): void {
    const current = this.draft();
    if (!current) return;
    this.draft.set({ ...current, [field]: value });
    this.saveOk.set(false);
  }

  addFromMaster(master: ExerciseMaster): void {
    const current = this.draft();
    if (!current) return;
    this.draft.set({
      ...current,
      exercises: [...current.exercises, this.fromMaster(master)],
    });
    this.saveOk.set(false);
  }

  removeExercise(uid: string): void {
    const current = this.draft();
    if (!current) return;
    this.draft.set({
      ...current,
      exercises: current.exercises.filter((item) => item.uid !== uid),
    });
    this.saveOk.set(false);
  }

  updateExerciseField(uid: string, field: 'sets' | 'rest', value: string): void {
    const current = this.draft();
    if (!current) return;
    this.draft.set({
      ...current,
      exercises: current.exercises.map((item) =>
        item.uid === uid ? { ...item, [field]: value } : item,
      ),
    });
    this.saveOk.set(false);
  }

  onLibraryDrop(event: CdkDragDrop<ExerciseMaster[]>): void {
    if (event.previousContainer === event.container) return;
    if (event.previousContainer.id !== 'session-dropzone') return;
    const prev = event.previousContainer.data as unknown as EditableExercise[];
    const removed = prev[event.previousIndex];
    if (removed) this.removeExercise(removed.uid);
  }

  onSessionDrop(event: CdkDragDrop<EditableExercise[]>): void {
    const current = this.draft();
    if (!current) return;

    if (event.previousContainer === event.container) {
      const exercises = [...current.exercises];
      moveItemInArray(exercises, event.previousIndex, event.currentIndex);
      this.draft.set({ ...current, exercises });
      this.saveOk.set(false);
      return;
    }

    if (event.previousContainer.id === 'exercise-library') {
      const master =
        (event.item.data as ExerciseMaster | undefined) ??
        (event.previousContainer.data as unknown as ExerciseMaster[])[event.previousIndex];
      if (!master) return;
      const exercises = [...current.exercises];
      exercises.splice(event.currentIndex, 0, this.fromMaster(master));
      this.draft.set({ ...current, exercises });
      this.saveOk.set(false);
    }
  }

  save(): void {
    const current = this.draft();
    if (!current || this.saving()) return;

    if (!current.day.trim() || !current.focus.trim() || !current.duration.trim()) {
      this.saveError.set('Completa nombre, foco y duración de la plantilla.');
      return;
    }
    if (current.exercises.length === 0) {
      this.saveError.set('Añade al menos un ejercicio a la sesión.');
      return;
    }
    for (const ex of current.exercises) {
      if (!ex.sets.trim() || !ex.rest.trim()) {
        this.saveError.set(`Completa series y descanso de “${ex.name}”.`);
        return;
      }
    }

    const payload = {
      day: current.day,
      focus: current.focus,
      done: false,
      duration: current.duration,
      exercises: current.exercises,
    };

    this.saving.set(true);
    this.saveError.set(null);
    this.saveOk.set(false);

    const request$ = current._id
      ? this.api.update(current._id, payload)
      : this.api.create(payload);

    request$.subscribe({
      next: (saved) => {
        const hydrated = this.api.hydrate(saved, this.masters());
        this.routines.update((list) => {
          const idx = list.findIndex((item) => item._id === hydrated._id);
          const next =
            idx === -1 ? [...list, hydrated] : list.map((item, i) => (i === idx ? hydrated : item));
          return next.sort((a, b) => a.day.localeCompare(b.day, 'es'));
        });
        this.draft.set(this.toEditable(hydrated));
        this.saving.set(false);
        this.saveOk.set(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  remove(): void {
    const current = this.draft();
    if (!current?._id || this.saving() || this.deleting()) return;
    this.deleting.set(true);
    this.saveError.set(null);
    this.api.remove(current._id).subscribe({
      next: () => {
        this.routines.update((list) => list.filter((item) => item._id !== current._id));
        this.deleting.set(false);
        this.leaveWorkshop();
      },
      error: (err: Error) => {
        this.deleting.set(false);
        this.saveError.set(err.message);
      },
    });
  }

  private toEditable(routine: RoutineMaster): EditableSession {
    return {
      _id: routine._id,
      day: routine.day,
      focus: routine.focus,
      duration: routine.duration,
      exercises: routine.exercises.map((ex) => ({ ...ex, uid: this.uid() })),
    };
  }

  private fromMaster(master: ExerciseMaster): EditableExercise {
    if (master.type === 'cardio') {
      return {
        uid: this.uid(),
        exerciseId: master._id,
        name: master.name,
        type: 'cardio',
        image: master.imageUrl,
        sets: '20 min',
        rest: '—',
        targetKm: 3,
      };
    }
    return {
      uid: this.uid(),
      exerciseId: master._id,
      name: master.name,
      type: 'strength',
      image: master.imageUrl,
      sets: '3 x 8-12',
      rest: '90s',
      seriesCount: 3,
      repRange: { min: 8, max: 12 },
      repUnit: 'reps',
    };
  }

  private uid(): string {
    return `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
