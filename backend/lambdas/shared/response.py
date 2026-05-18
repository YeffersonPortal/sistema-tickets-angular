import json
from datetime import date, datetime
from decimal import Decimal


def json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return str(value)


def build_response(status_code=200, body=None):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body or {}, default=json_default),
    }


def ok(data=None):
    return build_response(200, {"ok": True, "data": data if data is not None else []})


def error(message, status_code=500):
    return build_response(status_code, {"ok": False, "message": message})

