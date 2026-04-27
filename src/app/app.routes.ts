import { Routes } from '@angular/router';
import { Login } from './pages/login/login'; // Importamos tu componente

export const routes: Routes = [
  // 1. Ruta principal del login
  { path: 'login', component: Login },

  // 2. Si el usuario entra a "localhost:4200/" sin nada más, lo redirigimos al login
  { path: '', redirectTo: '/login', pathMatch: 'full' } 
];