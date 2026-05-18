from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("EXEC dbo.sp_listar_catalogos_ticket")

            estados = rows_to_dicts(cursor)
            prioridades = []
            areas = []
            tipos_servicio = []

            if cursor.nextset():
                prioridades = rows_to_dicts(cursor)
            if cursor.nextset():
                areas = rows_to_dicts(cursor)
            if cursor.nextset():
                tipos_servicio = rows_to_dicts(cursor)

        return ok(
            {
                "estados": estados,
                "prioridades": prioridades,
                "areas": areas,
                "tiposServicio": tipos_servicio,
            }
        )
    except Exception as exc:
        return error(str(exc))

