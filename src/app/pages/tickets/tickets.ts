import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
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
export class TicketsComponent implements OnInit {

  // =========================
  // CATÁLOGOS
  // =========================
  
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
    { value: 'fecha', label: 'Fecha de creación' },
    { value: 'prioridad', label: 'Prioridad' },
    { value: 'estado', label: 'Estado' },
  ];

  // =========================
  // FORMULARIO
  // =========================

  asunto = '';
  area = this.areas[0];
  tipoServicio = this.serviceTypes[0];
  requerimiento = '';
  prioridad: TicketPriority = 'media';
  descripcion = '';
  // --- NUEVAS VARIABLES PARA EL ARCHIVO ---
  selectedFile: File | null = null;
  fileName = '';

  // =========================
  // FILTROS
  // =========================

  searchTerm = '';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  selectedPriority: TicketPriority | '' = '';

  sortBy: TicketSortField = 'fecha';
  sortDirection: TicketSortDirection = 'desc';

  selectedStatus: TicketStatus = 'por-cerrar';

  // =========================
  // ESTADO UI
  // =========================

  tickets: Ticket[] = [];
  selectedTicket: Ticket | null = null;
  statusCounts: Record<string, number> = {};

  attentionDescription = '';
  attentionSavedMessage = '';
  successMessage = '';
  showCreateForm = false;
  isTableLoading = false;
  isSubmitting = false;

  constructor(
    private auth: AuthService,
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef // <--- 2. Inyectamos ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarTickets();
  }

  // =========================
  // CARGAR TICKETS
  // =========================

  async cargarTickets(): Promise<void> {
    this.isTableLoading = true;
    this.cdr.detectChanges(); // Mostrar spinner

    try {
      // 1. Cargamos la lista filtrada
      const filteredTickets = await this.ticketService.filterTickets({
        status: this.selectedStatus,
        searchTerm: this.searchTerm,
        prioridad: this.selectedPriority || undefined,
        fechaDesde: this.formatDateFilter(this.fechaDesde),
        fechaHasta: this.formatDateFilter(this.fechaHasta),
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
        usuarioId: this.auth.getCurrentUser()?.usuario,
      });

      this.tickets = filteredTickets;

      // 2. Cargamos los conteos
      this.statusCounts = await this.ticketService.countByStatus();

      if (this.selectedTicket) {
        this.selectedTicket = await this.ticketService.getTicketById(this.selectedTicket.id);
        this.attentionDescription = this.selectedTicket?.atencion?.descripcion ?? '';
      }

      // ✨ OBLIGAMOS A ANGULAR A RECOGER LOS CAMBIOS DE AWS
      this.cdr.detectChanges();

    } catch (error) {
      console.error('Error cargando tickets desde AWS:', error);
    } finally {
      this.isTableLoading = false;
      this.cdr.detectChanges();
    }
  }

  // =========================
  // CREAR TICKET
  // =========================

  async crearTicket(): Promise<void> {
    this.successMessage = '';

    if (!this.asunto.trim() || !this.area.trim() || !this.tipoServicio.trim() || !this.requerimiento.trim()) {
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    try {
      let documentoUrlFinal = null;

      // ✨ LA MAGIA DE S3 COMIENZA AQUÍ ✨
      if (this.selectedFile) {
        // 1. Pedimos el pase VIP a AWS
        const s3Data = await this.ticketService.getUploadUrl(this.selectedFile.name, this.selectedFile.type);
        
        // 2. Subimos el archivo directamente a Amazon S3
        await this.ticketService.uploadFileToS3(s3Data.uploadUrl, this.selectedFile);

        // 3. Guardamos el enlace público/privado
        documentoUrlFinal = s3Data.fileUrl;
      }

      // 4. Creamos el ticket en la Base de Datos (solo con texto y el enlace)
      const createdTicket = await this.ticketService.createTicket({
        asunto: this.asunto,
        area: this.area,
        tipoServicio: this.tipoServicio,
        requerimiento: this.requerimiento,
        prioridad: this.prioridad,
        descripcion: this.descripcion,
        documento: documentoUrlFinal, // <--- Enviamos la URL generada en S3
        usuario: this.currentUserName,
        usuarioId: this.auth.getCurrentUser()?.usuario,
      });

      this.successMessage = `Ticket ${createdTicket.nro || `TCK-${createdTicket.id}`} registrado correctamente.`;

      // Limpiar formulario
      this.asunto = '';
      this.area = this.areas[0];
      this.tipoServicio = this.serviceTypes[0];
      this.requerimiento = '';
      this.prioridad = 'media';
      this.descripcion = '';
      this.selectedFile = null; // Limpiar archivo
      this.fileName = '';       // Limpiar nombre
      this.showCreateForm = false;

      await this.cargarTickets();

    } catch (error) {
      console.error('Error creando ticket o subiendo archivo:', error);
      alert('Error: No se pudo crear el ticket o subir el documento.');
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  // =========================
  // CAMBIO DE ESTADO
  // =========================

  async setStatus(status: TicketStatus): Promise<void> {
    this.selectedStatus = status;
    await this.cargarTickets();
  }

  async changeStatus(ticket: Ticket, status: TicketStatus): Promise<void> {
    try {
      await this.ticketService.changeTicketStatus(
        ticket.id,
        status,
        this.auth.getCurrentUser()?.usuario,
      );
      await this.cargarTickets();
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  }

  // =========================
  // FILTROS
  // =========================

  async onSearchChange(): Promise<void> {
    await this.cargarTickets();
  }

  async onSortChange(): Promise<void> {
    await this.cargarTickets();
  }

  async clearFilters(): Promise<void> {
    this.searchTerm = '';
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.selectedPriority = '';
    this.sortBy = 'fecha';
    this.sortDirection = 'desc';
    await this.cargarTickets();
  }

  // =========================
  // FORMULARIO UI
  // =========================

  toggleCreateForm(): void {
    this.successMessage = '';
    this.showCreateForm = !this.showCreateForm;
    this.cdr.detectChanges();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileName = file.name;
      this.cdr.detectChanges();
    }
  }

  // =========================
  // DETALLE
  // =========================

  openDetail(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.attentionDescription = ticket.atencion?.descripcion ?? '';
    this.attentionSavedMessage = '';
    this.cdr.detectChanges(); // Asegurar que el panel lateral se abra con datos
  }

  closeDetail(): void {
    this.selectedTicket = null;
    this.attentionDescription = '';
    this.attentionSavedMessage = '';
    this.cdr.detectChanges();
  }

  // =========================
  // GUARDAR SEGUIMIENTO
  // =========================

  async saveAttention(): Promise<void> {
    if (!this.canManageTickets || !this.selectedTicket || !this.attentionDescription.trim()) {
      return;
    }

    try {
      await this.ticketService.addAttentionDescription(
        this.selectedTicket.id,
        this.attentionDescription,
        this.auth.getCurrentUser()?.usuario,
      );

      this.attentionSavedMessage = 'Avance registrado correctamente.';
      await this.cargarTickets();
    } catch (error) {
      console.error('Error registrando avance:', error);
      alert('Error al registrar avance');
    }
  }

  // =========================
  // CONTADORES
  // =========================

  getCount(status: TicketStatus): number {
    return this.statusCounts[status] ?? 0;
  }

  // =========================
  // LABELS
  // =========================

  getStatusLabel(status: TicketStatus): string {
    return this.ticketService.getStatusLabel(status);
  }

  getPriorityLabel(priority: TicketPriority): string {
    return this.ticketService.getPriorityLabel(priority);
  }

  // =========================
  // GETTERS
  // =========================

  get visibleTicketsLabel(): string {
    return (
      this.statuses.find((status) => status.key === this.selectedStatus)?.label ?? 'Tickets'
    );
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
      : 'Gestión de tickets asignados';
  }

  get pageDescription(): string {
    return this.currentRole === 'colaborador'
      ? 'Registra incidencias y revisa el estado de tus solicitudes.'
      : 'Filtra, revisa y actualiza tickets conectados a AWS.';
  }

  // =========================
  // UTILIDADES
  // =========================

  private formatDateFilter(date: Date | null): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}