from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}
        usuario_id = params.get("usuarioId")

        if not usuario_id:
            return error("usuarioId es requerido.", 400)

        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("EXEC dbo.sp_listar_notificaciones @UsuarioId = ?", int(usuario_id))
            notifications = rows_to_dicts(cursor)

        return ok(notifications)
    except Exception as exc:
        return error(str(exc))

