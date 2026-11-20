"""Settings read from backend/.env (see .env.example)."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "RFDSL")

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
SECRET_KEY = os.getenv("SECRET_KEY", "")
ADMIN_TOKEN_HOURS = float(os.getenv("ADMIN_TOKEN_HOURS", "8"))

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

# Servers allowed to tell the API the visitor's IP (X-Forwarded-For): the
# Next.js site. Add its address if it runs on another machine.
TRUSTED_PROXIES = {p.strip() for p in os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1").split(",") if p.strip()}

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_URL_PREFIX = "/uploads"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024

# Product categories. `type` fills the product_type column automatically.
# Keep in sync with CATEGORIES in frontend/src/lib/catalog.ts (labels + icons).
CATEGORIES = [
    {"value": "reader", "label": "Reader", "type": "hardware"},
    {"value": "antenna", "label": "Antenna", "type": "hardware"},
    {"value": "tag", "label": "Tag", "type": "hardware"},
    {"value": "printer", "label": "Printer", "type": "hardware"},
    {"value": "accessory", "label": "Accessory", "type": "hardware"},
    {"value": "software", "label": "Software", "type": "software"},
]
CATEGORY_TYPES = {c["value"]: c["type"] for c in CATEGORIES}

PAGE_SIZE = 8

# Contact form email (backend/.env). Sending is skipped when SMTP_HOST is empty.
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
CONTACT_EMAIL_FROM = os.getenv("CONTACT_EMAIL_FROM", SMTP_USER)
CONTACT_EMAIL_TO = [a.strip() for a in os.getenv("CONTACT_EMAIL_TO", "").split(",") if a.strip()]
