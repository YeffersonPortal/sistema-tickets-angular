import json

from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        email = (body.get("email") or "").strip().lower()

        if not email:
            return error("El correo es requerido.", 400)

        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("EXEC dbo.sp_login_usuario @Email = ?", email)
            users = rows_to_dicts(cursor)

        if not users:
            return error("El usuario no existe.", 401)

        return ok(users[0])
    except Exception as exc:
        return error(str(exc))

