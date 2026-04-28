import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
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

  login(): void {
    this.errorMessage = '';
    const normalizedUser = this.usuario.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.com$/i;

    if (!normalizedUser || !this.password.trim()) {
      this.errorMessage = 'Completa usuario y contrasena para continuar.';
      return;
    }

    if (!emailPattern.test(normalizedUser)) {
      this.errorMessage = 'El usuario debe tener formato de correo valido y terminar en .com.';
      return;
    }

    this.isSubmitting = true;

    try {
      const user = this.auth.login(normalizedUser);
      const targetRoute =
        this.redirectTo === '/dashboard' && user.rol !== 'jefe'
          ? this.auth.getDefaultRouteForRole(user.rol)
          : this.redirectTo;
      this.router.navigateByUrl(targetRoute);
      return;
    } catch (error) {
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo iniciar sesion.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
