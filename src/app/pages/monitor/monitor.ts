import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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

  constructor(private ticketService: TicketService) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    const filtered = this.ticketService.filterTickets({
      status: this.selectedStatus,
      searchTerm: this.searchTerm,
      prioridad: this.selectedPriority || undefined,
      fechaDesde: this.formatDateFilter(this.fechaDesde),
      fechaHasta: this.formatDateFilter(this.fechaHasta),
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
    });

    this.tickets = filtered.filter((ticket) => {
      if (!this.responsableTerm.trim()) {
        return true;
      }

      const term = this.responsableTerm.toLowerCase();
      return [ticket.usuario, ticket.tecnico ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term);
    });

    if (this.selectedTicket) {
      this.selectedTicket = this.ticketService.getTicketById(this.selectedTicket.id);
      this.selectedAgent = this.selectedTicket?.tecnico ?? '';
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
  }

  reassignSelected(): void {
    if (!this.selectedTicket || !this.selectedAgent) {
      return;
    }

    this.ticketService.reassignTicket(this.selectedTicket.id, this.selectedAgent);
    this.selectedTicket = this.ticketService.getTicketById(this.selectedTicket.id);
    this.loadTickets();
  }

  acceptSolution(): void {
    if (!this.selectedTicket) {
      return;
    }

    this.ticketService.changeTicketStatus(
      this.selectedTicket.id,
      'cerrados',
      'Se acepto la solucion del ticket.',
    );
    this.selectedTicket = this.ticketService.getTicketById(this.selectedTicket.id);
    this.loadTickets();
  }

  rejectSolution(): void {
    if (!this.selectedTicket) {
      return;
    }

    this.ticketService.changeTicketStatus(
      this.selectedTicket.id,
      'rechazados',
      'Se anulo la solucion del ticket.',
    );
    this.selectedTicket = this.ticketService.getTicketById(this.selectedTicket.id);
    this.loadTickets();
  }

  markDeleted(ticket: Ticket): void {
    this.ticketService.changeTicketStatus(
      ticket.id,
      'eliminados',
      'El ticket fue marcado como eliminado desde monitoreo.',
    );
    this.loadTickets();
  }

  getCount(status: TicketStatus): number {
    return this.ticketService.countByStatus()[status];
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
}
