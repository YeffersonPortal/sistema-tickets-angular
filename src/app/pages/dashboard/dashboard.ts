import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { TicketService } from '../../core/services/ticket';
import {
  Ticket,
  TicketPriority,
  TicketStatistics,
  TicketStatus,
} from '../../models/ticket';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent {
  readonly statusOptions: { value: TicketStatus; label: string }[] = [
    { value: 'por-cerrar', label: 'Por cerrar' },
    { value: 'rechazados', label: 'Rechazados' },
    { value: 'cerrados', label: 'Cerrados' },
    { value: 'eliminados', label: 'Eliminados' },
  ];
  readonly priorityOptions: TicketPriority[] = [
    'baja',
    'media',
    'alta',
    'urgente',
  ];

  filters: {
    fechaDesde: Date | null;
    fechaHasta: Date | null;
    status: TicketStatus | '';
    usuario: string;
    prioridad: TicketPriority | '';
  } = {
    fechaDesde: null,
    fechaHasta: null,
    status: '',
    usuario: '',
    prioridad: '',
  };

  filteredTickets: Ticket[] = [];
  stats: TicketStatistics = {
    total: 0,
    porCerrar: 0,
    rechazados: 0,
    cerrados: 0,
    eliminados: 0,
    resueltos: 0,
    pendientes: 0,
  };

  constructor(private ticketService: TicketService) {}

  ngOnInit(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTickets = this.ticketService.filterTickets({
      status: this.filters.status || undefined,
      usuario: this.filters.usuario || undefined,
      prioridad: this.filters.prioridad || undefined,
      fechaDesde: this.formatDateFilter(this.filters.fechaDesde),
      fechaHasta: this.formatDateFilter(this.filters.fechaHasta),
    });

    this.stats = this.buildStatistics(this.filteredTickets);
  }

  resetFilters(): void {
    this.filters = {
      fechaDesde: null,
      fechaHasta: null,
      status: '',
      usuario: '',
      prioridad: '',
    };
    this.applyFilters();
  }

  get users(): string[] {
    return this.ticketService.getUniqueUsers();
  }

  get resolutionRate(): number {
    return this.stats.total > 0
      ? Math.round((this.stats.resueltos / this.stats.total) * 100)
      : 0;
  }

  get workloadRate(): number {
    return this.stats.total > 0
      ? Math.round((this.stats.pendientes / this.stats.total) * 100)
      : 0;
  }

  get statusBreakdown(): { label: string; value: number; tone: string }[] {
    return [
      { label: 'Por cerrar', value: this.stats.porCerrar, tone: 'warning' },
      { label: 'Rechazados', value: this.stats.rechazados, tone: 'violet' },
      { label: 'Cerrados', value: this.stats.cerrados, tone: 'primary' },
      { label: 'Eliminados', value: this.stats.eliminados, tone: 'danger' },
    ];
  }

  get recentTickets(): Ticket[] {
    return [...this.filteredTickets].sort((a, b) => b.id - a.id).slice(0, 5);
  }

  exportCsv(): void {
    const headers = [
      'Nro',
      'Asunto',
      'Usuario',
      'Area',
      'Categoria',
      'Prioridad',
      'Estado',
      'Fecha de inicio',
      'Fecha de cierre',
    ];

    const rows = this.filteredTickets.map((ticket) => [
      ticket.nro || `TCK-${ticket.id}`,
      ticket.asunto,
      ticket.usuario,
      ticket.area,
      ticket.tipoServicio,
      ticket.prioridad,
      ticket.status,
      ticket.fi,
      ticket.fc,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reporte-tickets.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  exportPrintableReport(): void {
    const reportWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!reportWindow) {
      return;
    }

    const rows = this.filteredTickets
      .map(
        (ticket) => `
          <tr>
            <td>${ticket.nro || `TCK-${ticket.id}`}</td>
            <td>${ticket.asunto}</td>
            <td>${ticket.usuario}</td>
            <td>${ticket.area}</td>
            <td>${ticket.tipoServicio}</td>
            <td>${ticket.prioridad}</td>
            <td>${ticket.status}</td>
            <td>${ticket.fi}</td>
          </tr>
        `,
      )
      .join('');

    reportWindow.document.write(`
      <html>
        <head>
          <title>Reporte de tickets</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            p { color: #475569; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
            .summary div { padding: 12px; border: 1px solid #cbd5e1; border-radius: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
            th { background: #eff6ff; }
          </style>
        </head>
        <body>
          <h1>SGT - Reporte de tickets</h1>
          <p>Generado con los filtros activos del dashboard.</p>
          <div class="summary">
            <div><strong>Total</strong><br>${this.stats.total}</div>
            <div><strong>Por cerrar</strong><br>${this.stats.porCerrar}</div>
            <div><strong>Cerrados</strong><br>${this.stats.cerrados}</div>
            <div><strong>Pendientes</strong><br>${this.stats.pendientes}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nro</th>
                <th>Asunto</th>
                <th>Usuario</th>
                <th>Area</th>
                <th>Categoria</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8">No hay tickets para exportar.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

  private buildStatistics(tickets: Ticket[]): TicketStatistics {
    const counts = tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] += 1;
        return acc;
      },
      {
        'por-cerrar': 0,
        rechazados: 0,
        cerrados: 0,
        eliminados: 0,
      } as Record<TicketStatus, number>,
    );

    return {
      total: tickets.length,
      porCerrar: counts['por-cerrar'],
      rechazados: counts.rechazados,
      cerrados: counts.cerrados,
      eliminados: counts.eliminados,
      resueltos: counts.cerrados,
      pendientes:
        counts['por-cerrar'] + counts.rechazados + counts.eliminados,
    };
  }

  private formatDateFilter(date: Date | null): string | undefined {
    if (!date) {
      return undefined;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
