export const TICKET_AREAS = [
  'Sistemas',
  'Administracion',
  'Finanzas',
  'Recursos Humanos',
  'Logistica',
  'Operaciones',
] as const;

export const TICKET_SERVICE_TYPES = [
  'Hardware',
  'Software',
  'Redes',
  'Correo',
  'Accesos',
  'Impresoras',
] as const;

export type TicketArea = (typeof TICKET_AREAS)[number];
export type TicketServiceType = (typeof TICKET_SERVICE_TYPES)[number];
