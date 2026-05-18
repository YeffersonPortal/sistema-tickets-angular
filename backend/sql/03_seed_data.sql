USE dbtickets;
GO

INSERT INTO dbo.roles (codigo, nombre, descripcion)
VALUES
('jefe', 'Jefe de sistemas', 'Usuario administrador que revisa dashboard y monitoreo.'),
('tecnico', 'Tecnico de soporte', 'Usuario que atiende y actualiza tickets.'),
('colaborador', 'Colaborador', 'Usuario que registra y consulta sus tickets.');
GO

INSERT INTO dbo.usuarios (id_rol, email, nombre, password_hash)
VALUES
((SELECT id_rol FROM dbo.roles WHERE codigo = 'jefe'), 'jefe.sistemas@sgt.com', 'Jefe de sistemas', NULL),
((SELECT id_rol FROM dbo.roles WHERE codigo = 'tecnico'), 'tecnico.soporte@sgt.com', 'Tecnico de soporte', NULL),
((SELECT id_rol FROM dbo.roles WHERE codigo = 'colaborador'), 'colaborador@sgt.com', 'Colaborador', NULL);
GO

INSERT INTO dbo.estados_ticket (codigo, nombre, orden)
VALUES
('por-cerrar', 'Por cerrar', 1),
('rechazados', 'Rechazado', 2),
('cerrados', 'Cerrado', 3),
('eliminados', 'Eliminado', 4);
GO

INSERT INTO dbo.prioridades_ticket (codigo, nombre, nivel)
VALUES
('baja', 'Baja', 1),
('media', 'Media', 2),
('alta', 'Alta', 3),
('urgente', 'Urgente', 4);
GO

INSERT INTO dbo.areas (nombre)
VALUES
('Sistemas'),
('Administracion'),
('Finanzas'),
('Recursos Humanos'),
('Logistica'),
('Operaciones');
GO

INSERT INTO dbo.tipos_servicio (nombre)
VALUES
('Hardware'),
('Software'),
('Redes'),
('Correo'),
('Accesos'),
('Impresoras');
GO

DECLARE @Colaborador INT = (SELECT id_usuario FROM dbo.usuarios WHERE email = 'colaborador@sgt.com');
DECLARE @Tecnico INT = (SELECT id_usuario FROM dbo.usuarios WHERE email = 'tecnico.soporte@sgt.com');
DECLARE @EstadoPorCerrar INT = (SELECT id_estado FROM dbo.estados_ticket WHERE codigo = 'por-cerrar');
DECLARE @PrioridadMedia INT = (SELECT id_prioridad FROM dbo.prioridades_ticket WHERE codigo = 'media');
DECLARE @PrioridadAlta INT = (SELECT id_prioridad FROM dbo.prioridades_ticket WHERE codigo = 'alta');

INSERT INTO dbo.tickets (
    asunto,
    id_usuario_solicitante,
    id_area,
    id_tipo_servicio,
    id_prioridad,
    id_estado,
    id_tecnico_asignado,
    requerimiento,
    descripcion
)
VALUES
(
    'No puedo acceder al correo',
    @Colaborador,
    (SELECT id_area FROM dbo.areas WHERE nombre = 'Sistemas'),
    (SELECT id_tipo_servicio FROM dbo.tipos_servicio WHERE nombre = 'Correo'),
    @PrioridadAlta,
    @EstadoPorCerrar,
    @Tecnico,
    'Restablecer acceso al correo corporativo',
    'El usuario indica que la clave fue cambiada y no puede ingresar.'
),
(
    'Impresora no responde',
    @Colaborador,
    (SELECT id_area FROM dbo.areas WHERE nombre = 'Administracion'),
    (SELECT id_tipo_servicio FROM dbo.tipos_servicio WHERE nombre = 'Impresoras'),
    @PrioridadMedia,
    @EstadoPorCerrar,
    @Tecnico,
    'Revisar conexion de impresora de oficina',
    'La impresora aparece sin conexion desde la manana.'
);
GO

INSERT INTO dbo.historial_ticket (id_ticket, id_usuario, accion, mensaje)
SELECT id_ticket, id_usuario_solicitante, 'APERTURA', 'Se abrio el ticket.'
FROM dbo.tickets;
GO

