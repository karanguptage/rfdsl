# RF Data Systems website

- `frontend/`: Next.js site (pages, design, product list and product pages, `/admin`)
- `backend/`: Python API (FastAPI) on the MySQL / MariaDB database `RFDSL`

## Run locally

Requirements: Python 3.11+, Node 20+, MySQL or MariaDB on `127.0.0.1:3306` (here: XAMPP, user `root`, no password).

```powershell
# 1. Backend (first time)
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env          # then set ADMIN_PASSWORD and SECRET_KEY (already done locally)
.venv\Scripts\python init_db.py # (re)creates database RFDSL from sql/schema.sql, loads the starter products

# 2. Backend (every time)  ->  http://127.0.0.1:8000  (API docs: /docs)
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# 3. Frontend (another terminal)  ->  http://localhost:3000
cd frontend
npm install
npm run dev
```

The site calls the API at `http://127.0.0.1:8000` by default; set `API_URL` for the frontend if it runs elsewhere.
The browser reaches the API and uploaded files through the site itself (`/api/*`, `/uploads/*` are forwarded, see `frontend/next.config.ts`).

`init_db.py` always starts from scratch: if the database already exists it is deleted first, then rebuilt from
`backend/sql/schema.sql` with the starter products. Everything stored in it is lost (products entered in /admin,
messages and replies, visitor statistics, chats, knowledge notes); files in `backend/uploads` are kept.

## Pages

| URL | What |
| --- | --- |
| `/products` | All products, 8 per page. Filters in the URL: `?category=reader&subcategory=Handheld%20Readers&q=uhf&page=2` |
| `/products/<slug>` | Product page (photos, highlights, specifications, downloads, related products) |
| `/admin` | Administration (Products, Messages). Password is `ADMIN_PASSWORD` in `backend/.env` |

## Nemanja (AI consultant on /solutions)

Powered by OpenAI (Responses API + Conversations API, official `openai` Python SDK). Definition and runtime:
`backend/app/nemanja.py`.

**Settings (`backend/.env`):** `AI_PROVIDER=openai_compatible` (or `none` to switch it off), `AI_API_KEY`,
`AI_MODEL` (currently `gpt-4o-mini`), `AI_BASE_URL` (any endpoint offering the OpenAI Responses + Conversations
APIs), `AI_EFFORT` (reasoning models only), `AI_TIMEOUT_SECONDS`, `AI_MAX_RETRIES`, `AI_INPUT_COST_PER_MTOK` /
`AI_OUTPUT_COST_PER_MTOK` (cost estimates shown per chat in the admin), `AI_WEB_SEARCH` (on/off),
`NEMANJA_MAX_TOKENS_PER_CHAT` (usage limit), `NEMANJA_WEB_DOMAINS`. Restart the backend after changing them. Without a
working key, chats go straight to staff. If the model doesn't support web search, Nemanja continues without it.

- Each website chat gets an OpenAI Conversation (durable history, so a chat resumed later keeps its context). A
  background thread per chat runs the tool-calling loop: the visitor's new message(s) go in, Nemanja's function calls
  are answered from the database, and its replies are stored (`chat_conversations`, `chat_messages`). The browser polls
  `/api/chat/*` (Next.js route handler -> API).
- Function tools (strict): `search_catalog`, `get_product_details` (specs, highlights, downloads, approved notes, links
  to page sections like `/products/mc51#spec-uhf-rfid`), `show_products` (photo cards in the chat),
  `save_device_note`, `request_human_handoff`. OpenAI's web search is limited to the manufacturer sites.
- Facts it finds on the web are saved as notes; only notes approved in `/admin` → Nemanja → Knowledge notes are given
  back to it.
- Hand-off: Nemanja (or an error / the usage limit) moves the chat to "Needs a person" and emails `CONTACT_EMAIL_TO`.
  Staff reply in `/admin` → Nemanja (optionally also by email, with a link back to the chat), then hand back or close.
  Email alerts only (no SMS).
- The round "Ask Nemanja" button (bottom-right, every page except /solutions and /admin) and the animated "Solutions"
  menu item lead to the chat.

## Home page product sections

Each product has three badges (columns `is_popular`, `is_new`, `is_on_sale` + optional `sale_label`), shown on the
product panels and product page, and a separate "Show on home page" switch for each (`home_popular`, `home_new`,
`home_sale`), both set in the editor ("Badges & homepage sections"). A switch only counts while its badge is on:
the home page shows "The most popular products", "New arrivals" and "Special offers" from the published products
with both the badge and the switch (`GET /api/products/featured`); a section with no products isn't shown. With 4
or fewer products a section is a still row instead of the moving carousel.

## Visitor tracking

`<VisitTracker />` (in the root layout) reports every public page view, including in-site navigation, to
`/api/track`. That path and `/api/contact` are Next.js route handlers (`src/app/api/*/route.ts`), not rewrites,
because rewrites don't pass the visitor's IP on: the handlers forward it to the API in `X-Forwarded-For`, which
the API accepts only from `TRUSTED_PROXIES` (backend `.env`, default localhost). If a reverse proxy (nginx, a host's
load balancer) sits in front of Next.js in production, it must set `X-Forwarded-For` as well.

Stored in `visitors` (one row per IP), `visitor_sessions` (a new session after 30 minutes without activity) and
`page_views` (each page in order, with a readable label such as the product name). Bots, `/admin` pages and the
administrator's browser (marked on sign-in; switch on the Visitors page) are not recorded. A reload of the same
page within 10 seconds counts once.

`/admin` → Visitors shows visitors, new vs returning, returning rate, visits and page views for today / 7 / 30 /
90 days / all time, visitors per day, most viewed products and pages, the visitor list, and each visitor's
pages in order grouped by visit. A visitor's data can be deleted there; old data can be removed with
`DELETE /api/admin/visitors?older_than_days=N`.

IP addresses are personal information under the NZ Privacy Act 2020: mention the tracking in the privacy policy
and keep the data only as long as needed.

## Contact form

The "Contact Us" form posts to `/api/contact`. Each message is saved in the `contact_messages` table
(readable in `/admin` → Messages, with unread / replied / archived folders and an internal note) and emailed to
`CONTACT_EMAIL_TO` through the SMTP server in `backend/.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `CONTACT_EMAIL_FROM`). The email's Reply-To is the visitor, so replying in the mail app answers
them directly. If sending fails, the message is still saved and can be re-sent from the admin page.

Replies can be written and sent from the admin page ("Reply by email"): they go out through the same SMTP server
from `CONTACT_EMAIL_FROM`, optionally quote the original message and Bcc `CONTACT_EMAIL_TO` (mail sent this way
doesn't appear in the mailbox's Sent folder). Sent replies are stored in `contact_replies` and shown under the message.
Spam protection: a hidden honeypot field and at most 5 messages per visitor IP per 10 minutes.

## How products are stored

One table, `products` (see `backend/sql/schema.sql`), for every device and software product:

- **Classification columns** (indexed): `product_type` (hardware / software), `category`
  (reader, antenna, tag, printer, accessory, software), `subcategory` (free text, e.g. "Handheld Readers"),
  `brand`, `model`, `frequency`.
- **JSON columns** for everything that differs per product: `gallery`, `highlights`
  (sections like "Features" / "Functions" of icon + text lines), `specs` (groups of label / value / note rows),
  `links` (datasheets, manuals, videos). Group and row names are free text, so a tag, a handheld and a software
  package each get their own structure without schema changes.
- **`search_text`**: every searchable word of the product (including all spec values), rebuilt on each save,
  so one query searches the whole catalogue.

To add a category, add it to `CATEGORIES` in both `backend/app/config.py` and `frontend/src/lib/catalog.ts`.

## Admin editor shortcuts

- **Start from template**: group / row names for handheld, fixed reader, antenna, tag, printer, accessory, software.
  Rows left empty are not saved.
- **Copy layout from a product**: reuse the groups (and optionally values) of a similar product.
- **Paste from datasheet**: paste a table copied from a web page, Excel or a PDF; preview before adding.
- **Duplicate** (in the list) copies a product as a new hidden one.
- Highlights: icons are suggested from the text; Enter adds the next line; "Paste list" adds many at once.
- **Preview** shows the product page with unsaved changes; **Ctrl+S** saves.
