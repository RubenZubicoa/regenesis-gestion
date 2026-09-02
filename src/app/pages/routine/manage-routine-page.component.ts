import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import type { ExerciseCategory, ExerciseMaster } from '../../models/exercise-master';
import { categoryMatches } from '../../models/exercise-master';
import type { RoutineExercise } from '../../models/routine-day';
import { ExerciseCategoriesService } from '../../services/exercise-categories.service';
import { ExerciseMastersService } from '../../services/exercise-masters.service';
import { RoutineService } from '../../services/routine.service';

type MasterFilter = 'all' | 'strength' | 'cardio';

interface EditableExercise extends RoutineExercise {
  uid: string;
}

interface EditableDay {
  uid: string;
  _id: string | null;
  day: string;
  focus: string;
  done: boolean;
  duration: string;
  exercises: EditableExercise[];
}

@Component({
  selector: 'app-manage-routine-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DragDropModule],
  templateUrl: './manage-routine-page.component.html',
  styleUrl: './manage-routine-page.component.scss',
})
export class ManageRoutinePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routineService = inject(RoutineService);
  private readonly exerciseMasters = inject(ExerciseMastersService);
  private readonly categoriesApi = inject(ExerciseCategoriesService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveOk = signal(false);

  readonly clientId = signal('');
  readonly clientName = signal('');
  readonly masters = signal<ExerciseMaster[]>([]);
  readonly categories = signal<ExerciseCategory[]>([]);
  readonly days = signal<EditableDay[]>([]);
  readonly originalIds = signal<string[]>([]);

  readonly masterQuery = signal('');
  readonly masterFilter = signal<MasterFilter>('all');
  readonly masterCategoryFilter = signal('all');
  readonly activeDayUid = signal<string | null>(null);

  readonly filteredMasters = computed(() => {
    const q = this.masterQuery().trim().toLowerCase();
    const f = this.masterFilter();
    const cat = this.masterCategoryFilter();
    const selected = this.categories().find((item) => item._id === cat);
    return this.masters()
      .filter((m) => (f === 'all' ? true : m.type === f))
      .filter((m) => (cat === 'all' ? true : selected ? categoryMatches(m.category, selected) : false))
      .filter((m) => !q || m.name.toLowerCase().includes(q));
  });

  readonly activeDay = computed(() => {
    const uid = this.activeDayUid();
    return this.days().find((d) => d.uid === uid) ?? this.days()[0] ?? null;
  });

  readonly connectedLists = computed(() => {
    const active = this.activeDay();
    return active
      ? ['exercise-library', this.dayListId(active.uid)]
      : ['exercise-library'];
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.loading.set(true);
          this.error.set(null);
          if (!id) {
            this.loading.set(false);
            return of(null);
          }
          this.clientId.set(id);
          return forkJoin({
            client: this.routineService.loadClient(id),
            days: this.routineService.listByClient(id),
            masters: this.exerciseMasters.list(),
            categories: this.categoriesApi.list().pipe(catchError(() => of([]))),
          });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (payload) => {
          if (!payload) {
            this.error.set('Cliente no encontrado.');
            this.loading.set(false);
            return;
          }
          this.clientName.set(payload.client.fullName);
          this.masters.set(payload.masters);
          this.categories.set(payload.categories);
          const editable = payload.days.map((day) => this.toEditableDay(day));
          this.days.set(editable);
          this.originalIds.set(payload.days.map((d) => d._id));
          this.activeDayUid.set(editable[0]?.uid ?? null);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  dayListId(uid: string): string {
    return `day-${uid}`;
  }

  setMasterFilter(filter: MasterFilter): void {
    this.masterFilter.set(filter);
  }

  setMasterCategoryFilter(filter: string): void {
    this.masterCategoryFilter.set(filter);
  }

  selectDay(uid: string): void {
    this.activeDayUid.set(uid);
  }

  addDay(): void {
    const n = this.days().length + 1;
    const day: EditableDay = {
      uid: this.uid(),
      _id: null,
      day: `Día ${n}`,
      focus: 'Nuevo foco',
      done: false,
      duration: '45 min',
      exercises: [],
    };
    this.days.update((list) => [...list, day]);
    this.activeDayUid.set(day.uid);
    this.saveOk.set(false);
  }

  removeDay(uid: string): void {
    const list = this.days().filter((d) => d.uid !== uid);
    this.days.set(list);
    if (this.activeDayUid() === uid) {
      this.activeDayUid.set(list[0]?.uid ?? null);
    }
    this.saveOk.set(false);
  }

  updateDayField(uid: string, field: 'day' | 'focus' | 'duration', value: string): void {
    this.days.update((list) =>
      list.map((d) => (d.uid === uid ? { ...d, [field]: value } : d)),
    );
    this.saveOk.set(false);
  }

  removeExercise(dayUid: string, exerciseUid: string): void {
    this.days.update((list) =>
      list.map((d) =>
        d.uid === dayUid
          ? { ...d, exercises: d.exercises.filter((ex) => ex.uid !== exerciseUid) }
          : d,
      ),
    );
    this.saveOk.set(false);
  }

  updateExerciseField(
    dayUid: string,
    exerciseUid: string,
    field: 'sets' | 'rest',
    value: string,
  ): void {
    this.days.update((list) =>
      list.map((d) => {
        if (d.uid !== dayUid) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) =>
            ex.uid === exerciseUid ? { ...ex, [field]: value } : ex,
          ),
        };
      }),
    );
    this.saveOk.set(false);
  }

  onLibraryDrop(event: CdkDragDrop<ExerciseMaster[]>): void {
    // Si sueltan un ejercicio de un día en la biblioteca, se elimina del día.
    if (event.previousContainer === event.container) return;
    const prevId = event.previousContainer.id;
    if (!prevId.startsWith('day-')) return;
    const dayUid = prevId.slice(4);
    const prevData = event.previousContainer.data as unknown as EditableExercise[];
    const removed = prevData[event.previousIndex];
    if (!removed) return;
    this.removeExercise(dayUid, removed.uid);
  }

  onDayDrop(event: CdkDragDrop<EditableExercise[]>, dayUid: string): void {
    const days = this.days();
    const dayIdx = days.findIndex((d) => d.uid === dayUid);
    if (dayIdx < 0) return;

    if (event.previousContainer === event.container) {
      const exercises = [...days[dayIdx].exercises];
      moveItemInArray(exercises, event.previousIndex, event.currentIndex);
      this.patchDayExercises(dayIdx, exercises);
      return;
    }

    if (event.previousContainer.id === 'exercise-library') {
      const master =
        (event.item.data as ExerciseMaster | undefined) ??
        (event.previousContainer.data as unknown as ExerciseMaster[])[
          event.previousIndex
        ];
      if (!master) return;
      const exercises = [...days[dayIdx].exercises];
      exercises.splice(event.currentIndex, 0, this.fromMaster(master));
      this.patchDayExercises(dayIdx, exercises);
    }
  }

  save(): void {
    const clientId = this.clientId();
    const days = this.days();

    for (const [i, day] of days.entries()) {
      if (!day.day.trim() || !day.focus.trim() || !day.duration.trim()) {
        this.saveError.set(`Completa nombre, foco y duración del día ${i + 1}.`);
        this.activeDayUid.set(day.uid);
        return;
      }
      if (day.exercises.length === 0) {
        this.saveError.set(`Añade al menos un ejercicio en “${day.day}”.`);
        this.activeDayUid.set(day.uid);
        return;
      }
      for (const ex of day.exercises) {
        if (!ex.sets.trim() || !ex.rest.trim()) {
          this.saveError.set(`Completa series y descanso de “${ex.name}”.`);
          this.activeDayUid.set(day.uid);
          return;
        }
      }
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.saveOk.set(false);

    this.routineService
      .sync(
        clientId,
        this.originalIds(),
        days.map((d) => ({
          _id: d._id,
          day: d.day,
          focus: d.focus,
          done: d.done,
          duration: d.duration,
          exercises: d.exercises,
        })),
      )
      .subscribe({
        next: (saved) => {
          const editable = saved.map((day) => this.toEditableDay(day));
          this.days.set(editable);
          this.originalIds.set(saved.map((d) => d._id));
          this.activeDayUid.set(editable[0]?.uid ?? null);
          this.saving.set(false);
          this.saveOk.set(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.saveError.set(err.message);
        },
      });
  }

  goBack(): void {
    void this.router.navigate(['/clients', this.clientId()]);
  }

  private patchDayExercises(dayIdx: number, exercises: EditableExercise[]): void {
    this.days.update((list) =>
      list.map((d, i) => (i === dayIdx ? { ...d, exercises } : d)),
    );
    this.saveOk.set(false);
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

  private toEditableDay(day: {
    _id: string;
    day: string;
    focus: string;
    done: boolean;
    duration: string;
    exercises: RoutineExercise[];
  }): EditableDay {
    return {
      uid: day._id,
      _id: day._id,
      day: day.day,
      focus: day.focus,
      done: day.done,
      duration: day.duration,
      exercises: day.exercises.map((ex) => ({ ...ex, uid: this.uid() })),
    };
  }

  private uid(): string {
    return `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
