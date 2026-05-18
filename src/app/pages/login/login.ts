import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common'; // <--- 1. AÑADE ESTO para manejar mensajes de error
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, // <--- 1. AÑADE ESTO
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent {
  usuario = '';
  password = '';
  errorMessage = '';
  infoMessage = '';
  isSubmitting = false;
  private redirectTo = '/dashboard';

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.redirectTo =
      this.route.snapshot.queryParamMap.get('redirectTo') || '/dashboard';

    if (this.redirectTo !== '/dashboard') {
      this.infoMessage = 'Inicia sesion para continuar con la ruta solicitada.';
    }
  }

  // 2. CAMBIA A "async login()"
  async login(): Promise<void> {
    this.errorMessage = '';
    const normalizedUser = this.usuario.trim().toLowerCase();
    
    // Validamos que no esté vacío
    if (!normalizedUser || !this.password.trim()) {
      this.errorMessage = 'Completa usuario y contrasena para continuar.';
      return;
    }

    this.isSubmitting = true;

    try {
      // 3. USA "await" para esperar a que AWS responda
      const user = await this.auth.login(normalizedUser);
      
      const targetRoute =
        this.redirectTo === '/dashboard' && user.rol !== 'jefe'
          ? this.auth.getDefaultRouteForRole(user.rol)
          : this.redirectTo;
      
      this.router.navigateByUrl(targetRoute);
      
    } catch (error: any) {
      // 4. MANEJA EL ERROR si el usuario no existe en RDS
      console.error('Error en el componente login:', error);
      this.errorMessage = 'Credenciales invalidas o error de conexion con AWS.';
    } finally {
      this.isSubmitting = false;
    }
  }
}