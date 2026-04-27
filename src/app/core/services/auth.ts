import { Injectable } from '@angular/core';
import { StorageService } from './storage';

export type UserRole = 'jefe' | 'tecnico' | 'colaborador';

export interface AuthUser {
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

  constructor(private storage: StorageService) {}

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

  getCurrentRole(): UserRole | null {
    return this.getCurrentUser()?.rol ?? null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  login(usuario: string): AuthUser {
    const normalizedEmail = usuario.trim().toLowerCase();
    const account = this.demoUsers.find((item) => item.email === normalizedEmail);

    if (!account) {
      throw new Error('El usuario no existe en los accesos de prueba.');
    }

    const user: AuthUser = {
      email: account.email,
      nombre: account.nombre,
      rol: account.rol,
      usuario: account.nombre,
    };

    this.storage.setItem(this.userKey, user);
    return user;
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
