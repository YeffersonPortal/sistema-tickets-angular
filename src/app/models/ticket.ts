export type TicketStatus =
  | 'por-cerrar'
  | 'rechazados'
  | 'cerrados'
  | 'eliminados';

export type TicketPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type TicketSortField = 'fecha' | 'prioridad' | 'estado';
export type TicketSortDirection = 'asc' | 'desc';

export interface TicketHistoryEvent {
  fecha: string;
  accion: string;
  mensaje: string;
}

export interface TicketAttention {
  descripcion: string;
  documento?: string | null;
}

export interface Ticket {
  id: number;
  asunto: string;
  usuario: string;
  fi: string;
  fc: string;
  status: TicketStatus;
  area: string;
  tipoServicio: string;
  requerimiento: string;
  prioridad: TicketPriority;
  descripcion: string;
  documento: string | null;
  historial: TicketHistoryEvent[];
  atencion: TicketAttention | null;
  tecnico: string | null;
  nro: string | null;
}

export interface TicketFilters {
  status?: TicketStatus;
  usuario?: string;
  prioridad?: TicketPriority;
  area?: string;
  searchTerm?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  sortBy?: TicketSortField;
  sortDirection?: TicketSortDirection;
}

export interface TicketStatistics {
  total: number;
  porCerrar: number;
  rechazados: number;
  cerrados: number;
  eliminados: number;
  resueltos: number;
  pendientes: number;
}

export interface TicketCreateInput {
  asunto: string;
  usuario?: string;
  area: string;
  tipoServicio: string;
  requerimiento: string;
  prioridad: TicketPriority;
  descripcion?: string;
  documento?: string | null;
  tecnico?: string | null;
  nro?: string | null;
}

export interface TicketValidationResult {
  isValid: boolean;
  errors: string[];
}
