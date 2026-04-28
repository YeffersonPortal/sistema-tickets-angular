import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { LoginComponent } from './pages/login/login';
import { MonitorComponent } from './pages/monitor/monitor';
import { TicketsComponent } from './pages/tickets/tickets';
import { WelcomeComponent } from './pages/welcome/welcome';
import { LayoutComponent } from './shared/layout/layout';

export const routes: Routes = [
  { path: '', component: WelcomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [roleGuard],
        data: { roles: ['jefe'] },
      },
      {
        path: 'tickets',
        component: TicketsComponent,
        canActivate: [roleGuard],
        data: { roles: ['jefe', 'tecnico', 'colaborador'] },
      },
      {
        path: 'monitor',
        component: MonitorComponent,
        canActivate: [roleGuard],
        data: { roles: ['jefe'] },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
