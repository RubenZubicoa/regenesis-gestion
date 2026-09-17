import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
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
        path: 'rutinas',
        loadComponent: () =>
          import('./pages/routine-masters/routine-masters-page.component').then(
            (m) => m.RoutineMastersPageComponent,
          ),
      },
      {
        path: 'comidas',
        loadComponent: () =>
          import('./pages/meal-masters/meal-masters-page.component').then(
            (m) => m.MealMastersPageComponent,
          ),
      },
      {
        path: 'videoteca',
        loadComponent: () =>
          import('./pages/video-library/video-library-page.component').then(
            (m) => m.VideoLibraryPageComponent,
          ),
      },
      {
        path: 'revisiones',
        loadComponent: () =>
          import('./pages/reviews/reviews-page.component').then(
            (m) => m.ReviewsPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
