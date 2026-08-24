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
    path: 'ejercicios',
    loadComponent: () =>
      import('./pages/exercises/exercises-page.component').then(
        (m) => m.ExercisesPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
