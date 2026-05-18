import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
  private readonly apiUrl = 'https://ngji0j6x3a.execute-api.us-east-1.amazonaws.com/v1';
  private readonly userKey = 'user';

  private readonly demoUsers: DemoUser[] = [
    { email: 'jefe.sistemas@sgt.com', nombre: 'Jefe de sistemas', rol: 'jefe' },
    { email: 'tecnico.soporte@sgt.com', nombre: 'Tecnico de soporte', rol: 'tecnico' },
    { email: 'colaborador@sgt.com', nombre: 'Colaborador', rol: 'colaborador' },
  ];

  constructor(
    private storage: StorageService,
    private http: HttpClient
  ) {}

  getDemoUsers(): DemoUser[] {
    return [...this.demoUsers];
  }

  getCurrentUser(): AuthUser | null {
    const storedUser = this.storage.getItem<Partial<AuthUser>>(this.userKey);
    if (!storedUser?.email || !storedUser.nombre || !storedUser.rol || !storedUser.usuario) {
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

  // MÉTODO ACTUALIZADO PARA AWS
  // MÉTODO ACTUALIZADO PARA AWS Y SQL SERVER
  // MÉTODO ACTUALIZADO PARA AWS
  // MÉTODO ACTUALIZADO PARA AWS Y CREACIÓN DE TICKETS
  async login(usuario: string): Promise<AuthUser> {
    try {
      const body = { email: usuario }; 

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/login`, body)
      );

      const dbUser = response.data;

      if (!dbUser) {
        throw new Error('No se recibieron datos del servidor.');
      }

      // TRUCO MAESTRO: Guardamos el 'id' numérico dentro de 'usuario'
      const userData: AuthUser = {
        email: dbUser.email,
        nombre: dbUser.nombre,
        rol: dbUser.rol,
        usuario: dbUser.id // <--- AQUÍ ESTÁ EL CAMBIO CLAVE
      };

      this.storage.setItem(this.userKey, userData);
      return userData;
      
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  logout(): void {
    this.storage.removeItem(this.userKey);
  }

  canAccessRoute(route: string): boolean {
    const role = this.getCurrentRole();
    if (!role) return false;

    const accessMap: Record<UserRole, string[]> = {
      jefe: ['/dashboard', '/tickets', '/monitor'],
      tecnico: ['/tickets'],
      colaborador: ['/tickets'],
    };

    return accessMap[role].includes(route);
  }

  getDefaultRouteForRole(role: UserRole | null): string {
    return role === 'jefe' ? '/dashboard' : '/tickets';
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