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
import {
  TICKET_AREAS,
  TICKET_SERVICE_TYPES,
} from '../../core/data/ticket-catalogs';
import { AuthService, UserRole } from '../../core/services/auth';
import { TicketService } from '../../core/services/ticket';
import {
  Ticket,
  TicketPriority,
  TicketSortDirection,
  TicketSortField,
  TicketStatus,
} from '../../models/ticket';

@Component({
  selector: 'app-tickets',
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
  templateUrl: './tickets.html',
  styleUrls: ['./tickets.css'],
})
export class TicketsComponent {
  readonly statuses: { key: TicketStatus; label: string }[] = [
    { key: 'por-cerrar', label: 'Tickets por cerrar' },
    { key: 'rechazados', label: 'Tickets rechazados' },
    { key: 'cerrados', label: 'Tickets cerrados' },
    { key: 'eliminados', label: 'Tickets eliminados' },
  ];
  readonly priorities: TicketPriority[] = ['baja', 'media', 'alta', 'urgente'];
  readonly areas = [...TICKET_AREAS];
  readonly serviceTypes = [...TICKET_SERVICE_TYPES];
  readonly sortOptions: { value: TicketSortField; label: string }[] = [
    { value: 'fecha', label: 'Fecha de creacion' },
    { value: 'prioridad', label: 'Prioridad' },
    { value: 'estado', label: 'Estado' },
  ];

  asunto = '';
  area = this.areas[0];
  tipoServicio = this.serviceTypes[0];
  requerimiento = '';
  prioridad: TicketPriority = 'media';
  descripcion = '';
  searchTerm = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  selectedPriority: TicketPriority | '' = '';
  sortBy: TicketSortField = 'fecha';
  sortDirection: TicketSortDirection = 'desc';
  selectedStatus: TicketStatus = 'por-cerrar';
  selectedTicket: Ticket | null = null;
  attentionDescription = '';
  attentionSavedMessage = '';
  showCreateForm = false;
  successMessage = '';
  tickets: Ticket[] = [];

  constructor(
    private auth: AuthService,
    private ticketService: TicketService,
  ) {}

  ngOnInit() {
    this.cargarTickets();
  }

  cargarTickets() {
    const filteredTickets = this.ticketService.filterTickets({
      status: this.selectedStatus,
      searchTerm: this.searchTerm,
      prioridad: this.selectedPriority || undefined,
      fechaDesde: this.formatDateFilter(this.fechaDesde),
      fechaHasta: this.formatDateFilter(this.fechaHasta),
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
    });

    this.tickets =
      this.currentRole === 'colaborador'
        ? filteredTickets.filter((ticket) => ticket.usuario === this.currentUserName)
        : filteredTickets;

    if (this.selectedTicket) {
      this.selectedTicket = this.ticketService.getTicketById(this.selectedTicket.id);
      this.attentionDescription = this.selectedTicket?.atencion?.descripcion ?? '';
    }
  }

  crearTicket() {
    this.successMessage = '';

    if (
      !this.asunto.trim() ||
      !this.area.trim() ||
      !this.tipoServicio.trim() ||
      !this.requerimiento.trim()
    ) {
      return;
    }

    const createdTicket = this.ticketService.createTicket({
      asunto: this.asunto,
      area: this.area,
      tipoServicio: this.tipoServicio,
      requerimiento: this.requerimiento,
      prioridad: this.prioridad,
      descripcion: this.descripcion,
      usuario: this.currentUserName,
    });

    this.successMessage = `Ticket ${createdTicket.nro || `TCK-${createdTicket.id}`} registrado correctamente.`;

    this.asunto = '';
    this.area = this.areas[0];
    this.tipoServicio = this.serviceTypes[0];
    this.requerimiento = '';
    this.prioridad = 'media';
    this.descripcion = '';
    this.showCreateForm = false;

    this.cargarTickets();
  }

  setStatus(status: TicketStatus): void {
    this.selectedStatus = status;
    this.cargarTickets();
  }

  onSearchChange(): void {
    this.cargarTickets();
  }

  onSortChange(): void {
    this.cargarTickets();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.selectedPriority = '';
    this.sortBy = 'fecha';
    this.sortDirection = 'desc';
    this.cargarTickets();
  }

  toggleCreateForm(): void {
    this.successMessage = '';
    this.showCreateForm = !this.showCreateForm;
  }

  openDetail(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.attentionDescription = ticket.atencion?.descripcion ?? '';
    this.attentionSavedMessage = '';
  }

  closeDetail(): void {
    this.selectedTicket = null;
    this.attentionDescription = '';
    this.attentionSavedMessage = '';
  }

  changeStatus(ticket: Ticket, status: TicketStatus): void {
    this.ticketService.changeTicketStatus(ticket.id, status);
    this.cargarTickets();
  }

  saveAttention(): void {
    if (!this.canManageTickets || !this.selectedTicket || !this.attentionDescription.trim()) {
      return;
    }

    this.ticketService.addAttentionDescription(
      this.selectedTicket.id,
      this.attentionDescription,
    );
    this.ticketService.addHistoryEvent(
      this.selectedTicket.id,
      'SEGUIMIENTO',
      'Se registro un avance en la atencion del ticket.',
    );
    this.attentionSavedMessage = 'Avance registrado correctamente.';
    this.cargarTickets();
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

  get visibleTicketsLabel(): string {
    return this.statuses.find((status) => status.key === this.selectedStatus)?.label ?? 'Tickets';
  }

  get currentRole(): UserRole | null {
    return this.auth.getCurrentRole();
  }

  get currentUserName(): string {
    return this.auth.getCurrentUser()?.nombre || 'Usuario';
  }

  get canCreateTickets(): boolean {
    return true;
  }

  get canManageTickets(): boolean {
    return this.currentRole === 'jefe' || this.currentRole === 'tecnico';
  }

  get pageTitle(): string {
    return this.currentRole === 'colaborador'
      ? 'Registro y seguimiento de mis tickets'
      : 'Gestion de tickets asignados';
  }

  get pageDescription(): string {
    return this.currentRole === 'colaborador'
      ? 'Registra incidencias y revisa el estado de tus solicitudes desde una sola vista.'
      : 'Filtra, revisa y actualiza tickets desde una sola vista, con una base de datos local ya preparada para el siguiente paso del sistema.';
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
