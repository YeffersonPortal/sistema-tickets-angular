USE dbtickets;
GO

IF OBJECT_ID('dbo.notificaciones', 'U') IS NOT NULL DROP TABLE dbo.notificaciones;
IF OBJECT_ID('dbo.atenciones_ticket', 'U') IS NOT NULL DROP TABLE dbo.atenciones_ticket;
IF OBJECT_ID('dbo.historial_ticket', 'U') IS NOT NULL DROP TABLE dbo.historial_ticket;
IF OBJECT_ID('dbo.tickets', 'U') IS NOT NULL DROP TABLE dbo.tickets;
IF OBJECT_ID('dbo.tipos_servicio', 'U') IS NOT NULL DROP TABLE dbo.tipos_servicio;
IF OBJECT_ID('dbo.areas', 'U') IS NOT NULL DROP TABLE dbo.areas;
IF OBJECT_ID('dbo.prioridades_ticket', 'U') IS NOT NULL DROP TABLE dbo.prioridades_ticket;
IF OBJECT_ID('dbo.estados_ticket', 'U') IS NOT NULL DROP TABLE dbo.estados_ticket;
IF OBJECT_ID('dbo.usuarios', 'U') IS NOT NULL DROP TABLE dbo.usuarios;
IF OBJECT_ID('dbo.roles', 'U') IS NOT NULL DROP TABLE dbo.roles;
GO

CREATE TABLE dbo.roles (
    id_rol INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_roles PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL CONSTRAINT UQ_roles_codigo UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(200) NULL,
    activo BIT NOT NULL CONSTRAINT DF_roles_activo DEFAULT (1)
);
GO

CREATE TABLE dbo.usuarios (
    id_usuario INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_usuarios PRIMARY KEY,
    id_rol INT NOT NULL,
    email VARCHAR(120) NOT NULL CONSTRAINT UQ_usuarios_email UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NULL,
    activo BIT NOT NULL CONSTRAINT DF_usuarios_activo DEFAULT (1),
    fecha_creacion DATETIME2(0) NOT NULL CONSTRAINT DF_usuarios_fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_usuarios_roles FOREIGN KEY (id_rol) REFERENCES dbo.roles(id_rol)
);
GO

CREATE TABLE dbo.estados_ticket (
    id_estado INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_estados_ticket PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL CONSTRAINT UQ_estados_ticket_codigo UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    orden INT NOT NULL
);
GO

CREATE TABLE dbo.prioridades_ticket (
    id_prioridad INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_prioridades_ticket PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL CONSTRAINT UQ_prioridades_ticket_codigo UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    nivel INT NOT NULL
);
GO

CREATE TABLE dbo.areas (
    id_area INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_areas PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL CONSTRAINT UQ_areas_nombre UNIQUE,
    activo BIT NOT NULL CONSTRAINT DF_areas_activo DEFAULT (1)
);
GO

CREATE TABLE dbo.tipos_servicio (
    id_tipo_servicio INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tipos_servicio PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL CONSTRAINT UQ_tipos_servicio_nombre UNIQUE,
    activo BIT NOT NULL CONSTRAINT DF_tipos_servicio_activo DEFAULT (1)
);
GO

CREATE TABLE dbo.tickets (
    id_ticket INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tickets PRIMARY KEY,
    nro AS ('TCK-' + RIGHT('0000' + CONVERT(VARCHAR(10), id_ticket), 4)) PERSISTED,
    asunto VARCHAR(180) NOT NULL,
    id_usuario_solicitante INT NOT NULL,
    id_area INT NOT NULL,
    id_tipo_servicio INT NOT NULL,
    id_prioridad INT NOT NULL,
    id_estado INT NOT NULL,
    id_tecnico_asignado INT NULL,
    requerimiento VARCHAR(250) NOT NULL,
    descripcion VARCHAR(1000) NULL,
    documento_url VARCHAR(500) NULL,
    fecha_inicio DATETIME2(0) NOT NULL CONSTRAINT DF_tickets_fecha_inicio DEFAULT (SYSDATETIME()),
    fecha_cierre DATETIME2(0) NULL,
    activo BIT NOT NULL CONSTRAINT DF_tickets_activo DEFAULT (1),
    CONSTRAINT FK_tickets_usuario_solicitante FOREIGN KEY (id_usuario_solicitante) REFERENCES dbo.usuarios(id_usuario),
    CONSTRAINT FK_tickets_area FOREIGN KEY (id_area) REFERENCES dbo.areas(id_area),
    CONSTRAINT FK_tickets_tipo_servicio FOREIGN KEY (id_tipo_servicio) REFERENCES dbo.tipos_servicio(id_tipo_servicio),
    CONSTRAINT FK_tickets_prioridad FOREIGN KEY (id_prioridad) REFERENCES dbo.prioridades_ticket(id_prioridad),
    CONSTRAINT FK_tickets_estado FOREIGN KEY (id_estado) REFERENCES dbo.estados_ticket(id_estado),
    CONSTRAINT FK_tickets_tecnico FOREIGN KEY (id_tecnico_asignado) REFERENCES dbo.usuarios(id_usuario)
);
GO

CREATE TABLE dbo.historial_ticket (
    id_historial INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_historial_ticket PRIMARY KEY,
    id_ticket INT NOT NULL,
    id_usuario INT NULL,
    accion VARCHAR(60) NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    fecha DATETIME2(0) NOT NULL CONSTRAINT DF_historial_ticket_fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_historial_ticket_ticket FOREIGN KEY (id_ticket) REFERENCES dbo.tickets(id_ticket),
    CONSTRAINT FK_historial_ticket_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario)
);
GO

CREATE TABLE dbo.atenciones_ticket (
    id_atencion INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_atenciones_ticket PRIMARY KEY,
    id_ticket INT NOT NULL,
    id_usuario INT NOT NULL,
    descripcion VARCHAR(1000) NOT NULL,
    documento_url VARCHAR(500) NULL,
    fecha DATETIME2(0) NOT NULL CONSTRAINT DF_atenciones_ticket_fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_atenciones_ticket_ticket FOREIGN KEY (id_ticket) REFERENCES dbo.tickets(id_ticket),
    CONSTRAINT FK_atenciones_ticket_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario)
);
GO

CREATE TABLE dbo.notificaciones (
    id_notificacion INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_notificaciones PRIMARY KEY,
    id_usuario INT NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    leido BIT NOT NULL CONSTRAINT DF_notificaciones_leido DEFAULT (0),
    fecha_creacion DATETIME2(0) NOT NULL CONSTRAINT DF_notificaciones_fecha DEFAULT (SYSDATETIME()),
    CONSTRAINT FK_notificaciones_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario)
);
GO

CREATE INDEX IX_tickets_estado ON dbo.tickets(id_estado);
CREATE INDEX IX_tickets_usuario ON dbo.tickets(id_usuario_solicitante);
CREATE INDEX IX_tickets_tecnico ON dbo.tickets(id_tecnico_asignado);
CREATE INDEX IX_tickets_fecha_inicio ON dbo.tickets(fecha_inicio);
CREATE INDEX IX_historial_ticket ON dbo.historial_ticket(id_ticket, fecha DESC);
CREATE INDEX IX_atenciones_ticket ON dbo.atenciones_ticket(id_ticket, fecha DESC);
CREATE INDEX IX_notificaciones_usuario ON dbo.notificaciones(id_usuario, leido);
GO

