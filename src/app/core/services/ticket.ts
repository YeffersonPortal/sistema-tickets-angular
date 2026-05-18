import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { ApiResponse } from '../api/api-response';
import {
  Ticket,
  TicketAttention,
  TicketCreateInput,
  TicketFilters,
  TicketHistoryEvent,
  TicketPriority,
  TicketSortDirection,
  TicketStatistics,
  TicketStatus,
  TicketValidationResult,
} from '../../models/ticket';

interface TicketDetailApi {
  ticket: Partial<Ticket> | null;
  historial: TicketHistoryEvent[];
  atencion: TicketAttention | null;
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {
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

  constructor(private http: HttpClient) {}

  getAllTickets(): Observable<Ticket[]> {
    return this.filterTickets();
  }

  getTickets(): Observable<Ticket[]> {
    return this.getAllTickets();
  }

  getTicketById(id: number): Observable<Ticket | null> {
    const params = new HttpParams().set('ticketId', String(id));

    return this.http
      .get<ApiResponse<TicketDetailApi>>(`${API_BASE_URL}/ticket`, { params })
      .pipe(
        map((response) => {
          if (!response.ok || !response.data.ticket) {
            return null;
          }

          return this.normalizeTicket({
            ...response.data.ticket,
            historial: response.data.historial ?? [],
            atencion: response.data.atencion ?? null,
          });
        }),
      );
  }

  createTicket(ticketData: TicketCreateInput, usuarioId: number | null): Observable<Ticket> {
    const validation = this.validateTicket({
      ...ticketData,
      status: 'por-cerrar',
    });

    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    return this.http
      .post<ApiResponse<Partial<Ticket>>>(`${API_BASE_URL}/tickets`, {
        asunto: ticketData.asunto,
        usuarioId,
        area: ticketData.area,
        tipoServicio: ticketData.tipoServicio,
        prioridad: ticketData.prioridad,
        requerimiento: ticketData.requerimiento,
        descripcion: ticketData.descripcion,
        documentoUrl: ticketData.documento,
        tecnicoId: ticketData.tecnico,
      })
      .pipe(map((response) => this.normalizeTicket(response.data)));
  }

  changeTicketStatus(
    id: number,
    newStatus: TicketStatus,
    usuarioId: number | null,
    mensaje = '',
  ): Observable<Ticket> {
    return this.http
      .post<ApiResponse<Partial<Ticket>>>(`${API_BASE_URL}/ticket/estado`, {
        ticketId: id,
        estado: newStatus,
        usuarioId,
        mensaje,
      })
      .pipe(map((response) => this.normalizeTicket(response.data)));
  }

  reassignTicket(
    id: number,
    tecnicoId: number | null,
    usuarioId: number | null,
  ): Observable<Ticket> {
    return this.http
      .post<ApiResponse<Partial<Ticket>>>(`${API_BASE_URL}/ticket/reasignar`, {
        ticketId: id,
        tecnicoId,
        usuarioId,
      })
      .pipe(map((response) => this.normalizeTicket(response.data)));
  }

  addHistoryEvent(id: number, accion: string, mensaje: string): Observable<Ticket | null> {
    return this.getTicketById(id);
  }

  addAttentionDescription(
    id: number,
    descripcion: string,
    usuarioId: number | null,
    documento: string | null = null,
  ): Observable<TicketAttention> {
    return this.http
      .post<ApiResponse<TicketAttention>>(`${API_BASE_URL}/ticket/atencion`, {
        ticketId: id,
        usuarioId,
        descripcion,
        documentoUrl: documento,
      })
      .pipe(map((response) => response.data));
  }

  filterTickets(filters: TicketFilters = {}): Observable<Ticket[]> {
    let params = new HttpParams();

    if (filters.status) {
      params = params.set('estado', filters.status);
    }

    if (filters.usuario) {
      params = params.set('usuarioId', filters.usuario);
    }

    if (filters.prioridad) {
      params = params.set('prioridad', filters.prioridad);
    }

    if (filters.searchTerm) {
      params = params.set('search', filters.searchTerm);
    }

    if (filters.fechaDesde) {
      params = params.set('fechaDesde', filters.fechaDesde);
    }

    if (filters.fechaHasta) {
      params = params.set('fechaHasta', filters.fechaHasta);
    }

    return this.http
      .get<ApiResponse<Partial<Ticket>[]>>(`${API_BASE_URL}/tickets`, { params })
      .pipe(
        map((response) => {
          const tickets = (response.data ?? []).map((ticket) =>
            this.normalizeTicket(ticket),
          );
          return this.sortTickets(tickets, filters.sortBy, filters.sortDirection);
        }),
      );
  }

  countByStatus(filters: TicketFilters = {}): Observable<Record<TicketStatus, number>> {
    return this.filterTickets(filters).pipe(
      map((tickets) =>
        tickets.reduce<Record<TicketStatus, number>>(
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
        ),
      ),
    );
  }

  getStatistics(): Observable<TicketStatistics> {
    return this.http
      .get<ApiResponse<TicketStatistics>>(`${API_BASE_URL}/dashboard`)
      .pipe(map((response) => response.data));
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
    }

    if (!ticket.tipoServicio?.trim()) {
      errors.push('El tipo de servicio es requerido');
    }

    if (!ticket.requerimiento?.trim()) {
      errors.push('El requerimiento es requerido');
    }

    if (!ticket.prioridad) {
      errors.push('La prioridad es requerida');
    } else if (!this.validPriorities.includes(ticket.prioridad)) {
      errors.push('Prioridad invalida');
    }

    if (ticket.status && !this.validStatuses.includes(ticket.status)) {
      errors.push('Estado invalido');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private normalizeTicket(ticket: Partial<Ticket> | null | undefined): Ticket {
    const apiTicket = ticket as (Partial<Ticket> & { id_tecnico?: number | null }) | null | undefined;

    return {
      id: ticket?.id ?? 0,
      asunto: ticket?.asunto ?? '',
      usuario: ticket?.usuario ?? 'Usuario del sistema',
      fi: this.formatApiDate(ticket?.fi),
      fc: this.formatApiDate(ticket?.fc) || '-',
      status: this.validStatuses.includes(ticket?.status as TicketStatus)
        ? (ticket?.status as TicketStatus)
        : 'por-cerrar',
      area: ticket?.area ?? '',
      tipoServicio: ticket?.tipoServicio ?? '',
      requerimiento: ticket?.requerimiento ?? '',
      prioridad: this.validPriorities.includes(ticket?.prioridad as TicketPriority)
        ? (ticket?.prioridad as TicketPriority)
        : 'media',
      descripcion: ticket?.descripcion ?? '',
      documento: ticket?.documento ?? null,
      historial: ticket?.historial ?? [],
      atencion: ticket?.atencion ?? null,
      tecnico: ticket?.tecnico ?? null,
      idTecnico: apiTicket?.idTecnico ?? apiTicket?.id_tecnico ?? null,
      nro: ticket?.nro ?? null,
    };
  }

  private sortTickets(
    tickets: Ticket[],
    sortBy: TicketFilters['sortBy'],
    sortDirection: TicketFilters['sortDirection'] = 'desc',
  ): Ticket[] {
    if (!sortBy) {
      return tickets;
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...tickets].sort((left, right) => {
      if (sortBy === 'fecha') {
        return (this.parseDate(left.fi) - this.parseDate(right.fi)) * direction;
      }

      if (sortBy === 'prioridad') {
        return (
          (this.getPriorityRank(left.prioridad) -
            this.getPriorityRank(right.prioridad)) * direction
        );
      }

      return left.status.localeCompare(right.status) * direction;
    });
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

  private parseDate(value: string): number {
    if (!value || value === '-') {
      return 0;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private formatApiDate(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
