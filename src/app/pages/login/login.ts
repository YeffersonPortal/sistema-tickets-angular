import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms'; // <-- Herramientas de validación
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common'; // <-- Para mostrar/ocultar los mensajes de error

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule, 
    MatCardModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule, 
    MatIconModule,
    NgIf
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // 1. Creamos el formulario y sus reglas (Validators)
  loginForm = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  // 2. Función que se ejecuta al darle clic a "Iniciar Sesión"
  onSubmit() {
    if (this.loginForm.valid) {
      alert('¡Login correcto! Listo para entrar al sistema.');
      // Más adelante aquí pondremos el código para llevar al usuario al Dashboard
    } else {
      // Si hay errores, forzamos a que se muestren en rojo
      this.loginForm.markAllAsTouched();
    }
  }
}