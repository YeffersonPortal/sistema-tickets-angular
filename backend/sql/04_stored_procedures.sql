USE dbtickets;
GO

CREATE OR ALTER PROCEDURE dbo.sp_login_usuario
    @Email VARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.id_usuario AS id,
        u.email,
        u.nombre,
        r.codigo AS rol,
        r.nombre AS rol_nombre
    FROM dbo.usuarios u
    INNER JOIN dbo.roles r ON r.id_rol = u.id_rol
    WHERE u.email = LOWER(LTRIM(RTRIM(@Email)))
      AND u.activo = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_listar_catalogos_ticket
AS
BEGIN
    SET NOCOUNT ON;

    SELECT id_estado AS id, codigo, nombre FROM dbo.estados_ticket ORDER BY orden;
    SELECT id_prioridad AS id, codigo, nombre, nivel FROM dbo.prioridades_ticket ORDER BY nivel;
    SELECT id_area AS id, nombre FROM dbo.areas WHERE activo = 1 ORDER BY nombre;
    SELECT id_tipo_servicio AS id, nombre FROM dbo.tipos_servicio WHERE activo = 1 ORDER BY nombre;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_listar_tickets
    @EstadoCodigo VARCHAR(30) = NULL,
    @UsuarioId INT = NULL,
    @PrioridadCodigo VARCHAR(30) = NULL,
    @SearchTerm VARCHAR(120) = NULL,
    @FechaDesde DATE = NULL,
    @FechaHasta DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.id_ticket AS id,
        t.nro,
        t.asunto,
        solicitante.nombre AS usuario,
        solicitante.id_usuario AS id_usuario,
        a.nombre AS area,
        ts.nombre AS tipoServicio,
        p.codigo AS prioridad,
        e.codigo AS status,
        t.requerimiento,
        t.descripcion,
        t.documento_url AS documento,
        t.fecha_inicio AS fi,
        t.fecha_cierre AS fc,
        tecnico.nombre AS tecnico,
        tecnico.id_usuario AS id_tecnico
    FROM dbo.tickets t
    INNER JOIN dbo.usuarios solicitante ON solicitante.id_usuario = t.id_usuario_solicitante
    INNER JOIN dbo.areas a ON a.id_area = t.id_area
    INNER JOIN dbo.tipos_servicio ts ON ts.id_tipo_servicio = t.id_tipo_servicio
    INNER JOIN dbo.prioridades_ticket p ON p.id_prioridad = t.id_prioridad
    INNER JOIN dbo.estados_ticket e ON e.id_estado = t.id_estado
    LEFT JOIN dbo.usuarios tecnico ON tecnico.id_usuario = t.id_tecnico_asignado
    WHERE t.activo = 1
      AND (@EstadoCodigo IS NULL OR e.codigo = @EstadoCodigo)
      AND (@UsuarioId IS NULL OR t.id_usuario_solicitante = @UsuarioId)
      AND (@PrioridadCodigo IS NULL OR p.codigo = @PrioridadCodigo)
      AND (@FechaDesde IS NULL OR CONVERT(DATE, t.fecha_inicio) >= @FechaDesde)
      AND (@FechaHasta IS NULL OR CONVERT(DATE, t.fecha_inicio) <= @FechaHasta)
      AND (
          @SearchTerm IS NULL
          OR t.nro LIKE '%' + @SearchTerm + '%'
          OR t.asunto LIKE '%' + @SearchTerm + '%'
          OR solicitante.nombre LIKE '%' + @SearchTerm + '%'
          OR a.nombre LIKE '%' + @SearchTerm + '%'
          OR t.requerimiento LIKE '%' + @SearchTerm + '%'
      )
    ORDER BY t.fecha_inicio DESC, t.id_ticket DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_obtener_ticket
    @TicketId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.id_ticket AS id,
        t.nro,
        t.asunto,
        solicitante.nombre AS usuario,
        solicitante.id_usuario AS id_usuario,
        a.nombre AS area,
        ts.nombre AS tipoServicio,
        p.codigo AS prioridad,
        e.codigo AS status,
        t.requerimiento,
        t.descripcion,
        t.documento_url AS documento,
        t.fecha_inicio AS fi,
        t.fecha_cierre AS fc,
        tecnico.nombre AS tecnico,
        tecnico.id_usuario AS id_tecnico
    FROM dbo.tickets t
    INNER JOIN dbo.usuarios solicitante ON solicitante.id_usuario = t.id_usuario_solicitante
    INNER JOIN dbo.areas a ON a.id_area = t.id_area
    INNER JOIN dbo.tipos_servicio ts ON ts.id_tipo_servicio = t.id_tipo_servicio
    INNER JOIN dbo.prioridades_ticket p ON p.id_prioridad = t.id_prioridad
    INNER JOIN dbo.estados_ticket e ON e.id_estado = t.id_estado
    LEFT JOIN dbo.usuarios tecnico ON tecnico.id_usuario = t.id_tecnico_asignado
    WHERE t.id_ticket = @TicketId
      AND t.activo = 1;

    SELECT
        h.id_historial AS id,
        h.accion,
        h.mensaje,
        h.fecha,
        u.nombre AS usuario
    FROM dbo.historial_ticket h
    LEFT JOIN dbo.usuarios u ON u.id_usuario = h.id_usuario
    WHERE h.id_ticket = @TicketId
    ORDER BY h.fecha DESC, h.id_historial DESC;

    SELECT TOP 1
        atn.id_atencion AS id,
        atn.descripcion,
        atn.documento_url AS documento,
        atn.fecha,
        u.nombre AS usuario
    FROM dbo.atenciones_ticket atn
    INNER JOIN dbo.usuarios u ON u.id_usuario = atn.id_usuario
    WHERE atn.id_ticket = @TicketId
    ORDER BY atn.fecha DESC, atn.id_atencion DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_crear_ticket
    @Asunto VARCHAR(180),
    @UsuarioId INT,
    @AreaNombre VARCHAR(120),
    @TipoServicioNombre VARCHAR(120),
    @PrioridadCodigo VARCHAR(30),
    @Requerimiento VARCHAR(250),
    @Descripcion VARCHAR(1000) = NULL,
    @DocumentoUrl VARCHAR(500) = NULL,
    @TecnicoId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AreaId INT = (SELECT id_area FROM dbo.areas WHERE nombre = @AreaNombre AND activo = 1);
    DECLARE @TipoServicioId INT = (SELECT id_tipo_servicio FROM dbo.tipos_servicio WHERE nombre = @TipoServicioNombre AND activo = 1);
    DECLARE @PrioridadId INT = (SELECT id_prioridad FROM dbo.prioridades_ticket WHERE codigo = @PrioridadCodigo);
    DECLARE @EstadoId INT = (SELECT id_estado FROM dbo.estados_ticket WHERE codigo = 'por-cerrar');

    IF @AreaId IS NULL OR @TipoServicioId IS NULL OR @PrioridadId IS NULL OR @EstadoId IS NULL
    BEGIN
        THROW 50001, 'Catalogo invalido para crear ticket.', 1;
    END

    INSERT INTO dbo.tickets (
        asunto,
        id_usuario_solicitante,
        id_area,
        id_tipo_servicio,
        id_prioridad,
        id_estado,
        id_tecnico_asignado,
        requerimiento,
        descripcion,
        documento_url
    )
    VALUES (
        LTRIM(RTRIM(@Asunto)),
        @UsuarioId,
        @AreaId,
        @TipoServicioId,
        @PrioridadId,
        @EstadoId,
        @TecnicoId,
        LTRIM(RTRIM(@Requerimiento)),
        NULLIF(LTRIM(RTRIM(@Descripcion)), ''),
        @DocumentoUrl
    );

    DECLARE @TicketId INT = SCOPE_IDENTITY();

    INSERT INTO dbo.historial_ticket (id_ticket, id_usuario, accion, mensaje)
    VALUES (@TicketId, @UsuarioId, 'APERTURA', 'Se abrio el ticket.');

    IF @TecnicoId IS NOT NULL
    BEGIN
        INSERT INTO dbo.notificaciones (id_usuario, titulo, mensaje)
        VALUES (@TecnicoId, 'Nuevo ticket asignado', CONCAT('Se te asigno el ticket TCK-', RIGHT('0000' + CONVERT(VARCHAR(10), @TicketId), 4), '.'));
    END

    SELECT id_ticket AS id, nro, asunto FROM dbo.tickets WHERE id_ticket = @TicketId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_cambiar_estado_ticket
    @TicketId INT,
    @EstadoCodigo VARCHAR(30),
    @UsuarioId INT,
    @Mensaje VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EstadoId INT = (SELECT id_estado FROM dbo.estados_ticket WHERE codigo = @EstadoCodigo);
    IF @EstadoId IS NULL
    BEGIN
        THROW 50002, 'Estado invalido.', 1;
    END

    UPDATE dbo.tickets
    SET id_estado = @EstadoId,
        fecha_cierre = CASE WHEN @EstadoCodigo = 'cerrados' THEN SYSDATETIME() ELSE fecha_cierre END
    WHERE id_ticket = @TicketId;

    INSERT INTO dbo.historial_ticket (id_ticket, id_usuario, accion, mensaje)
    VALUES (
        @TicketId,
        @UsuarioId,
        UPPER(@EstadoCodigo),
        COALESCE(@Mensaje, CONCAT('Se cambio el estado a ', @EstadoCodigo))
    );

    SELECT id_ticket AS id, nro FROM dbo.tickets WHERE id_ticket = @TicketId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_registrar_atencion_ticket
    @TicketId INT,
    @UsuarioId INT,
    @Descripcion VARCHAR(1000),
    @DocumentoUrl VARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.atenciones_ticket (id_ticket, id_usuario, descripcion, documento_url)
    VALUES (@TicketId, @UsuarioId, LTRIM(RTRIM(@Descripcion)), @DocumentoUrl);

    DECLARE @AtencionId INT = SCOPE_IDENTITY();

    INSERT INTO dbo.historial_ticket (id_ticket, id_usuario, accion, mensaje)
    VALUES (@TicketId, @UsuarioId, 'SEGUIMIENTO', 'Se registro un avance en la atencion del ticket.');

    SELECT id_atencion AS id, descripcion, fecha
    FROM dbo.atenciones_ticket
    WHERE id_atencion = @AtencionId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_reasignar_ticket
    @TicketId INT,
    @TecnicoId INT,
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.tickets
    SET id_tecnico_asignado = @TecnicoId
    WHERE id_ticket = @TicketId;

    INSERT INTO dbo.historial_ticket (id_ticket, id_usuario, accion, mensaje)
    SELECT @TicketId, @UsuarioId, 'REASIGNACION', CONCAT('Ticket reasignado a ', nombre)
    FROM dbo.usuarios
    WHERE id_usuario = @TecnicoId;

    INSERT INTO dbo.notificaciones (id_usuario, titulo, mensaje)
    SELECT @TecnicoId, 'Ticket reasignado', CONCAT('Tienes asignado el ticket ', nro, '.')
    FROM dbo.tickets
    WHERE id_ticket = @TicketId;

    SELECT id_ticket AS id, nro FROM dbo.tickets WHERE id_ticket = @TicketId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_estadisticas_dashboard
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN e.codigo = 'por-cerrar' THEN 1 ELSE 0 END) AS porCerrar,
        SUM(CASE WHEN e.codigo = 'rechazados' THEN 1 ELSE 0 END) AS rechazados,
        SUM(CASE WHEN e.codigo = 'cerrados' THEN 1 ELSE 0 END) AS cerrados,
        SUM(CASE WHEN e.codigo = 'eliminados' THEN 1 ELSE 0 END) AS eliminados,
        SUM(CASE WHEN e.codigo = 'cerrados' THEN 1 ELSE 0 END) AS resueltos,
        SUM(CASE WHEN e.codigo IN ('por-cerrar', 'rechazados', 'eliminados') THEN 1 ELSE 0 END) AS pendientes
    FROM dbo.tickets t
    INNER JOIN dbo.estados_ticket e ON e.id_estado = t.id_estado
    WHERE t.activo = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_listar_notificaciones
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id_notificacion AS id,
        titulo AS title,
        mensaje AS message,
        fecha_creacion AS createdAt,
        leido AS [read]
    FROM dbo.notificaciones
    WHERE id_usuario = @UsuarioId
    ORDER BY fecha_creacion DESC, id_notificacion DESC;
END
GO
