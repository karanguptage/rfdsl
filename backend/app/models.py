"""Request bodies. Strings are trimmed and empty rows/items are dropped, so the
admin editor can send its working state as-is."""

import re

from pydantic import BaseModel, Field, field_validator, model_validator

from . import config

# Images, files and links must be site-relative ("/uploads/...", "/products/...")
# or http(s) URLs; anything else (javascript:, data:) is rejected.
_URL_RE = re.compile(r"^(/(?!/)[^\s]*|https?://[^\s]+)$", re.I)


def _clean(v):
    return v.strip() if isinstance(v, str) else v


def _check_url(url: str) -> str:
    url = url.strip()
    if not _URL_RE.match(url):
        raise ValueError(f"Not an allowed URL: {url[:80]}")
    return url


class HighlightItem(BaseModel):
    icon: str = Field("", max_length=40)
    text: str = Field("", max_length=300)
    strip_text = field_validator("icon", "text", mode="before")(_clean)


class HighlightSection(BaseModel):
    title: str = Field("", max_length=80)
    items: list[HighlightItem] = []
    strip_text = field_validator("title", mode="before")(_clean)

    @model_validator(mode="after")
    def _drop_empty(self):
        self.items = [i for i in self.items if i.text]
        return self


class SpecRow(BaseModel):
    label: str = Field("", max_length=120)
    value: str = Field("", max_length=4000)  # may be several lines
    note: str = Field("", max_length=4000)  # smaller secondary text under the value
    strip_text = field_validator("label", mode="before")(_clean)

    @field_validator("value", "note", mode="before")
    @classmethod
    def _rstrip_lines(cls, v):
        # Keep leading spaces on lines (indented sub-lines, as in WWAN bands).
        if not isinstance(v, str):
            return v
        lines = [ln.rstrip() for ln in v.replace("\r\n", "\n").split("\n")]
        return "\n".join(lines).strip("\n")


class SpecGroup(BaseModel):
    group: str = Field("", max_length=100)
    rows: list[SpecRow] = []
    strip_text = field_validator("group", mode="before")(_clean)

    @model_validator(mode="after")
    def _drop_empty(self):
        # Template rows the admin left unfilled (label only) are not saved.
        self.rows = [r for r in self.rows if r.value.strip() or r.note.strip()]
        return self


class LinkItem(BaseModel):
    label: str = Field("", max_length=120)
    url: str = Field("", max_length=500)
    kind: str = Field("link", max_length=20)  # datasheet | manual | brochure | video | demo | link
    strip_text = field_validator("label", "url", "kind", mode="before")(_clean)


class ProductIn(BaseModel):
    slug: str = Field("", max_length=160)
    name: str = Field(..., min_length=1, max_length=200)
    model: str = Field("", max_length=120)
    brand: str = Field("", max_length=120)
    category: str
    subcategory: str = Field("", max_length=100)
    frequency: str = Field("", max_length=40)
    tagline: str = Field("", max_length=300)
    summary: str = Field("", max_length=600)
    description: str = Field("", max_length=20000)
    gallery: list[str] = Field([], max_length=30)
    highlights: list[HighlightSection] = Field([], max_length=10)
    specs: list[SpecGroup] = Field([], max_length=40)
    links: list[LinkItem] = Field([], max_length=20)
    keywords: str = Field("", max_length=600)
    is_published: bool = True
    is_popular: bool = False
    is_new: bool = False
    is_on_sale: bool = False
    sale_label: str = Field("", max_length=40)
    # Home page sections the product is listed in, set separately from the badges above.
    home_popular: bool = False
    home_new: bool = False
    home_sale: bool = False
    sort_order: int = 0

    strip_text = field_validator(
        "slug", "name", "model", "brand", "category", "subcategory", "frequency",
        "tagline", "summary", "description", "keywords", "sale_label", mode="before",
    )(_clean)

    @field_validator("category")
    @classmethod
    def _known_category(cls, v):
        if v not in config.CATEGORY_TYPES:
            raise ValueError(f"Unknown category '{v}'")
        return v

    @field_validator("gallery")
    @classmethod
    def _gallery_urls(cls, v):
        return [_check_url(u) for u in v if u and u.strip()]

    @model_validator(mode="after")
    def _tidy(self):
        if not self.name:
            raise ValueError("Name is required")
        self.highlights = [s for s in self.highlights if s.items]
        self.specs = [g for g in self.specs if g.rows]
        links = []
        for link in self.links:
            if not link.url:
                continue
            link.url = _check_url(link.url)
            link.label = link.label or link.url.rsplit("/", 1)[-1]
            links.append(link)
        self.links = links
        return self


class ProductPatch(BaseModel):
    """Quick changes from the admin list (publish toggle, ordering)."""

    is_published: bool | None = None
    is_popular: bool | None = None
    is_new: bool | None = None
    is_on_sale: bool | None = None
    home_popular: bool | None = None
    home_new: bool | None = None
    home_sale: bool | None = None
    sort_order: int | None = None


class LoginIn(BaseModel):
    password: str = Field(..., max_length=200)
