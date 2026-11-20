"""Visitor tracking: every page view on the public site, grouped by visitor IP
and session, plus the summaries shown in /admin > Visitors."""

import re
import threading
import time
from datetime import datetime, timedelta
from urllib.parse import parse_qs, unquote, urlsplit

from pydantic import BaseModel, Field

from . import config

SESSION_GAP = timedelta(minutes=30)  # a new session starts after 30 minutes without activity
DUPLICATE_WINDOW = timedelta(seconds=10)  # same page again within 10s (reload, double event) = one view

_BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|discord|skype|"
    r"curl|wget|python|java/|httpclient|go-http|okhttp|axios|node-fetch|headless|phantom|lighthouse|"
    r"pagespeed|gtmetrix|pingdom|uptime|preview|scanner",
    re.I,
)

PLURAL = {c["value"]: c["label"] + ("" if c["value"] == "software" else "s") for c in config.CATEGORIES}
PLURAL["accessory"] = "Accessories"
PAGE_NAMES = {"/": "Home", "/about": "About Us", "/solutions": "Solutions", "/products": "Products"}


class TrackIn(BaseModel):
    path: str = Field(..., min_length=1, max_length=500)  # pathname + query string
    title: str = Field("", max_length=300)
    referrer: str = Field("", max_length=500)  # external referrer, first view of a visit only


# ------------------------------------------------------------------ helpers


def parse_user_agent(ua: str) -> dict:
    u = ua or ""
    if re.search(r"ipad|tablet|android(?!.*mobile)", u, re.I):
        device = "Tablet"
    elif re.search(r"mobi|iphone|ipod|android", u, re.I):
        device = "Mobile"
    else:
        device = "Desktop"
    for pattern, name in (
        (r"Edg(e|A|iOS)?/", "Edge"),
        (r"OPR/|Opera", "Opera"),
        (r"SamsungBrowser", "Samsung Internet"),
        (r"Firefox|FxiOS", "Firefox"),
        (r"Chrome|CriOS", "Chrome"),
        (r"Safari", "Safari"),
    ):
        if re.search(pattern, u):
            browser = name
            break
    else:
        browser = "Other"
    for pattern, name in (
        (r"Windows NT", "Windows"),
        (r"iPhone|iPad|iPod", "iOS"),
        (r"Mac OS X|Macintosh", "macOS"),
        (r"Android", "Android"),
        (r"CrOS", "ChromeOS"),
        (r"Linux", "Linux"),
    ):
        if re.search(pattern, u):
            os_name = name
            break
    else:
        os_name = "Other"
    return {"device": device, "browser": browser, "os": os_name}


def is_bot(ua: str) -> bool:
    return not ua or bool(_BOT_RE.search(ua))


def describe(cur, path: str, title: str) -> tuple[str, int | None]:
    """A readable label for a page view, and the product id for product pages."""
    parts = urlsplit(path)
    route = parts.path.rstrip("/") or "/"
    query = {k: v[0] for k, v in parse_qs(parts.query).items() if v}

    m = re.fullmatch(r"/products/([^/]+)", route)
    if m:
        slug = unquote(m.group(1))
        cur.execute("SELECT id, name FROM products WHERE slug=%s", (slug,))
        row = cur.fetchone()
        return (row["name"], row["id"]) if row else (f"Product: {slug}", None)

    if route == "/products":
        label = "Products"
        if query.get("category") in PLURAL:
            label += f" › {PLURAL[query['category']]}"
        if query.get("subcategory"):
            label += f" › {query['subcategory']}"
        if query.get("q"):
            label += f" · search “{query['q'][:60]}”"
        if query.get("page", "1") != "1":
            label += f" · page {query['page']}"
        return label, None

    if route in PAGE_NAMES:
        return PAGE_NAMES[route], None
    clean = re.sub(r"\s*\|\s*RF Data Systems.*$", "", title or "").strip()
    return (clean or route)[:300], None


# ------------------------------------------------------------------ recording

_recent: dict[str, list[float]] = {}
_lock = threading.Lock()


def _allow(ip: str) -> bool:
    """At most 60 tracked views per IP per minute (ignore floods)."""
    now = time.time()
    with _lock:
        hits = [t for t in _recent.get(ip, []) if now - t < 60]
        hits.append(now)
        _recent[ip] = hits
        return len(hits) <= 60


def record(cur, ip: str, user_agent: str, data: TrackIn) -> bool:
    """Stores one page view. Returns False when it was skipped."""
    path = data.path if data.path.startswith("/") else "/" + data.path
    if not ip or is_bot(user_agent) or path.startswith("/admin") or not _allow(ip):
        return False
    now = datetime.now().replace(microsecond=0)
    ua = user_agent[:400]
    info = parse_user_agent(ua)
    referrer = data.referrer.strip()[:500] or None

    cur.execute("SELECT id FROM visitors WHERE ip=%s FOR UPDATE", (ip,))
    row = cur.fetchone()
    if row:
        visitor_id = row["id"]
    else:
        cur.execute(
            "INSERT INTO visitors (ip, first_seen, last_seen, user_agent, device, browser, os, first_referrer)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (ip, now, now, ua, info["device"], info["browser"], info["os"], referrer),
        )
        visitor_id = cur.lastrowid

    cur.execute(
        "SELECT id, last_activity FROM visitor_sessions WHERE visitor_id=%s ORDER BY last_activity DESC LIMIT 1",
        (visitor_id,),
    )
    session = cur.fetchone()
    if not session or now - session["last_activity"] > SESSION_GAP:
        cur.execute(
            "INSERT INTO visitor_sessions (visitor_id, started_at, last_activity, referrer, user_agent) VALUES (%s,%s,%s,%s,%s)",
            (visitor_id, now, now, referrer, ua),
        )
        session_id = cur.lastrowid
        cur.execute("UPDATE visitors SET sessions=sessions+1 WHERE id=%s", (visitor_id,))
    else:
        session_id = session["id"]
        cur.execute("SELECT path, viewed_at FROM page_views WHERE session_id=%s ORDER BY id DESC LIMIT 1", (session_id,))
        last = cur.fetchone()
        if last and last["path"] == path and now - last["viewed_at"] <= DUPLICATE_WINDOW:
            cur.execute("UPDATE visitor_sessions SET last_activity=%s WHERE id=%s", (now, session_id))
            return False

    label, product_id = describe(cur, path, data.title)
    cur.execute(
        "INSERT INTO page_views (visitor_id, session_id, path, label, product_id, viewed_at) VALUES (%s,%s,%s,%s,%s,%s)",
        (visitor_id, session_id, path, label, product_id, now),
    )
    cur.execute("UPDATE visitor_sessions SET page_views=page_views+1, last_activity=%s WHERE id=%s", (now, session_id))
    cur.execute(
        "UPDATE visitors SET page_views=page_views+1, last_seen=%s, user_agent=%s, device=%s, browser=%s, os=%s WHERE id=%s",
        (now, ua, info["device"], info["browser"], info["os"], visitor_id),
    )
    return True


# ------------------------------------------------------------------ admin queries


def period_start(days: int) -> datetime | None:
    """days: 1 = today (since midnight), 7 / 30 / 90 = last N days, 0 = all time."""
    now = datetime.now()
    if days <= 0:
        return None
    if days == 1:
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    return now - timedelta(days=days)


def _iso(row: dict, *fields: str) -> dict:
    for f in fields:
        if row.get(f) is not None:
            row[f] = row[f].isoformat()
    return row


def stats(cur, days: int) -> dict:
    since = period_start(days)
    lo = since or datetime(1970, 1, 1)

    cur.execute("SELECT COUNT(DISTINCT visitor_id) n FROM visitor_sessions WHERE last_activity >= %s", (lo,))
    visitors = cur.fetchone()["n"]
    cur.execute("SELECT COUNT(*) n FROM visitors WHERE first_seen >= %s", (lo,))
    new = cur.fetchone()["n"]
    # Returning = active in the period and also visited in an earlier session
    # (first seen before the period, or 2+ sessions within it).
    cur.execute(
        "SELECT COUNT(*) n FROM (SELECT s.visitor_id FROM visitor_sessions s JOIN visitors v ON v.id=s.visitor_id"
        " WHERE s.last_activity >= %s GROUP BY s.visitor_id HAVING MIN(v.first_seen) < %s OR COUNT(*) >= 2) t",
        (lo, lo),
    )
    returning = cur.fetchone()["n"]
    cur.execute("SELECT COUNT(*) n FROM visitor_sessions WHERE started_at >= %s", (lo,))
    sessions = cur.fetchone()["n"]
    cur.execute("SELECT COUNT(*) n FROM page_views WHERE viewed_at >= %s", (lo,))
    views = cur.fetchone()["n"]

    cur.execute(
        "SELECT label, MIN(path) path, product_id, COUNT(*) views, COUNT(DISTINCT visitor_id) visitors FROM page_views"
        " WHERE viewed_at >= %s GROUP BY label, product_id ORDER BY views DESC, label LIMIT 8",
        (lo,),
    )
    top_pages = cur.fetchall()
    cur.execute(
        "SELECT p.id, p.name, p.slug, COUNT(*) views, COUNT(DISTINCT pv.visitor_id) visitors FROM page_views pv"
        " JOIN products p ON p.id=pv.product_id WHERE pv.viewed_at >= %s GROUP BY p.id ORDER BY views DESC, p.name LIMIT 8",
        (lo,),
    )
    top_products = cur.fetchall()

    # Daily series (for the last 7 / 30 / 90 days; hourly isn't useful at this scale).
    series = []
    if days > 1:
        start = (datetime.now() - timedelta(days=days - 1)).date()
        cur.execute(
            "SELECT DATE(viewed_at) d, COUNT(DISTINCT visitor_id) visitors, COUNT(*) views FROM page_views"
            " WHERE viewed_at >= %s GROUP BY DATE(viewed_at)",
            (datetime.combine(start, datetime.min.time()),),
        )
        by_day = {r["d"]: r for r in cur.fetchall()}
        for i in range(days):
            d = start + timedelta(days=i)
            r = by_day.get(d)
            series.append({"date": d.isoformat(), "visitors": r["visitors"] if r else 0, "views": r["views"] if r else 0})

    return {
        "days": days,
        "visitors": visitors,
        "new_visitors": new,
        "returning_visitors": returning,
        "returning_rate": round(returning / visitors, 4) if visitors else 0,
        "sessions": sessions,
        "page_views": views,
        "pages_per_session": round(views / sessions, 2) if sessions else 0,
        "top_pages": top_pages,
        "top_products": top_products,
        "series": series,
    }


def list_visitors(cur, *, days: int, q: str = "", page: int = 1, per_page: int = 25) -> dict:
    since = period_start(days)
    where, args = [], []
    if since:
        where.append("v.last_seen >= %s")
        args.append(since)
    if q.strip():
        where.append("v.ip LIKE %s")
        args.append(q.strip().replace("%", "").replace("_", "\\_") + "%")
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    cur.execute("SELECT COUNT(*) n FROM visitors v" + where_sql, args)
    total = cur.fetchone()["n"]
    pages = max(1, -(-total // per_page))
    page = min(max(1, page), pages)
    cur.execute(
        "SELECT v.id, v.ip, v.first_seen, v.last_seen, v.sessions, v.page_views, v.device, v.browser, v.os, v.first_referrer,"
        " (SELECT label FROM page_views WHERE visitor_id=v.id ORDER BY viewed_at DESC, id DESC LIMIT 1) AS last_page"
        f" FROM visitors v{where_sql} ORDER BY v.last_seen DESC, v.id DESC LIMIT %s OFFSET %s",
        args + [per_page, (page - 1) * per_page],
    )
    items = [_iso(r, "first_seen", "last_seen") for r in cur.fetchall()]
    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages}


def get_visitor(cur, visitor_id: int) -> dict | None:
    cur.execute("SELECT * FROM visitors WHERE id=%s", (visitor_id,))
    v = cur.fetchone()
    if not v:
        return None
    _iso(v, "first_seen", "last_seen")
    # The most recent 200 sessions, shown oldest first.
    cur.execute(
        "SELECT * FROM (SELECT id, started_at, last_activity, page_views, referrer FROM visitor_sessions"
        " WHERE visitor_id=%s ORDER BY started_at DESC LIMIT 200) s ORDER BY started_at",
        (visitor_id,),
    )
    sessions = cur.fetchall()
    ids = [s["id"] for s in sessions]
    views_by_session: dict[int, list] = {i: [] for i in ids}
    if ids:
        cur.execute(
            "SELECT pv.id, pv.session_id, pv.path, pv.label, pv.viewed_at, p.slug product_slug FROM page_views pv"
            f" LEFT JOIN products p ON p.id=pv.product_id WHERE pv.session_id IN ({','.join(['%s'] * len(ids))})"
            " ORDER BY pv.viewed_at, pv.id",
            ids,
        )
        for r in cur.fetchall():
            views_by_session[r["session_id"]].append(_iso(r, "viewed_at"))
    for s in sessions:
        s["views"] = views_by_session[s["id"]]
        s["duration_seconds"] = int((s["last_activity"] - s["started_at"]).total_seconds())
        _iso(s, "started_at", "last_activity")
    v["visit_sessions"] = sessions
    return v
