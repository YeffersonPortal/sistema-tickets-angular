USE dbtickets;
GO

EXEC dbo.sp_login_usuario @Email = 'jefe.sistemas@sgt.com';
GO

EXEC dbo.sp_listar_catalogos_ticket;
GO

EXEC dbo.sp_listar_tickets @EstadoCodigo = 'por-cerrar';
GO

EXEC dbo.sp_estadisticas_dashboard;
GO

EXEC dbo.sp_crear_ticket
    @Asunto = 'Prueba desde script',
    @UsuarioId = 3,
    @AreaNombre = 'Sistemas',
    @TipoServicioNombre = 'Software',
    @PrioridadCodigo = 'media',
    @Requerimiento = 'Validar creacion desde procedimiento almacenado',
    @Descripcion = 'Ticket creado para probar el procedimiento.',
    @TecnicoId = 2;
GO

EXEC dbo.sp_listar_tickets @SearchTerm = 'Prueba';
GO

