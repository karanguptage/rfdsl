"""Create the RFDSL database from scratch and load the starter catalogue.

    .venv\\Scripts\\python init_db.py

If the database (DB_NAME in .env) already exists, it is DROPPED first and
rebuilt from sql/schema.sql, so the tables always match the current code.
This deletes everything stored in it: products entered in /admin, contact
messages and replies, visitor statistics, chats and knowledge notes.
Uploaded files (backend/uploads) are kept.
"""

import re

from app import config, db
from app.models import ProductIn
from app.products import save_product
from seed_data import PRODUCTS


def run_schema(cur) -> None:
    sql = (config.BASE_DIR / "sql" / "schema.sql").read_text(encoding="utf-8")
    sql = re.sub(r"--[^\n]*", "", sql)
    sql = sql.replace("`RFDSL`", f"`{config.DB_NAME}`")
    for statement in (s.strip() for s in sql.split(";")):
        if statement:
            cur.execute(statement)


def main() -> None:
    conn = db.connect(database=None)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=%s", (config.DB_NAME,))
            if cur.fetchone():
                cur.execute(f"DROP DATABASE `{config.DB_NAME}`")
                print(f"Deleted the existing database '{config.DB_NAME}'.")
            run_schema(cur)
            for p in PRODUCTS:
                save_product(cur, ProductIn(**p))
            print(f"Database '{config.DB_NAME}' created and seeded with {len(PRODUCTS)} products.")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
