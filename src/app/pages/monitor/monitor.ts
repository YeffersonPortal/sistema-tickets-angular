import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth';
import { TicketService } from '../../core/services/ticket';
import {
  Ticket,
  TicketPriority,
  TicketSortDirection,
  TicketSortField,
  TicketStatus,
} from '../../models/ticket';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
  ],
  templateUrl: './monitor.html',
  styleUrls: ['./monitor.css'],
})
export class MonitorComponent {
  readonly statuses: { key: TicketStatus; label: string }[] = [
    { key: 'por-cerrar', label: 'Tickets por cerrar' },
    { key: 'rechazados', label: 'Tickets rechazados' },
    { key: 'cerrados', label: 'Tickets cerrados' },
    { key: 'eliminados', label: 'Tickets eliminados' },
  ];
  readonly supportAgents = [
    'Tecnico de soporte',
  ];
  readonly priorities: TicketPriority[] = ['baja', 'media', 'alta', 'urgente'];
  readonly sortOptions: { value: TicketSortField; label: string }[] = [
    { value: 'fecha', label: 'Fecha de creacion' },
    { value: 'prioridad', label: 'Prioridad' },
    { value: 'estado', label: 'Estado' },
  ];

  selectedStatus: TicketStatus = 'por-cerrar';
  searchTerm = '';
  responsableTerm = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  selectedPriority: TicketPriority | '' = '';
  sortBy: TicketSortField = 'fecha';
  sortDirection: TicketSortDirection = 'desc';
  selectedTicket: Ticket | null = null;
  selectedAgent = '';
  tickets: Ticket[] = [];
  statusCounts: Record<TicketStatus, number> = {
    'por-cerrar': 0,
    rechazados: 0,
    cerrados: 0,
    eliminados: 0,
  };

  constructor(
    private auth: AuthService,
    private ticketService: TicketService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.ticketService.filterTickets({
      searchTerm: this.searchTerm,
      prioridad: this.selectedPriority || undefined,
      fechaDesde: this.formatDateFilter(this.fechaDesde),
      fechaHasta: this.formatDateFilter(this.fechaHasta),
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
    }).subscribe((filtered) => {
      const visibleByResponsible = filtered.filter((ticket) => {
        if (!this.responsableTerm.trim()) {
          return true;
        }

        const term = this.responsableTerm.toLowerCase();
        return [ticket.usuario, ticket.tecnico ?? '']
          .join(' ')
          .toLowerCase()
          .includes(term);
      });

      this.statusCounts = this.buildStatusCounts(visibleByResponsible);
      this.tickets = visibleByResponsible.filter((ticket) => ticket.status === this.selectedStatus);
      this.changeDetector.detectChanges();
    });

    if (this.selectedTicket) {
      this.ticketService.getTicketById(this.selectedTicket.id).subscribe((ticket) => {
        this.selectedTicket = ticket;
        this.selectedAgent = ticket?.tecnico ?? '';
        this.changeDetector.detectChanges();
      });
    }
  }

  setStatus(status: TicketStatus): void {
    this.selectedStatus = status;
    this.loadTickets();
  }

  onSearchChange(): void {
    this.loadTickets();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.responsableTerm = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.selectedPriority = '';
    this.sortBy = 'fecha';
    this.sortDirection = 'desc';
    this.loadTickets();
  }

  openTicket(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.selectedAgent = ticket.tecnico ?? '';
    this.changeDetector.detectChanges();
  }

  reassignSelected(): void {
    if (!this.selectedTicket || !this.selectedAgent) {
      return;
    }

    this.ticketService
      .reassignTicket(
        this.selectedTicket.id,
        this.getAgentId(this.selectedAgent),
        this.currentUserId,
      )
      .subscribe(() => {
        this.loadTickets();
        this.changeDetector.detectChanges();
      });
  }

  acceptSolution(): void {
    if (!this.selectedTicket) {
      return;
    }

    this.ticketService.changeTicketStatus(
      this.selectedTicket.id,
      'cerrados',
      this.currentUserId,
      'Se acepto la solucion del ticket.',
    ).subscribe(() => {
      this.loadTickets();
      this.changeDetector.detectChanges();
    });
  }

  rejectSolution(): void {
    if (!this.selectedTicket) {
      return;
    }

    this.ticketService.changeTicketStatus(
      this.selectedTicket.id,
      'rechazados',
      this.currentUserId,
      'Se anulo la solucion del ticket.',
    ).subscribe(() => {
      this.loadTickets();
      this.changeDetector.detectChanges();
    });
  }

  markDeleted(ticket: Ticket): void {
    this.ticketService.changeTicketStatus(
      ticket.id,
      'eliminados',
      this.currentUserId,
      'El ticket fue marcado como eliminado desde monitoreo.',
    ).subscribe(() => {
      this.loadTickets();
      this.changeDetector.detectChanges();
    });
  }

  getCount(status: TicketStatus): number {
    return this.statusCounts[status];
  }

  getStatusLabel(status: TicketStatus): string {
    return this.ticketService.getStatusLabel(status);
  }

  getPriorityLabel(priority: TicketPriority): string {
    return this.ticketService.getPriorityLabel(priority);
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

  private get currentUserId(): number | null {
    return this.auth.getCurrentUserId();
  }

  private getAgentId(agentName: string): number | null {
    if (agentName === 'Tecnico de soporte') {
      return 2;
    }

    return null;
  }

  private buildStatusCounts(tickets: Ticket[]): Record<TicketStatus, number> {
    return tickets.reduce<Record<TicketStatus, number>>(
      (counts, ticket) => {
        counts[ticket.status] += 1;
        return counts;
      },
      {
        'por-cerrar': 0,
        rechazados: 0,
        cerrados: 0,
        eliminados: 0,
      },
    );
  }
}
