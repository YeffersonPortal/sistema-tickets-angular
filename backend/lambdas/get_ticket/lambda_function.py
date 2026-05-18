from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}
        ticket_id = params.get("ticketId")

        if not ticket_id:
            return error("ticketId es requerido.", 400)

        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("EXEC dbo.sp_obtener_ticket @TicketId = ?", int(ticket_id))
            ticket = rows_to_dicts(cursor)

            historial = []
            atencion = []
            if cursor.nextset():
                historial = rows_to_dicts(cursor)
            if cursor.nextset():
                atencion = rows_to_dicts(cursor)

        data = {
            "ticket": ticket[0] if ticket else None,
            "historial": historial,
            "atencion": atencion[0] if atencion else None,
        }
        return ok(data)
    except Exception as exc:
        return error(str(exc))

