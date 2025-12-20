import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { BusinessModelComponent } from './pages/business-model/business-model.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'modelo-negocio',
    component: BusinessModelComponent
  },
  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'register',
    redirectTo: 'auth/register',
    pathMatch: 'full'
  },
  {
    path: 'forgot-password',
    redirectTo: 'auth/forgot-password',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        component: LoginComponent
      },
      {
        path: 'register',
        component: RegisterComponent
      },
      {
        path: 'forgot-password',
        component: ForgotPasswordComponent
      }
    ]
  },
  {
    path: 'app',
    component: DashboardComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/views/dashboard-home.component').then(
            (m) => m.DashboardHomeComponent
          ),
        data: { title: 'Dashboard' }
      },
      {
        path: 'incidentes',
        loadComponent: () =>
          import('./pages/dashboard/views/incidentes-page.component').then(
            (m) => m.IncidentesPageComponent
          ),
        data: { title: 'Incidentes' }
      },
      {
        path: 'arbol-causas',
        loadComponent: () =>
          import('./pages/dashboard/views/cause-tree/cause-tree-page.component').then(
            (m) => m.CauseTreePageComponent
          ),
        data: { title: 'Árbol de Causas' }
      },
      {
        path: 'hallazgos',
        loadComponent: () =>
          import('./pages/dashboard/views/hallazgos-page.component').then(
            (m) => m.HallazgosPageComponent
          ),
        data: { title: 'Hallazgos' }
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./pages/dashboard/views/documentos-page.component').then(
            (m) => m.DocumentosPageComponent
          ),
        data: { title: 'Documentos' }
      },
      {
        path: 'equipo',
        loadComponent: () =>
          import('./pages/dashboard/views/equipo-page.component').then(
            (m) => m.EquipoPageComponent
          ),
        data: { title: 'Equipo' }
      },
      {
        path: 'pts-art',
        loadComponent: () =>
          import('./pages/dashboard/views/pts-art-page.component').then(
            (m) => m.PtsArtPageComponent
          ),
        data: { title: 'PTS y ART' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
