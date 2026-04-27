import { Injectable } from '@angular/core';
import {
  Ticket,
  TicketAttention,
  TicketCreateInput,
  TicketFilters,
  TicketHistoryEvent,
  TicketPriority,
  TicketStatistics,
  TicketStatus,
  TicketValidationResult,
} from '../../models/ticket';
import { TICKET_AREAS, TICKET_SERVICE_TYPES } from '../data/ticket-catalogs';
import { NotificationService } from './notification';
import { StorageService } from './storage';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private readonly key = 'tickets';
  private readonly validStatuses: TicketStatus[] = [
    'por-cerrar',
    'rechazados',
    'cerrados',
    'eliminados',
  ];
  private readonly validPriorities: TicketPriority[] = [
    'baja',
    'media',
    'alta',
    'urgente',
  ];
  private readonly validAreas = [...TICKET_AREAS];
  private readonly validServiceTypes = [...TICKET_SERVICE_TYPES];

  constructor(
    private storage: StorageService,
    private notifications: NotificationService,
  ) {}

  getAllTickets(): Ticket[] {
    const rawTickets = this.storage.getAll<Partial<Ticket>>(this.key);
    return rawTickets.map((ticket) => this.normalizeTicket(ticket));
  }

  getTickets(): Ticket[] {
    return this.getAllTickets();
  }

  getTicketById(id: number): Ticket | null {
    const ticket = this.storage.getById<Ticket>(this.key, id);
    return ticket ? this.normalizeTicket(ticket) : null;
  }

  createTicket(ticketData: TicketCreateInput): Ticket {
    const ticket = this.buildNewTicket(ticketData);
    const validation = this.validateTicket(ticket);

    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const success = this.storage.add(this.key, ticket);
    if (!success) {
      throw new Error('Error al guardar el ticket');
    }

    if (ticket.tecnico) {
      this.notifications.createNotification(
        ticket.tecnico,
        'Nuevo ticket asignado',
        `Se te asigno el ticket ${ticket.nro || `TCK-${ticket.id}`}.`,
      );
    }

    return ticket;
  }

  addTicket(ticket: Ticket): void {
    const validation = this.validateTicket(ticket);

    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const success = this.storage.add(this.key, ticket);
    if (!success) {
      throw new Error('Error al guardar el ticket');
    }
  }

  updateTicket(id: number, updates: Partial<Ticket>): Ticket {
    const ticket = this.getTicketById(id);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    const updatedTicket = this.normalizeTicket({
      ...ticket,
      ...updates,
    });
    const validation = this.validateTicket(updatedTicket);

    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const success = this.storage.update(this.key, id, updatedTicket);
    if (!success) {
      throw new Error('Error al actualizar el ticket');
    }

    return updatedTicket;
  }

  changeTicketStatus(
    id: number,
    newStatus: TicketStatus,
    mensaje = '',
  ): Ticket {
    const ticket = this.getTicketById(id);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    if (!this.validStatuses.includes(newStatus)) {
      throw new Error('Estado invalido');
    }

    const updatedTicket: Ticket = {
      ...ticket,
      status: newStatus,
      fc: newStatus === 'cerrados' ? this.getCurrentDate() : ticket.fc,
      historial: [
        ...ticket.historial,
        {
          fecha: this.getCurrentDateTime(),
          accion: this.getStatusAction(newStatus),
          mensaje:
            mensaje || `Se cambio el estado a ${this.getStatusLabel(newStatus)}`,
        },
      ],
    };

    const success = this.storage.update(this.key, id, updatedTicket);
    if (!success) {
      throw new Error('Error al cambiar estado del ticket');
    }

    return updatedTicket;
  }

  reassignTicket(id: number, newUser: string): Ticket {
    const ticket = this.getTicketById(id);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    const historyEvent: TicketHistoryEvent = {
      fecha: this.getCurrentDateTime(),
      accion: 'REASIGNACION',
      mensaje: `Ticket reasignado a ${newUser}`,
    };

    const updatedTicket: Ticket = {
      ...ticket,
      usuario: newUser,
      tecnico: newUser,
      historial: [...ticket.historial, historyEvent],
    };

    const success = this.storage.update(this.key, id, updatedTicket);
    if (!success) {
      throw new Error('Error al reasignar el ticket');
    }

    this.notifications.createNotification(
      newUser,
      'Ticket reasignado',
      `Tienes asignado el ticket ${ticket.nro || `TCK-${ticket.id}`}.`,
    );

    return updatedTicket;
  }

  addHistoryEvent(id: number, accion: string, mensaje: string): Ticket {
    const ticket = this.getTicketById(id);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    const historyEvent: TicketHistoryEvent = {
      fecha: this.getCurrentDateTime(),
      accion,
      mensaje,
    };

    const updatedTicket: Ticket = {
      ...ticket,
      historial: [...ticket.historial, historyEvent],
    };

    const success = this.storage.update(this.key, id, updatedTicket);
    if (!success) {
      throw new Error('Error al agregar evento al historial');
    }

    return updatedTicket;
  }

  addAttentionDescription(
    id: number,
    descripcion: string,
    documento: string | null = null,
  ): Ticket {
    const ticket = this.getTicketById(id);
    if (!ticket) {
      throw new Error('Ticket no encontrado');
    }

    const attention: TicketAttention = {
      descripcion,
      documento,
    };

    const updatedTicket: Ticket = {
      ...ticket,
      atencion: attention,
    };

    const success = this.storage.update(this.key, id, updatedTicket);
    if (!success) {
      throw new Error('Error al agregar descripcion de atencion');
    }

    return updatedTicket;
  }

  deleteTicket(id: number): boolean {
    return this.storage.delete<Ticket>(this.key, id);
  }

  getTicketsByStatus(status: TicketStatus): Ticket[] {
    return this.getAllTickets().filter((ticket) => ticket.status === status);
  }

  getTicketsByUser(usuario: string): Ticket[] {
    return this.getAllTickets().filter((ticket) => ticket.usuario === usuario);
  }

  getTicketsByPriority(prioridad: TicketPriority): Ticket[] {
    return this.getAllTickets().filter(
      (ticket) => ticket.prioridad === prioridad,
    );
  }

  filterTickets(filters: TicketFilters = {}): Ticket[] {
    let tickets = this.getAllTickets();

    if (filters.status) {
      tickets = tickets.filter((ticket) => ticket.status === filters.status);
    }

    if (filters.usuario) {
      tickets = tickets.filter((ticket) => ticket.usuario === filters.usuario);
    }

    if (filters.prioridad) {
      tickets = tickets.filter(
        (ticket) => ticket.prioridad === filters.prioridad,
      );
    }

    if (filters.area) {
      tickets = tickets.filter((ticket) => ticket.area === filters.area);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      tickets = tickets.filter((ticket) => {
        const searchableText = [
          ticket.id,
          ticket.nro ?? '',
          ticket.asunto,
          ticket.usuario,
          ticket.area,
          ticket.requerimiento,
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(term);
      });
    }

    if (filters.fechaDesde) {
      const desde = new Date(filters.fechaDesde);
      tickets = tickets.filter((ticket) => {
        const ticketDate = this.parseDateFromString(ticket.fi);
        return ticketDate !== null && ticketDate >= desde;
      });
    }

    if (filters.fechaHasta) {
      const hasta = new Date(filters.fechaHasta);
      tickets = tickets.filter((ticket) => {
        const ticketDate = this.parseDateFromString(ticket.fi);
        return ticketDate !== null && ticketDate <= hasta;
      });
    }

    if (filters.sortBy) {
      const direction = filters.sortDirection === 'asc' ? 1 : -1;
      tickets = [...tickets].sort((left, right) => {
        if (filters.sortBy === 'fecha') {
          const leftDate = this.parseDateFromString(left.fi)?.getTime() ?? 0;
          const rightDate = this.parseDateFromString(right.fi)?.getTime() ?? 0;
          return (leftDate - rightDate) * direction;
        }

        if (filters.sortBy === 'prioridad') {
          return (
            (this.getPriorityRank(left.prioridad) -
              this.getPriorityRank(right.prioridad)) * direction
          );
        }

        return left.status.localeCompare(right.status) * direction;
      });
    }

    return tickets;
  }

  countByStatus(): Record<TicketStatus, number> {
    return this.getAllTickets().reduce<Record<TicketStatus, number>>(
      (acc, ticket) => {
        acc[ticket.status] += 1;
        return acc;
      },
      {
        'por-cerrar': 0,
        rechazados: 0,
        cerrados: 0,
        eliminados: 0,
      },
    );
  }

  getStatistics(): TicketStatistics {
    const tickets = this.getAllTickets();
    const counts = this.countByStatus();

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

  getUniqueUsers(): string[] {
    return [...new Set(this.getAllTickets().map((ticket) => ticket.usuario))];
  }

  getUniqueAreas(): string[] {
    return [...new Set(this.getAllTickets().map((ticket) => ticket.area))];
  }

  clearAllTickets(): boolean {
    return this.storage.clear(this.key);
  }

  getStatusLabel(status: TicketStatus): string {
    const labels: Record<TicketStatus, string> = {
      'por-cerrar': 'Por cerrar',
      rechazados: 'Rechazado',
      cerrados: 'Cerrado',
      eliminados: 'Eliminado',
    };

    return labels[status];
  }

  getPriorityLabel(prioridad: TicketPriority | null | undefined): string {
    if (!prioridad) {
      return '-';
    }

    return prioridad.charAt(0).toUpperCase() + prioridad.slice(1);
  }

  validateTicket(ticket: Partial<Ticket>): TicketValidationResult {
    const errors: string[] = [];

    if (!ticket.asunto?.trim()) {
      errors.push('El asunto es requerido');
    }

    if (!ticket.area?.trim()) {
      errors.push('El area es requerida');
    } else if (!this.validAreas.includes(ticket.area as (typeof this.validAreas)[number])) {
      errors.push('El area seleccionada no es valida');
    }

    if (!ticket.tipoServicio?.trim()) {
      errors.push('El tipo de servicio es requerido');
    } else if (
      !this.validServiceTypes.includes(
        ticket.tipoServicio as (typeof this.validServiceTypes)[number],
      )
    ) {
      errors.push('La categoria seleccionada no es valida');
    }

    if (!ticket.requerimiento?.trim()) {
      errors.push('El requerimiento es requerido');
    }

    if (!ticket.prioridad) {
      errors.push('La prioridad es requerida');
    } else if (!this.validPriorities.includes(ticket.prioridad)) {
      errors.push('Prioridad invalida');
    }

    if (!ticket.status) {
      errors.push('El estado es requerido');
    } else if (!this.validStatuses.includes(ticket.status)) {
      errors.push('Estado invalido');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private buildNewTicket(ticketData: TicketCreateInput): Ticket {
    const nextId = this.getNextId();
    const currentDate = this.getCurrentDate();
    const currentDateTime = this.getCurrentDateTime();

    return {
      id: nextId,
      asunto: ticketData.asunto.trim(),
      usuario: ticketData.usuario?.trim() || 'Usuario del sistema',
      fi: currentDate,
      fc: '-',
      status: 'por-cerrar',
      area: ticketData.area.trim(),
      tipoServicio: ticketData.tipoServicio.trim(),
      requerimiento: ticketData.requerimiento.trim(),
      prioridad: ticketData.prioridad,
      descripcion: ticketData.descripcion?.trim() || '',
      documento: ticketData.documento ?? null,
      historial: [
        {
          fecha: currentDateTime,
          accion: 'APERTURA',
          mensaje: 'Se abrio el ticket.',
        },
      ],
      atencion: null,
      tecnico: ticketData.tecnico ?? null,
      nro: ticketData.nro ?? `TCK-${String(nextId).padStart(4, '0')}`,
    };
  }

  private normalizeTicket(ticket: Partial<Ticket>): Ticket {
    return {
      id: ticket.id ?? 0,
      asunto: ticket.asunto ?? '',
      usuario: ticket.usuario ?? 'Usuario del sistema',
      fi: ticket.fi ?? '',
      fc: ticket.fc ?? '-',
      status: this.validStatuses.includes(ticket.status as TicketStatus)
        ? (ticket.status as TicketStatus)
        : 'por-cerrar',
      area: ticket.area ?? '',
      tipoServicio: ticket.tipoServicio ?? '',
      requerimiento: ticket.requerimiento ?? '',
      prioridad: this.validPriorities.includes(ticket.prioridad as TicketPriority)
        ? (ticket.prioridad as TicketPriority)
        : 'media',
      descripcion: ticket.descripcion ?? '',
      documento: ticket.documento ?? null,
      historial: ticket.historial ?? [],
      atencion: ticket.atencion ?? null,
      tecnico: ticket.tecnico ?? null,
      nro: ticket.nro ?? null,
    };
  }

  private getNextId(): number {
    const tickets = this.getAllTickets();
    return tickets.length > 0 ? Math.max(...tickets.map((ticket) => ticket.id)) + 1 : 1;
  }

  private getStatusAction(status: TicketStatus): string {
    const actions: Record<TicketStatus, string> = {
      'por-cerrar': 'APERTURA',
      rechazados: 'RECHAZO',
      cerrados: 'CIERRE',
      eliminados: 'ELIMINACION',
    };

    return actions[status];
  }

  private getPriorityRank(priority: TicketPriority): number {
    const ranks: Record<TicketPriority, number> = {
      baja: 1,
      media: 2,
      alta: 3,
      urgente: 4,
    };

    return ranks[priority];
  }

  private parseDateFromString(dateStr: string): Date | null {
    if (!dateStr || dateStr === '-') {
      return null;
    }

    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      return null;
    }

    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }

  private getCurrentDate(): string {
    return new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private getCurrentDateTime(): string {
    return new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
