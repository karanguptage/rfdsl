"""Create the RFDSL database and products table, and load the starter catalogue.

    .venv\\Scripts\\python init_db.py           create if missing; seed only if the table is empty
    .venv\\Scripts\\python init_db.py --reset   DROP the products table and start again (deletes data!)
"""

import re
import sys

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


HOME_CAROUSEL_SLUGS = [
    "advanreader-10", "advanreader-70", "advanreader-160", "c5", "c61", "cp20",
    "cp30", "customised-rfid-tags", "gp60333", "mc50", "mc95", "zt411",
]

NEW_COLUMNS = [
    ("is_popular", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_published`"),
    ("is_new", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_popular`"),
    ("is_on_sale", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_new`"),
    ("sale_label", "VARCHAR(40) NULL AFTER `is_on_sale`"),
    ("home_popular", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `sale_label`"),
    ("home_new", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `home_popular`"),
    ("home_sale", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `home_new`"),
]


def migrate(cur) -> None:
    """Brings an existing products table up to date with schema.sql."""
    cur.execute(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME='products'",
        (config.DB_NAME,),
    )
    have = {r["COLUMN_NAME"] for r in cur.fetchall()}
    added = [name for name, _ in NEW_COLUMNS if name not in have]
    for name, ddl in NEW_COLUMNS:
        if name not in have:
            cur.execute(f"ALTER TABLE products ADD COLUMN `{name}` {ddl}")
    if "is_popular" in added:
        cur.execute(
            f"UPDATE products SET is_popular=1 WHERE slug IN ({','.join(['%s'] * len(HOME_CAROUSEL_SLUGS))})",
            HOME_CAROUSEL_SLUGS,
        )
        print(f"Added popular / new / sale columns; marked {cur.rowcount} former home page products as popular.")
    if "home_popular" in added:
        # Badges and home page sections used to be one switch: keep every
        # product's home page sections as they were.
        cur.execute("UPDATE products SET home_popular=is_popular, home_new=is_new, home_sale=is_on_sale")
        print(f"Added home page section columns; copied the current badges into them ({cur.rowcount} products).")
    # A home page section only lists products with its badge: clear stray switches.
    cur.execute(
        "UPDATE products SET home_popular=home_popular AND is_popular, "
        "home_new=home_new AND is_new, home_sale=home_sale AND is_on_sale"
    )
    if cur.rowcount:
        print(f"Cleared home page section switches without a badge on {cur.rowcount} products.")
    cur.execute("SHOW INDEX FROM products WHERE Key_name='ix_products_flags'")
    if not cur.fetchall():
        cur.execute("ALTER TABLE products ADD KEY `ix_products_flags` (`is_published`, `is_popular`, `is_new`, `is_on_sale`)")
    cur.execute("SHOW INDEX FROM products WHERE Key_name='ix_products_home'")
    if not cur.fetchall():
        cur.execute("ALTER TABLE products ADD KEY `ix_products_home` (`is_published`, `home_popular`, `home_new`, `home_sale`)")


CHAT_COLUMNS = [
    ("ai_thread_id", "VARCHAR(100) NULL AFTER `token`"),
    ("ai_last_msg_id", "BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `ai_thread_id`"),
    ("tokens_used", "INT UNSIGNED NOT NULL DEFAULT 0 AFTER `ai_last_msg_id`"),
    ("cost_estimate", "DECIMAL(10,4) NOT NULL DEFAULT 0 AFTER `tokens_used`"),
]


def migrate_chat(cur) -> None:
    """Chat tables: from the Claude Managed Agents version to OpenAI."""
    cur.execute(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME='chat_conversations'",
        (config.DB_NAME,),
    )
    have = {r["COLUMN_NAME"] for r in cur.fetchall()}
    for name, ddl in CHAT_COLUMNS:
        if name not in have:
            cur.execute(f"ALTER TABLE chat_conversations ADD COLUMN `{name}` {ddl}")
    if "session_id" in have:
        cur.execute("ALTER TABLE chat_conversations DROP COLUMN `session_id`")
        print("Chat tables moved from Claude Managed Agents to OpenAI.")
    cur.execute("ALTER TABLE chat_messages MODIFY `event_id` VARCHAR(100) NULL")


def main() -> None:
    reset = "--reset" in sys.argv
    conn = db.connect(database=None)
    try:
        with conn.cursor() as cur:
            if reset:
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{config.DB_NAME}`")
                cur.execute(f"DROP TABLE IF EXISTS `{config.DB_NAME}`.`products`")
                print("Dropped products table.")
            run_schema(cur)
            migrate(cur)
            migrate_chat(cur)
            cur.execute("SELECT COUNT(*) n FROM products")
            existing = cur.fetchone()["n"]
            if existing:
                print(f"Database '{config.DB_NAME}' ready; products table already has {existing} rows (not seeded).")
            else:
                for p in PRODUCTS:
                    save_product(cur, ProductIn(**p))
                print(f"Database '{config.DB_NAME}' created and seeded with {len(PRODUCTS)} products.")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
