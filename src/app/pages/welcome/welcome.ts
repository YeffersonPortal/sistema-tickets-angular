import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './welcome.html',
  styleUrls: ['./welcome.css'],
})
export class WelcomeComponent {
  readonly features = [
    {
      icon: 'assignment',
      title: 'Gestion de Tickets',
      description: 'Administra tickets asignados con estados y prioridades',
    },
    {
      icon: 'monitor',
      title: 'Monitoreo en Tiempo Real',
      description: 'Supervisa el progreso de todos los tickets activos',
    },
    {
      icon: 'analytics',
      title: 'Reportes y Analytics',
      description: 'Obten insights detallados del rendimiento del equipo',
    },
  ];
}
