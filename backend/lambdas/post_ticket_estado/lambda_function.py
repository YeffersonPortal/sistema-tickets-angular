import json

from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        required_fields = ["ticketId", "estado", "usuarioId"]
        missing = [field for field in required_fields if not body.get(field)]
        if missing:
            return error(f"Campos requeridos: {', '.join(missing)}.", 400)

        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                """
                EXEC dbo.sp_cambiar_estado_ticket
                    @TicketId = ?,
                    @EstadoCodigo = ?,
                    @UsuarioId = ?,
                    @Mensaje = ?
                """,
                int(body["ticketId"]),
                body["estado"],
                int(body["usuarioId"]),
                body.get("mensaje"),
            )
            result = rows_to_dicts(cursor)
            connection.commit()

        return ok(result[0] if result else None)
    except Exception as exc:
        return error(str(exc))

