from shared.db import get_connection, rows_to_dicts
from shared.response import error, ok


def lambda_handler(event, context):
    try:
        with get_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("EXEC dbo.sp_estadisticas_dashboard")
            stats = rows_to_dicts(cursor)

        return ok(stats[0] if stats else {})
    except Exception as exc:
        return error(str(exc))

