import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DashboardHomeComponent } from './pages/dashboard/views/dashboard-home.component';
import { HallazgosPageComponent } from './pages/dashboard/views/hallazgos-page.component';
import { DocumentosPageComponent } from './pages/dashboard/views/documentos-page.component';
import { EquipoPageComponent } from './pages/dashboard/views/equipo-page.component';
import { BusinessModelComponent } from './pages/business-model/business-model.component';
import { IncidentesPageComponent } from './pages/dashboard/views/incidentes-page.component';

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
        component: DashboardHomeComponent,
        data: { title: 'Dashboard' }
      },
      {
        path: 'incidentes',
        component: IncidentesPageComponent,
        data: { title: 'Incidentes' }
      },
      {
        path: 'hallazgos',
        component: HallazgosPageComponent,
        data: { title: 'Hallazgos' }
      },
      {
        path: 'documentos',
        component: DocumentosPageComponent,
        data: { title: 'Documentos' }
      },
      {
        path: 'equipo',
        component: EquipoPageComponent,
        data: { title: 'Equipo' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
