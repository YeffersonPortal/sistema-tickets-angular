import json

from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        required_fields = [
            "asunto",
            "usuarioId",
            "area",
            "tipoServicio",
            "prioridad",
            "requerimiento",
        ]
        missing = [field for field in required_fields if not body.get(field)]
        if missing:
            return error(f"Campos requeridos: {', '.join(missing)}.", 400)

        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                """
                EXEC dbo.sp_crear_ticket
                    @Asunto = ?,
                    @UsuarioId = ?,
                    @AreaNombre = ?,
                    @TipoServicioNombre = ?,
                    @PrioridadCodigo = ?,
                    @Requerimiento = ?,
                    @Descripcion = ?,
                    @DocumentoUrl = ?,
                    @TecnicoId = ?
                """,
                body["asunto"],
                int(body["usuarioId"]),
                body["area"],
                body["tipoServicio"],
                body["prioridad"],
                body["requerimiento"],
                body.get("descripcion"),
                body.get("documentoUrl"),
                int(body["tecnicoId"]) if body.get("tecnicoId") else None,
            )
            created = rows_to_dicts(cursor)
            connection.commit()

        return ok(created[0] if created else None)
    except Exception as exc:
        return error(str(exc))

