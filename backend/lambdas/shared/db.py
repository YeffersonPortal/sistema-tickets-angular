import os
import pyodbc


def get_connection():
    server = os.environ["DB_SERVER"]
    database = os.environ.get("DB_NAME", "dbtickets")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    driver = os.environ.get("DB_DRIVER", "ODBC Driver 17 for SQL Server")

    connection_string = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={user};"
        f"PWD={password};"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(connection_string)


def rows_to_dicts(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
