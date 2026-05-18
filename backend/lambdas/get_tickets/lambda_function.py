from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}

        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                """
                EXEC dbo.sp_listar_tickets
                    @EstadoCodigo = ?,
                    @UsuarioId = ?,
                    @PrioridadCodigo = ?,
                    @SearchTerm = ?,
                    @FechaDesde = ?,
                    @FechaHasta = ?
                """,
                params.get("estado"),
                int(params["usuarioId"]) if params.get("usuarioId") else None,
                params.get("prioridad"),
                params.get("search"),
                params.get("fechaDesde"),
                params.get("fechaHasta"),
            )
            tickets = rows_to_dicts(cursor)

        return ok(tickets)
    except Exception as exc:
        return error(str(exc))

