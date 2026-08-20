import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/clients/clients-page.component').then(
        (m) => m.ClientsPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
