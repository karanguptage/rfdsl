"""MySQL / MariaDB access with PyMySQL (one short-lived connection per request)."""

from contextlib import contextmanager

import pymysql
from pymysql.cursors import DictCursor

from . import config


def connect(database: str | None = config.DB_NAME) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
    )


@contextmanager
def cursor():
    """Yields a dict cursor; commits on success, rolls back on error."""
    conn = connect()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
