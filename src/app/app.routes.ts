import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/clients/clients-page.component').then(
        (m) => m.ClientsPageComponent,
      ),
  },
  {
    path: 'clients/:id',
    loadComponent: () =>
      import('./pages/client-detail/client-detail-page.component').then(
        (m) => m.ClientDetailPageComponent,
      ),
  },
  {
    path: 'clients/:id/rutina',
    loadComponent: () =>
      import('./pages/routine/manage-routine-page.component').then(
        (m) => m.ManageRoutinePageComponent,
      ),
  },
  {
    path: 'ejercicios/categorias',
    loadComponent: () =>
      import('./pages/exercises/exercise-categories-page.component').then(
        (m) => m.ExerciseCategoriesPageComponent,
      ),
  },
  {
    path: 'ejercicios',
    loadComponent: () =>
      import('./pages/exercises/exercises-page.component').then(
        (m) => m.ExercisesPageComponent,
      ),
  },
  {
    path: 'revisiones',
    loadComponent: () =>
      import('./pages/reviews/reviews-page.component').then(
        (m) => m.ReviewsPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
