"""Product queries: listing with filters + search, detail, save, suggestions."""

import json
import re
import unicodedata
from collections import Counter, defaultdict

from . import config
from .models import ProductIn

JSON_FIELDS = ("gallery", "highlights", "specs", "links")

LIST_COLUMNS = (
    "id, slug, name, model, brand, product_type, category, subcategory, frequency, "
    "tagline, summary, image, is_published, is_popular, is_new, is_on_sale, sale_label, home_popular, home_new, home_sale, sort_order, updated_at"
)


# ---------------------------------------------------------------- helpers


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:150] or "product"


def _like(token: str) -> str:
    return "%" + token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def _tokens(q: str) -> list[str]:
    return [t[:60] for t in q.split() if t.strip()][:8]


def build_search_text(p: ProductIn) -> str:
    """Flatten every searchable word into one string (stored in search_text)."""
    cat = next((c["label"] for c in config.CATEGORIES if c["value"] == p.category), p.category)
    parts = [
        p.name, p.model, p.brand, cat, p.category, config.CATEGORY_TYPES[p.category],
        p.subcategory, p.frequency, p.tagline, p.summary, p.description, p.keywords,
        # Squashed name/model so "advanreader10" or "mc 51" style typing still matches.
        re.sub(r"[\s\-_./]+", "", f"{p.name} {p.model}"),
    ]
    for section in p.highlights:
        parts.append(section.title)
        parts.extend(item.text for item in section.items)
    for group in p.specs:
        parts.append(group.group)
        for row in group.rows:
            parts.extend((row.label, row.value, row.note))
    parts.extend(link.label for link in p.links)
    text = " ".join(x for x in parts if x)
    return re.sub(r"\s+", " ", text).strip()


def _decode(row: dict) -> dict:
    for f in JSON_FIELDS:
        if f in row:
            row[f] = json.loads(row[f]) if row[f] else []
    for f in ("created_at", "updated_at"):
        if row.get(f) is not None:
            row[f] = row[f].isoformat()
    for flag in ("is_published", "is_popular", "is_new", "is_on_sale", "home_popular", "home_new", "home_sale"):
        if flag in row:
            row[flag] = bool(row[flag])
    return row


def _unique_slug(cur, wanted: str, exclude_id: int | None = None) -> str:
    base = slugify(wanted)
    slug, n = base, 2
    while True:
        cur.execute(
            "SELECT id FROM products WHERE slug=%s AND (%s IS NULL OR id<>%s)",
            (slug, exclude_id, exclude_id),
        )
        if not cur.fetchone():
            return slug
        slug, n = f"{base}-{n}", n + 1


# ---------------------------------------------------------------- reading


def list_products(
    cur,
    *,
    q: str = "",
    category: str = "",
    subcategory: str = "",
    product_type: str = "",
    brand: str = "",
    page: int = 1,
    per_page: int = config.PAGE_SIZE,
    include_unpublished: bool = False,
) -> dict:
    """One query searches every product type: filters on the classification
    columns, and each search word must appear somewhere in search_text."""
    where, args = [], []
    if not include_unpublished:
        where.append("is_published=1")
    if category:
        where.append("category=%s")
        args.append(category)
    if product_type:
        where.append("product_type=%s")
        args.append(product_type)
    if brand:
        where.append("brand=%s")
        args.append(brand)

    tokens = _tokens(q)
    for t in tokens:
        where.append("search_text LIKE %s")
        args.append(_like(t))

    # Subcategory chips for the chosen category (counted before the
    # subcategory filter itself, so every chip keeps its number).
    facets = []
    if category:
        sql = "SELECT subcategory, COUNT(*) n FROM products"
        sql += (" WHERE " + " AND ".join(where)) if where else ""
        sql += " GROUP BY subcategory ORDER BY subcategory"
        cur.execute(sql, args)
        facets = [{"value": r["subcategory"], "count": r["n"]} for r in cur.fetchall() if r["subcategory"]]

    if subcategory:
        where.append("subcategory=%s")
        args.append(subcategory)

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    cur.execute("SELECT COUNT(*) n FROM products" + where_sql, args)
    total = cur.fetchone()["n"]

    pages = max(1, -(-total // per_page))
    page = min(max(1, page), pages)

    if tokens:
        # Best matches first: exact name, name/model starting with the query,
        # then full-text relevance over everything.
        order = (
            " ORDER BY (name=%s) DESC, (name LIKE %s) DESC, (model LIKE %s) DESC,"
            " MATCH(search_text) AGAINST (%s) DESC, sort_order, name"
        )
        prefix = q.strip().replace("%", "").replace("_", "") + "%"
        order_args = [q.strip(), prefix, prefix, q.strip()]
    else:
        order, order_args = " ORDER BY sort_order, name", []

    cur.execute(
        f"SELECT {LIST_COLUMNS} FROM products{where_sql}{order} LIMIT %s OFFSET %s",
        args + order_args + [per_page, (page - 1) * per_page],
    )
    items = [_decode(r) for r in cur.fetchall()]
    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages, "subcategories": facets}


def get_product(cur, *, slug: str | None = None, product_id: int | None = None, include_unpublished=False) -> dict | None:
    sql = "SELECT * FROM products WHERE " + ("slug=%s" if slug is not None else "id=%s")
    if not include_unpublished:
        sql += " AND is_published=1"
    cur.execute(sql, (slug if slug is not None else product_id,))
    row = cur.fetchone()
    if not row:
        return None
    row.pop("search_text", None)
    return _decode(row)


def related_products(cur, product: dict, limit: int = 4) -> list[dict]:
    """Same subcategory first, then same category."""
    cur.execute(
        f"SELECT {LIST_COLUMNS} FROM products WHERE is_published=1 AND category=%s AND id<>%s"
        " ORDER BY (subcategory <=> %s) DESC, sort_order, name LIMIT %s",
        (product["category"], product["id"], product.get("subcategory"), limit),
    )
    return [_decode(r) for r in cur.fetchall()]


# Each badge and the home page section that may list it. A section lists only
# products that have the badge AND its home_* switch on; a badge alone doesn't
# put a product on the home page.
HOME_FOR_BADGE = {"is_popular": "home_popular", "is_new": "home_new", "is_on_sale": "home_sale"}


def featured(cur, limit: int = 24) -> dict:
    """Published products for the three home page sections (empty lists hide them)."""
    out = {}
    for key, badge in (("popular", "is_popular"), ("new", "is_new"), ("sale", "is_on_sale")):
        home = HOME_FOR_BADGE[badge]
        cur.execute(
            f"SELECT {LIST_COLUMNS} FROM products WHERE is_published=1 AND {badge}=1 AND {home}=1 ORDER BY sort_order, name LIMIT %s",
            (limit,),
        )
        out[key] = [_decode(r) for r in cur.fetchall()]
    return out


def category_counts(cur) -> list[dict]:
    cur.execute("SELECT category, COUNT(*) n FROM products WHERE is_published=1 GROUP BY category")
    counts = {r["category"]: r["n"] for r in cur.fetchall()}
    return [{**c, "count": counts.get(c["value"], 0)} for c in config.CATEGORIES]


# ---------------------------------------------------------------- writing


def save_product(cur, data: ProductIn, product_id: int | None = None) -> int:
    slug = _unique_slug(cur, data.slug or data.name, product_id)
    values = {
        "slug": slug,
        "name": data.name,
        "model": data.model or None,
        "brand": data.brand or None,
        "product_type": config.CATEGORY_TYPES[data.category],
        "category": data.category,
        "subcategory": data.subcategory or None,
        "frequency": data.frequency or None,
        "tagline": data.tagline or None,
        "summary": data.summary or None,
        "description": data.description or None,
        "image": data.gallery[0] if data.gallery else None,
        "gallery": json.dumps(data.gallery, ensure_ascii=False),
        "highlights": json.dumps([s.model_dump() for s in data.highlights], ensure_ascii=False),
        "specs": json.dumps([g.model_dump() for g in data.specs], ensure_ascii=False),
        "links": json.dumps([link.model_dump() for link in data.links], ensure_ascii=False),
        "keywords": data.keywords or None,
        "is_published": int(data.is_published),
        "is_popular": int(data.is_popular),
        "is_new": int(data.is_new),
        "is_on_sale": int(data.is_on_sale),
        "sale_label": (data.sale_label or None) if data.is_on_sale else None,
        # Home page sections need the matching badge (see HOME_FOR_BADGE).
        "home_popular": int(data.is_popular and data.home_popular),
        "home_new": int(data.is_new and data.home_new),
        "home_sale": int(data.is_on_sale and data.home_sale),
        "sort_order": data.sort_order,
        "search_text": build_search_text(data),
    }
    cols = list(values)
    if product_id is None:
        cur.execute(
            f"INSERT INTO products ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})",
            [values[c] for c in cols],
        )
        return cur.lastrowid
    cur.execute(
        f"UPDATE products SET {', '.join(f'{c}=%s' for c in cols)} WHERE id=%s",
        [values[c] for c in cols] + [product_id],
    )
    return product_id


def to_input(product: dict) -> ProductIn:
    """A stored product as an editable ProductIn (used by duplicate)."""
    fields = ProductIn.model_fields
    return ProductIn(**{k: (v if v is not None else fields[k].default) for k, v in product.items() if k in fields})


# ---------------------------------------------------------------- admin helpers


def suggestions(cur) -> dict:
    """Values already used across the catalogue, offered as autocomplete in the
    admin editor so naming stays consistent (e.g. "Physical Characteristics")."""
    cur.execute("SELECT category, brand, subcategory, frequency, highlights, specs, links FROM products")
    brands, freqs, kinds, sections, groups = Counter(), Counter(), Counter(), Counter(), Counter()
    subs: dict[str, Counter] = defaultdict(Counter)
    labels: dict[str, Counter] = defaultdict(Counter)
    for r in cur.fetchall():
        if r["brand"]:
            brands[r["brand"]] += 1
        if r["frequency"]:
            freqs[r["frequency"]] += 1
        if r["subcategory"]:
            subs[r["category"]][r["subcategory"]] += 1
        for s in json.loads(r["highlights"] or "[]"):
            sections[s.get("title", "")] += 1
        for g in json.loads(r["specs"] or "[]"):
            groups[g.get("group", "")] += 1
            for row in g.get("rows", []):
                if row.get("label"):
                    labels[g.get("group", "")][row["label"]] += 1
        for link in json.loads(r["links"] or "[]"):
            kinds[link.get("kind", "")] += 1

    def top(c: Counter) -> list[str]:
        return [k for k, _ in c.most_common() if k]

    return {
        "brands": top(brands),
        "frequencies": top(freqs),
        "subcategories": {k: top(v) for k, v in subs.items()},
        "highlight_titles": top(sections),
        "spec_groups": top(groups),
        "spec_labels": {k: top(v) for k, v in labels.items() if k},
        "link_kinds": top(kinds),
    }
