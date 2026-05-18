import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Ticket,
  TicketAttention,
  TicketCreateInput,
  TicketFilters,
  TicketStatistics,
  TicketStatus,
  TicketValidationResult,
} from '../../models/ticket';
import { TICKET_AREAS, TICKET_SERVICE_TYPES } from '../data/ticket-catalogs';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  // 1. URL DE TU API GATEWAY
  private readonly apiUrl = 'https://ngji0j6x3a.execute-api.us-east-1.amazonaws.com/v1';

  constructor(
    private http: HttpClient
  ) {}

  // 2. OBTENER TICKETS CON FILTROS (Extrae el array de 'data')
  async filterTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
    let params = new HttpParams();
    
    if (filters.status) params = params.set('estado', filters.status);
    if (filters.prioridad) params = params.set('prioridad', filters.prioridad);
    if (filters.searchTerm) params = params.set('buscar', filters.searchTerm);
    if (filters.usuarioId) params = params.set('usuarioId', filters.usuarioId.toString());

    const response = await firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/tickets`, { params })
    );
    
    // EL SECRETO: Extraer el array de tickets
    return response.data || [];
  }

  // 3. OBTENER DETALLE (Extrae el objeto de 'data')
  async getTicketById(id: number): Promise<Ticket | null> {
    const response = await firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/tickets/detail`, {
        params: new HttpParams().set('ticketId', id.toString())
      })
    );
    
    return response.data || null;
  }

  // 4. CREAR TICKET (Extrae la confirmación de 'data')
  async createTicket(ticketData: any): Promise<any> {
    const body = {
      asunto: ticketData.asunto,
      usuarioId: ticketData.usuarioId, 
      area: ticketData.area,
      tipoServicio: ticketData.tipoServicio,
      prioridad: ticketData.prioridad,
      requerimiento: ticketData.requerimiento,
      descripcion: ticketData.descripcion,
      documentoUrl: ticketData.documento || null,
      tecnicoId: ticketData.tecnicoId || null
    };

    const response = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/tickets`, body)
    );
    
    return response.data;
  }
// =========================
  // ARCHIVOS Y S3
  // =========================

  // 1. Pedir el Pase VIP a tu nueva Lambda
  async getUploadUrl(fileName: string, fileType: string): Promise<{uploadUrl: string, fileUrl: string}> {
    const body = { fileName, fileType };
    // Llamamos a la ruta /upload-url que creaste en API Gateway
    const response = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/upload-url`, body)
    );
    return response; 
  }

  // 2. Subir el archivo físicamente a Amazon S3
  async uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    await firstValueFrom(
      this.http.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type
        }
      })
    );
  }
  // 5. CAMBIAR ESTADO
  async changeTicketStatus(id: number, newStatus: string, usuarioId: any, mensaje = ''): Promise<void> {
    const body = {
      ticketId: id.toString(),
      estado: newStatus,
      usuarioId: usuarioId.toString(),
      mensaje: mensaje
    };

    await firstValueFrom(
      this.http.post(`${this.apiUrl}/tickets/status`, body)
    );
  }

  // 6. AGREGAR SEGUIMIENTO
  async addAttentionDescription(id: number, descripcion: string, usuarioId: any): Promise<void> {
    const body = {
      ticketId: id.toString(),
      usuarioId: usuarioId.toString(),
      descripcion: descripcion,
      documentoUrl: null
    };

    await firstValueFrom(
      this.http.post(`${this.apiUrl}/tickets/attention`, body)
    );
  }

  // 7. DASHBOARD (Extrae los números de 'data')
  async getStatistics(): Promise<TicketStatistics> {
    const response = await firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/dashboard`)
    );
    
    return response.data || {
      total: 0, porCerrar: 0, rechazados: 0, cerrados: 0, eliminados: 0, resueltos: 0, pendientes: 0
    };
  }

  // --- MÉTODOS DE APOYO (Mantener locales para rapidez) ---

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'por-cerrar': 'Por cerrar',
      'rechazados': 'Rechazado',
      'cerrados': 'Cerrado',
      'eliminados': 'Eliminado',
      'abierto': 'Abierto', 
      'proceso': 'En Proceso'
    };
    return labels[status] || status;
  }

  getPriorityLabel(prioridad: string | null): string {
    if (!prioridad) return '-';
    return prioridad.charAt(0).toUpperCase() + prioridad.slice(1).toLowerCase();
  }

  // Para el Monitor (Reasignación en AWS)
  async reassignTicket(id: number, newUser: string, adminId: any): Promise<void> {
    const body = {
      ticketId: id.toString(),
      tecnicoId: newUser, 
      usuarioId: adminId.toString()
    };
    await firstValueFrom(this.http.post(`${this.apiUrl}/tickets/reassign`, body));
  }

  // Para las etiquetas y contadores
  async countByStatus(): Promise<Record<string, number>> {
    const stats = await this.getStatistics();
    return {
      'por-cerrar': stats.porCerrar,
      'rechazados': stats.rechazados,
      'cerrados': stats.cerrados,
      'eliminados': stats.eliminados
    };
  }

  // Para el Dashboard: Poblar el filtro de usuarios dinámicamente
  async getUniqueUsers(): Promise<string[]> {
    try {
      const tickets = await this.filterTickets({});
      // Extraemos solo los nombres, eliminamos duplicados y vacíos
      return [...new Set(tickets.map((t: any) => t.usuario))].filter(Boolean);
    } catch (error) {
      return [];
    }
  }
}