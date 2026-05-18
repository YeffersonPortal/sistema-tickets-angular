import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { ApiResponse } from '../api/api-response';
import { StorageService } from './storage';

export type UserRole = 'jefe' | 'tecnico' | 'colaborador';

export interface AuthUser {
  id?: number;
  email: string;
  nombre: string;
  rol: UserRole;
  usuario: string;
}

export interface DemoUser {
  email: string;
  nombre: string;
  rol: UserRole;
}

interface LoginApiUser {
  id: number;
  email: string;
  nombre: string;
  rol: UserRole;
  rol_nombre?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly userKey = 'user';
  private readonly demoUsers: DemoUser[] = [
    {
      email: 'jefe.sistemas@sgt.com',
      nombre: 'Jefe de sistemas',
      rol: 'jefe',
    },
    {
      email: 'tecnico.soporte@sgt.com',
      nombre: 'Tecnico de soporte',
      rol: 'tecnico',
    },
    {
      email: 'colaborador@sgt.com',
      nombre: 'Colaborador',
      rol: 'colaborador',
    },
  ];

  constructor(
    private http: HttpClient,
    private storage: StorageService,
  ) {}

  getDemoUsers(): DemoUser[] {
    return [...this.demoUsers];
  }

  getCurrentUser(): AuthUser | null {
    const storedUser = this.storage.getItem<Partial<AuthUser>>(this.userKey);

    if (
      !storedUser?.email ||
      !storedUser.nombre ||
      !storedUser.rol ||
      !storedUser.usuario
    ) {
      this.storage.removeItem(this.userKey);
      return null;
    }

    return storedUser as AuthUser;
  }

  getCurrentUserId(): number | null {
    return this.getCurrentUser()?.id ?? null;
  }

  getCurrentRole(): UserRole | null {
    return this.getCurrentUser()?.rol ?? null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  login(usuario: string, password: string): Observable<AuthUser> {
    const normalizedEmail = usuario.trim().toLowerCase();

    return this.http
      .post<ApiResponse<LoginApiUser>>(`${API_BASE_URL}/login`, {
        email: normalizedEmail,
        password,
      })
      .pipe(
        map((response) => {
          if (!response.ok || !response.data) {
            throw new Error(response.message || 'No se pudo iniciar sesion.');
          }

          return {
            id: response.data.id,
            email: response.data.email,
            nombre: response.data.nombre,
            rol: response.data.rol,
            usuario: response.data.nombre,
          };
        }),
        tap((user) => this.storage.setItem(this.userKey, user)),
      );
  }

  logout(): void {
    this.storage.removeItem(this.userKey);
  }

  canAccessRoute(route: string): boolean {
    const role = this.getCurrentRole();
    if (!role) {
      return false;
    }

    const accessMap: Record<UserRole, string[]> = {
      jefe: ['/dashboard', '/tickets', '/monitor'],
      tecnico: ['/tickets'],
      colaborador: ['/tickets'],
    };

    return accessMap[role].includes(route);
  }

  getDefaultRouteForRole(role: UserRole | null): string {
    if (role === 'jefe') {
      return '/dashboard';
    }

    return '/tickets';
  }

  getDefaultRouteForCurrentUser(): string {
    return this.getDefaultRouteForRole(this.getCurrentRole());
  }

  getRoleLabel(role: UserRole | null | undefined): string {
    const labels: Record<UserRole, string> = {
      jefe: 'Jefe de sistemas',
      tecnico: 'Tecnico de soporte',
      colaborador: 'Colaborador',
    };

    return role ? labels[role] : 'Invitado';
  }
}
