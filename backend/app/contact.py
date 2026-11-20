"""Contact form: validation, storage, email to the company, admin queries."""

import html
import re
import smtplib
import ssl
import threading
import time
from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from pydantic import BaseModel, Field, field_validator

from . import config, db

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
STATUSES = ("new", "read", "replied", "archived")


class ContactIn(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=200)
    phone: str = Field("", max_length=50)
    company: str = Field("", max_length=200)
    message: str = Field(..., min_length=1, max_length=10000)
    page: str = Field("", max_length=300)
    # Honeypot: a field hidden from people. Bots that fill it are ignored.
    website: str = Field("", max_length=200)

    @field_validator("first_name", "last_name", "email", "phone", "company", "message", "page", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("first_name", "last_name", "message")
    @classmethod
    def _not_blank(cls, v):
        if not v:
            raise ValueError("This field is required")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        if not _EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v


class ReplyIn(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=20000)
    include_original: bool = True  # quote the visitor's message under the reply
    copy_to_company: bool = True  # Bcc CONTACT_EMAIL_TO (SMTP sends don't land in "Sent")

    @field_validator("subject", "body", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class MessagePatch(BaseModel):
    status: str | None = Field(None, pattern="^(new|read|replied|archived)$")
    admin_note: str | None = Field(None, max_length=5000)


# ------------------------------------------------------------------ rate limit

_WINDOW = 10 * 60
_LIMIT = 5  # messages per IP per 10 minutes
_sent: dict[str, list[float]] = {}
_lock = threading.Lock()


def allow(ip: str) -> bool:
    now = time.time()
    with _lock:
        recent = [t for t in _sent.get(ip, []) if now - t < _WINDOW]
        if len(recent) >= _LIMIT:
            _sent[ip] = recent
            return False
        recent.append(now)
        _sent[ip] = recent
        return True


# ------------------------------------------------------------------ storage


def save(cur, data: ContactIn, ip: str, user_agent: str) -> int:
    cur.execute(
        "INSERT INTO contact_messages (first_name, last_name, email, phone, company, message, page, ip, user_agent)"
        " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (
            data.first_name, data.last_name, data.email, data.phone or None, data.company or None,
            data.message, data.page or None, ip[:45], user_agent[:300],
        ),
    )
    return cur.lastrowid


def _decode(row: dict) -> dict:
    for f in ("created_at", "updated_at"):
        if row.get(f) is not None:
            row[f] = row[f].isoformat()
    row["email_sent"] = bool(row.get("email_sent"))
    return row


def get(cur, message_id: int, with_replies: bool = False) -> dict | None:
    cur.execute("SELECT * FROM contact_messages WHERE id=%s", (message_id,))
    row = cur.fetchone()
    if not row:
        return None
    row = _decode(row)
    if with_replies:
        cur.execute(
            "SELECT id, to_email, subject, body, copied_to, sent_at FROM contact_replies"
            " WHERE message_id=%s ORDER BY sent_at, id",
            (message_id,),
        )
        row["replies"] = [{**r, "sent_at": r["sent_at"].isoformat()} for r in cur.fetchall()]
        row["reply_from"] = config.CONTACT_EMAIL_FROM
        row["company_copy_to"] = ", ".join(config.CONTACT_EMAIL_TO)
    return row


def list_messages(cur, *, status: str = "", q: str = "", page: int = 1, per_page: int = 20) -> dict:
    where, args = [], []
    if status == "inbox":  # everything not archived
        where.append("status<>'archived'")
    elif status in STATUSES:
        where.append("status=%s")
        args.append(status)
    for token in q.split()[:6]:
        like = "%" + token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        where.append("CONCAT_WS(' ', first_name, last_name, email, phone, company, message) LIKE %s")
        args.append(like)
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""

    cur.execute("SELECT COUNT(*) n FROM contact_messages" + where_sql, args)
    total = cur.fetchone()["n"]
    pages = max(1, -(-total // per_page))
    page = min(max(1, page), pages)
    cur.execute(
        "SELECT id, first_name, last_name, email, phone, company, LEFT(message, 220) AS preview, status,"
        " email_sent, email_error, created_at FROM contact_messages" + where_sql +
        " ORDER BY created_at DESC, id DESC LIMIT %s OFFSET %s",
        args + [per_page, (page - 1) * per_page],
    )
    items = [_decode(r) for r in cur.fetchall()]
    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages, "counts": counts(cur)}


def counts(cur) -> dict:
    cur.execute("SELECT status, COUNT(*) n FROM contact_messages GROUP BY status")
    c = {s: 0 for s in STATUSES}
    c.update({r["status"]: r["n"] for r in cur.fetchall()})
    c["inbox"] = c["new"] + c["read"] + c["replied"]
    c["all"] = c["inbox"] + c["archived"]
    return c


# ------------------------------------------------------------------ email


def _when(value) -> str:
    try:
        return datetime.fromisoformat(str(value)).strftime("%d %b %Y, %H:%M")
    except ValueError:
        return str(value or "")


def _build_email(m: dict) -> EmailMessage:
    name = f"{m['first_name']} {m['last_name']}".strip()
    company = f" ({m['company']})" if m.get("company") else ""
    msg = EmailMessage()
    msg["Subject"] = f"Website enquiry from {name}{company}"
    msg["From"] = formataddr(("RF Data Systems website", config.CONTACT_EMAIL_FROM))
    msg["To"] = ", ".join(config.CONTACT_EMAIL_TO)
    msg["Reply-To"] = formataddr((name, m["email"]))  # "Reply" in the mail app answers the visitor
    msg["Message-ID"] = make_msgid(domain=config.CONTACT_EMAIL_FROM.split("@")[-1] or None)

    rows = [
        ("Name", name),
        ("Email", m["email"]),
        ("Phone", m.get("phone") or "-"),
        ("Company", m.get("company") or "-"),
        ("Sent from", m.get("page") or "-"),
        ("Received", _when(m.get("created_at"))),
    ]
    text = "New message from the website contact form\n\n"
    text += "\n".join(f"{k}: {v}" for k, v in rows)
    text += f"\n\nMessage:\n{m['message']}\n\n(Reply to this email to answer {name} directly.)\n"
    msg.set_content(text)

    cells = "".join(
        f'<tr><td style="padding:6px 16px 6px 0;color:#64748b;white-space:nowrap;vertical-align:top">{html.escape(k)}</td>'
        f'<td style="padding:6px 0;color:#0a0a0a">{html.escape(str(v))}</td></tr>'
        for k, v in rows
    )
    body = html.escape(m["message"]).replace("\n", "<br>")
    msg.add_alternative(
        f"""<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;max-width:640px">
<h2 style="margin:0 0 12px;font-size:18px;color:#0a0a0a">New message from the website contact form</h2>
<table style="border-collapse:collapse;font-size:14px">{cells}</table>
<div style="margin-top:16px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;color:#0a0a0a">{body}</div>
<p style="margin-top:16px;font-size:13px;color:#64748b">Reply to this email to answer {html.escape(name)} directly.</p>
</div>""",
        subtype="html",
    )
    return msg


def send_email(m: dict) -> None:
    """Emails a stored contact message to the company. Raises on failure."""
    if not config.CONTACT_EMAIL_TO:
        raise RuntimeError("CONTACT_EMAIL_TO is not set in backend/.env")
    _smtp_send(_build_email(m))


def _smtp_send(msg: EmailMessage) -> None:
    """Sends over SMTP (STARTTLS on 587, SSL on 465). Bcc recipients are
    delivered and the Bcc header is removed. Raises on failure."""
    if not config.SMTP_HOST:
        raise RuntimeError("Email is not configured (SMTP_HOST in backend/.env)")
    context = ssl.create_default_context()
    if config.SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, timeout=30, context=context)
    else:
        server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=30)
    with server:
        if config.SMTP_PORT != 465:
            server.ehlo()
            if server.has_extn("starttls"):
                server.starttls(context=context)
                server.ehlo()
        if config.SMTP_USER:
            server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.send_message(msg)


def _build_reply(m: dict, data: ReplyIn) -> EmailMessage:
    name = f"{m['first_name']} {m['last_name']}".strip()
    msg = EmailMessage()
    msg["Subject"] = data.subject
    msg["From"] = formataddr(("RF Data Systems", config.CONTACT_EMAIL_FROM))
    msg["To"] = formataddr((name, m["email"]))
    msg["Reply-To"] = config.CONTACT_EMAIL_FROM
    if data.copy_to_company and config.CONTACT_EMAIL_TO:
        msg["Bcc"] = ", ".join(config.CONTACT_EMAIL_TO)
    msg["Message-ID"] = make_msgid(domain=config.CONTACT_EMAIL_FROM.split("@")[-1] or None)

    text = data.body
    quote_html = ""
    if data.include_original:
        when = _when(m.get("created_at"))
        quoted = "\n".join(f"> {line}" for line in m["message"].split("\n"))
        text += f"\n\n---\nOn {when}, {name} wrote:\n{quoted}\n"
        original = html.escape(m["message"]).replace("\n", "<br>")
        quote_html = (
            f'<p style="margin:24px 0 6px;font-size:13px;color:#64748b">On {html.escape(when)}, {html.escape(name)} wrote:</p>'
            f'<blockquote style="margin:0;padding:8px 14px;border-left:3px solid #cbd5e1;color:#475569">{original}</blockquote>'
        )
    msg.set_content(text)
    body_html = html.escape(data.body).replace("\n", "<br>")
    msg.add_alternative(
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0a0a0a;max-width:640px">'
        f"{body_html}{quote_html}</div>",
        subtype="html",
    )
    return msg


def send_reply(message_id: int, data: ReplyIn) -> dict:
    """Sends a reply to the visitor now (the admin waits for the result),
    stores it and marks the message as replied. Raises on failure."""
    with db.cursor() as cur:
        m = get(cur, message_id)
    if not m:
        raise LookupError("Message not found")
    msg = _build_reply(m, data)
    copied = msg["Bcc"]
    _smtp_send(msg)
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO contact_replies (message_id, to_email, subject, body, copied_to) VALUES (%s,%s,%s,%s,%s)",
            (message_id, m["email"], data.subject, data.body, copied),
        )
        cur.execute("UPDATE contact_messages SET status='replied' WHERE id=%s", (message_id,))
        return get(cur, message_id, with_replies=True)


def deliver(message_id: int) -> None:
    """Background job: email a stored message and record the outcome."""
    with db.cursor() as cur:
        m = get(cur, message_id)
    if not m:
        return
    try:
        send_email(m)
        sent, error = 1, None
    except Exception as e:  # noqa: BLE001 - record any failure for the admin page
        sent, error = 0, f"{type(e).__name__}: {e}"[:500]
    with db.cursor() as cur:
        cur.execute("UPDATE contact_messages SET email_sent=%s, email_error=%s WHERE id=%s", (sent, error, message_id))
