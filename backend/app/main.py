"""RFDSL API (FastAPI). Run from backend/:  .venv\\Scripts\\python -m uvicorn app.main:app --reload --port 8000

Public:  GET  /api/categories
         GET  /api/products?category=&subcategory=&type=&brand=&q=&page=
         GET  /api/products/featured            home page: popular / new / sale
         GET  /api/products/{slug}
Admin:   POST /api/admin/login                 {password} -> {token, expires}
         (all below need Authorization: Bearer <token>)
         GET  /api/admin/session
         GET  /api/admin/products?q=&category=&page=&per_page=
         GET  /api/admin/products/{id}
         POST /api/admin/products               create
         PUT  /api/admin/products/{id}          replace
         PATCH /api/admin/products/{id}         publish toggle / sort order
         POST /api/admin/products/{id}/duplicate
         DELETE /api/admin/products/{id}
         POST /api/admin/uploads                multipart "files" (images, PDFs)
         GET  /api/admin/suggestions            autocomplete values
Contact: POST /api/contact                      public form -> saved + emailed
         GET  /api/admin/messages?status=&q=&page=   (status: inbox|new|read|replied|archived|all)
         GET  /api/admin/messages/{id}          (marks a new message as read)
         PATCH /api/admin/messages/{id}         {status, admin_note}
         POST /api/admin/messages/{id}/resend   email it again
         POST /api/admin/messages/{id}/reply    {subject, body, include_original, copy_to_company}
         DELETE /api/admin/messages/{id}
Visitors: POST /api/track                       page view from the site's tracker (public)
         GET  /api/admin/visitors/stats?days=   summary (days: 1 today, 7, 30, 90, 0 all)
         GET  /api/admin/visitors?days=&q=&page=
         GET  /api/admin/visitors/{id}          sessions + page views, chronological
         DELETE /api/admin/visitors/{id}        forget one visitor
         DELETE /api/admin/visitors?older_than_days=N   delete old tracking data
Nemanja: POST /api/chat/start                   new chat -> {id, token}
         GET  /api/chat/{id}?token=&after=      status + new messages (polled)
         POST /api/chat/{id}/messages           {token, text}
         GET  /api/admin/nemanja/status
         POST /api/admin/nemanja/test           {mode: connection|question, question?, api_key?, model?}
         GET  /api/admin/chats?status=&page=    (status: needs_reply|ai|human|closed)
         GET  /api/admin/chats/{id}
         POST /api/admin/chats/{id}/reply       {text, email_customer}
         POST /api/admin/chats/{id}/status      {status: ai|human|closed}
         GET  /api/admin/knowledge?status=      notes Nemanja found on the web
         PATCH /api/admin/knowledge/{id}        {status, content, product_slug}
         DELETE /api/admin/knowledge/{id}
"""

import ipaddress

import pymysql
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel, Field

from . import config, contact, db, nemanja, visitors
from . import products as repo
from .auth import check_password, issue_token, require_admin
from .models import LoginIn, ProductIn, ProductPatch
from .uploads import save_upload

app = FastAPI(title="RFDSL API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount(config.UPLOAD_URL_PREFIX, StaticFiles(directory=config.UPLOAD_DIR), name="uploads")


@app.exception_handler(pymysql.err.OperationalError)
async def _db_down(_request, exc):
    from fastapi.responses import JSONResponse

    return JSONResponse({"detail": f"Database unavailable: {exc.args[-1] if exc.args else exc}"}, status_code=503)


@app.get("/api/health")
def health():
    with db.cursor() as cur:
        cur.execute("SELECT COUNT(*) n FROM products")
        return {"ok": True, "products": cur.fetchone()["n"]}


# ------------------------------------------------------------------ public

public = APIRouter(prefix="/api")


@public.get("/categories")
def categories():
    with db.cursor() as cur:
        return repo.category_counts(cur)


@public.get("/products")
def list_products(
    q: str = Query("", max_length=200),
    category: str = "",
    subcategory: str = "",
    type: str = Query("", pattern="^(|hardware|software)$"),
    brand: str = "",
    page: int = Query(1, ge=1),
):
    if category and category not in config.CATEGORY_TYPES:
        category = ""
    with db.cursor() as cur:
        return repo.list_products(
            cur, q=q, category=category, subcategory=subcategory, product_type=type, brand=brand, page=page
        )


@public.get("/products/featured")
def featured_products():
    """Home page sections: {popular: [...], new: [...], sale: [...]}."""
    with db.cursor() as cur:
        return repo.featured(cur)


@public.get("/products/{slug}")
def product_detail(slug: str):
    with db.cursor() as cur:
        product = repo.get_product(cur, slug=slug)
        if not product:
            raise HTTPException(404, "Product not found")
        product["related"] = repo.related_products(cur, product)
        return product


def client_ip(request: Request) -> str:
    """Visitor IP. /api/track and /api/contact arrive from the Next.js site's
    route handlers, which pass the visitor's address in X-Forwarded-For."""
    direct = _plain_ip(request.client.host if request.client else "")
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded and direct in config.TRUSTED_PROXIES:
        return _plain_ip(forwarded.split(",")[0].strip())[:45]
    return direct


def _plain_ip(value: str) -> str:
    """'::ffff:203.0.113.5' (IPv4 written as IPv6) -> '203.0.113.5'."""
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return value
    mapped = getattr(ip, "ipv4_mapped", None)
    return str(mapped or ip)


@public.post("/contact", status_code=201)
def submit_contact(body: contact.ContactIn, request: Request, background: BackgroundTasks):
    if body.website:  # honeypot filled in: a bot. Pretend it worked.
        return {"ok": True}
    ip = client_ip(request)
    if not contact.allow(ip):
        raise HTTPException(429, "Too many messages from your connection. Please try again later or email us.")
    with db.cursor() as cur:
        message_id = contact.save(cur, body, ip, request.headers.get("user-agent", ""))
    # Email after responding, so the visitor isn't kept waiting on the mail server.
    background.add_task(contact.deliver, message_id)
    return {"ok": True}


class ChatStartIn(BaseModel):
    page: str = Field("", max_length=300)


class ChatMessageIn(BaseModel):
    token: str = Field(..., max_length=64)
    text: str = Field(..., min_length=1, max_length=2000)


@public.get("/chat/status")
def chat_status():
    """Whether Nemanja is switched on (otherwise chats go to staff)."""
    return {"available": nemanja.is_configured()}


@public.post("/chat/start")
def chat_start(body: ChatStartIn, request: Request):
    with db.cursor() as cur:
        conv = nemanja.start_conversation(cur, client_ip(request), body.page)
    return conv | {"available": nemanja.is_configured()}


@public.get("/chat/{conv_id}")
def chat_state(conv_id: int, token: str = Query(..., max_length=64), after: int = Query(0, ge=0)):
    with db.cursor() as cur:
        conv = nemanja.get_conversation(cur, conv_id, token)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        return nemanja.public_state(cur, conv, after)


@public.post("/chat/{conv_id}/messages", status_code=202)
def chat_message(conv_id: int, body: ChatMessageIn, request: Request):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Please write a message")
    with db.cursor() as cur:
        if not nemanja.get_conversation(cur, conv_id, body.token):
            raise HTTPException(404, "Conversation not found")
    if not nemanja.allow_message(client_ip(request)):
        raise HTTPException(429, "You're sending messages very quickly. Please wait a moment.")
    try:
        nemanja.post_visitor_message(conv_id, text)
    except ValueError as e:
        raise HTTPException(409, str(e))
    return {"ok": True}


@public.post("/track", status_code=204)
def track(body: visitors.TrackIn, request: Request):
    with db.cursor() as cur:
        visitors.record(cur, client_ip(request), request.headers.get("user-agent", ""), body)


app.include_router(public)

# ------------------------------------------------------------------ admin

admin = APIRouter(prefix="/api/admin")
secured = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


@admin.post("/login")
def login(body: LoginIn, request: Request):
    check_password(request, body.password)
    token, exp = issue_token()
    return {"token": token, "expires": exp}


@secured.get("/session")
def session():
    return {"ok": True}


@secured.get("/products")
def admin_list(
    q: str = Query("", max_length=200),
    category: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    with db.cursor() as cur:
        return repo.list_products(cur, q=q, category=category, page=page, per_page=per_page, include_unpublished=True)


@secured.get("/products/{product_id}")
def admin_get(product_id: int):
    with db.cursor() as cur:
        product = repo.get_product(cur, product_id=product_id, include_unpublished=True)
        if not product:
            raise HTTPException(404, "Product not found")
        return product


@secured.post("/products", status_code=201)
def admin_create(body: ProductIn):
    with db.cursor() as cur:
        new_id = repo.save_product(cur, body)
        return repo.get_product(cur, product_id=new_id, include_unpublished=True)


@secured.put("/products/{product_id}")
def admin_update(product_id: int, body: ProductIn):
    with db.cursor() as cur:
        if not repo.get_product(cur, product_id=product_id, include_unpublished=True):
            raise HTTPException(404, "Product not found")
        repo.save_product(cur, body, product_id)
        return repo.get_product(cur, product_id=product_id, include_unpublished=True)


@secured.patch("/products/{product_id}")
def admin_patch(product_id: int, body: ProductPatch):
    sets, args = [], []
    if body.is_published is not None:
        sets.append("is_published=%s")
        args.append(int(body.is_published))
    for flag in ("is_popular", "is_new", "is_on_sale"):
        value = getattr(body, flag)
        if value is not None:
            sets.append(f"{flag}=%s")
            args.append(int(value))
            if flag == "is_on_sale" and not value:
                sets.append("sale_label=NULL")
    if body.sort_order is not None:
        sets.append("sort_order=%s")
        args.append(body.sort_order)
    with db.cursor() as cur:
        if sets:
            cur.execute(f"UPDATE products SET {', '.join(sets)} WHERE id=%s", args + [product_id])
        product = repo.get_product(cur, product_id=product_id, include_unpublished=True)
        if not product:
            raise HTTPException(404, "Product not found")
        return product


@secured.post("/products/{product_id}/duplicate", status_code=201)
def admin_duplicate(product_id: int):
    with db.cursor() as cur:
        product = repo.get_product(cur, product_id=product_id, include_unpublished=True)
        if not product:
            raise HTTPException(404, "Product not found")
        copy = repo.to_input(product)
        copy.name = f"{copy.name} (copy)"
        copy.slug = f"{product['slug']}-copy"
        copy.is_published = False  # hidden until reviewed
        new_id = repo.save_product(cur, copy)
        return repo.get_product(cur, product_id=new_id, include_unpublished=True)


@secured.delete("/products/{product_id}", status_code=204)
def admin_delete(product_id: int):
    with db.cursor() as cur:
        cur.execute("DELETE FROM products WHERE id=%s", (product_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Product not found")


@secured.post("/uploads")
async def admin_upload(files: list[UploadFile] = File(...)):
    if len(files) > 20:
        raise HTTPException(400, "Up to 20 files at a time")
    return [await save_upload(f) for f in files]


@secured.get("/suggestions")
def admin_suggestions():
    with db.cursor() as cur:
        return repo.suggestions(cur)


@secured.get("/messages")
def admin_messages(
    status: str = Query("inbox", pattern="^(inbox|all|new|read|replied|archived)$"),
    q: str = Query("", max_length=200),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    with db.cursor() as cur:
        return contact.list_messages(cur, status=status, q=q, page=page, per_page=per_page)


@secured.get("/messages/{message_id}")
def admin_message(message_id: int):
    with db.cursor() as cur:
        m = contact.get(cur, message_id, with_replies=True)
        if not m:
            raise HTTPException(404, "Message not found")
        if m["status"] == "new":
            cur.execute("UPDATE contact_messages SET status='read' WHERE id=%s", (message_id,))
            m["status"] = "read"
        return m


@secured.patch("/messages/{message_id}")
def admin_message_patch(message_id: int, body: contact.MessagePatch):
    sets, args = [], []
    if body.status is not None:
        sets.append("status=%s")
        args.append(body.status)
    if body.admin_note is not None:
        sets.append("admin_note=%s")
        args.append(body.admin_note.strip() or None)
    with db.cursor() as cur:
        if sets:
            cur.execute(f"UPDATE contact_messages SET {', '.join(sets)} WHERE id=%s", args + [message_id])
        m = contact.get(cur, message_id, with_replies=True)
        if not m:
            raise HTTPException(404, "Message not found")
        return m


@secured.post("/messages/{message_id}/resend")
def admin_message_resend(message_id: int):
    contact.deliver(message_id)  # waits for the mail server so the result can be shown
    with db.cursor() as cur:
        m = contact.get(cur, message_id, with_replies=True)
        if not m:
            raise HTTPException(404, "Message not found")
        return m


@secured.post("/messages/{message_id}/reply")
def admin_message_reply(message_id: int, body: contact.ReplyIn):
    try:
        return contact.send_reply(message_id, body)
    except LookupError:
        raise HTTPException(404, "Message not found")
    except Exception as e:  # noqa: BLE001 - show the mail server's answer to the admin
        raise HTTPException(502, f"The email could not be sent: {type(e).__name__}: {e}"[:400])


@secured.delete("/messages/{message_id}", status_code=204)
def admin_message_delete(message_id: int):
    with db.cursor() as cur:
        cur.execute("DELETE FROM contact_messages WHERE id=%s", (message_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Message not found")


@secured.get("/visitors/stats")
def admin_visitor_stats(days: int = Query(7, ge=0, le=365)):
    with db.cursor() as cur:
        return visitors.stats(cur, days)


@secured.get("/visitors")
def admin_visitors(
    days: int = Query(7, ge=0, le=365),
    q: str = Query("", max_length=60),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
):
    with db.cursor() as cur:
        return visitors.list_visitors(cur, days=days, q=q, page=page, per_page=per_page)


@secured.get("/visitors/{visitor_id}")
def admin_visitor(visitor_id: int):
    with db.cursor() as cur:
        v = visitors.get_visitor(cur, visitor_id)
        if not v:
            raise HTTPException(404, "Visitor not found")
        return v


@secured.delete("/visitors/{visitor_id}", status_code=204)
def admin_visitor_delete(visitor_id: int):
    with db.cursor() as cur:
        cur.execute("DELETE FROM visitors WHERE id=%s", (visitor_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Visitor not found")


@secured.delete("/visitors")
def admin_visitors_purge(older_than_days: int = Query(..., ge=1, le=3650)):
    """Deletes page views and sessions older than N days, then visitors with nothing left."""
    cutoff = visitors.datetime.now() - visitors.timedelta(days=older_than_days)
    with db.cursor() as cur:
        cur.execute("DELETE FROM visitor_sessions WHERE last_activity < %s", (cutoff,))
        removed_sessions = cur.rowcount
        cur.execute("DELETE v FROM visitors v LEFT JOIN visitor_sessions s ON s.visitor_id=v.id WHERE s.id IS NULL")
        removed_visitors = cur.rowcount
    return {"removed_sessions": removed_sessions, "removed_visitors": removed_visitors}


class StaffReplyIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    email_customer: bool = False


class ChatStatusIn(BaseModel):
    status: str = Field(..., pattern="^(ai|human|closed)$")


class NotePatch(BaseModel):
    status: str | None = Field(None, pattern="^(pending|approved|rejected)$")
    content: str | None = Field(None, min_length=1, max_length=4000)
    product_slug: str | None = Field(None, max_length=160)  # "" detaches it from a product


@secured.get("/nemanja/status")
def admin_nemanja_status():
    return nemanja.status_info()


class AiTestIn(BaseModel):
    mode: str = Field(..., pattern="^(connection|question|nemanja)$")
    question: str = Field("", max_length=2000)
    api_key: str = Field("", max_length=400)  # optional: try another key without saving it
    model: str = Field("", max_length=100)  # optional: try another model
    base_url: str = Field("", max_length=300)


@secured.post("/nemanja/test")
def admin_nemanja_test(body: AiTestIn):
    """Admin check that the AI answers (key, model, a plain question). Nothing is stored."""
    key, model, base = body.api_key.strip(), body.model.strip(), body.base_url.strip()
    if base and not base.startswith(("https://", "http://localhost", "http://127.0.0.1")):
        raise HTTPException(400, "The endpoint must start with https://")
    if body.mode == "connection":
        return nemanja.test_connection(key, model, base)
    if body.mode == "nemanja":
        return nemanja.test_as_nemanja(body.question.strip() or "Which handheld reader suits a cold store?")
    question = body.question.strip() or "Say hello in one short sentence."
    return nemanja.test_question(question, key, model, base)


@secured.get("/chats")
def admin_chats(status: str = Query("", max_length=20), page: int = Query(1, ge=1)):
    with db.cursor() as cur:
        return nemanja.list_conversations(cur, status=status, page=page)


@secured.get("/chats/{conv_id}")
def admin_chat(conv_id: int):
    with db.cursor() as cur:
        detail = nemanja.conversation_detail(cur, conv_id)
        if not detail:
            raise HTTPException(404, "Conversation not found")
        return detail


@secured.post("/chats/{conv_id}/reply")
def admin_chat_reply(conv_id: int, body: StaffReplyIn):
    with db.cursor() as cur:
        if not nemanja.get_conversation(cur, conv_id):
            raise HTTPException(404, "Conversation not found")
    try:
        nemanja.staff_reply(conv_id, body.text.strip(), body.email_customer)
    except Exception as e:  # noqa: BLE001 - the reply is saved; only the email failed
        raise HTTPException(502, f"Reply saved, but the email to the customer failed: {type(e).__name__}: {e}"[:400])
    with db.cursor() as cur:
        return nemanja.conversation_detail(cur, conv_id)


@secured.post("/chats/{conv_id}/status")
def admin_chat_status(conv_id: int, body: ChatStatusIn):
    with db.cursor() as cur:
        if not nemanja.get_conversation(cur, conv_id):
            raise HTTPException(404, "Conversation not found")
    nemanja.set_status(conv_id, body.status)
    with db.cursor() as cur:
        return nemanja.conversation_detail(cur, conv_id)


@secured.get("/knowledge")
def admin_knowledge(status: str = Query("pending", max_length=20)):
    with db.cursor() as cur:
        return nemanja.list_notes(cur, status)


@secured.patch("/knowledge/{note_id}")
def admin_knowledge_patch(note_id: int, body: NotePatch):
    sets, args = [], []
    if body.status is not None:
        sets += ["status=%s", "reviewed_at=NOW()"]
        args.append(body.status)
    if body.content is not None:
        sets.append("content=%s")
        args.append(body.content.strip())
    with db.cursor() as cur:
        if body.product_slug is not None:
            product_id = None
            if body.product_slug:
                cur.execute("SELECT id FROM products WHERE slug=%s", (body.product_slug,))
                row = cur.fetchone()
                if not row:
                    raise HTTPException(400, "No product with that slug")
                product_id = row["id"]
            sets.append("product_id=%s")
            args.append(product_id)
        if sets:
            cur.execute(f"UPDATE knowledge_notes SET {', '.join(sets)} WHERE id=%s", args + [note_id])
        cur.execute(
            "SELECT n.*, p.name product_name, p.slug product_slug FROM knowledge_notes n"
            " LEFT JOIN products p ON p.id=n.product_id WHERE n.id=%s",
            (note_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Note not found")
        return nemanja._iso(row, "created_at", "reviewed_at")


@secured.delete("/knowledge/{note_id}", status_code=204)
def admin_knowledge_delete(note_id: int):
    with db.cursor() as cur:
        cur.execute("DELETE FROM knowledge_notes WHERE id=%s", (note_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Note not found")


app.include_router(admin)
app.include_router(secured)
