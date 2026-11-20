"""Image and document uploads, saved under backend/uploads/YYYY/MM/ and served
at /uploads/... (the Next.js site forwards /uploads to this API)."""

import io
import time
import uuid

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps

from . import config

IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}
MAX_IMAGE_SIDE = 2000  # larger photos are scaled down to keep pages fast


def _target(ext: str):
    sub = time.strftime("%Y/%m")
    folder = config.UPLOAD_DIR / sub
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex[:16]}{ext}"
    return folder / name, f"{config.UPLOAD_URL_PREFIX}/{sub}/{name}"


async def save_upload(file: UploadFile) -> dict:
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"{file.filename}: larger than {config.MAX_UPLOAD_BYTES // (1024 * 1024)} MB")
    if not data:
        raise HTTPException(400, f"{file.filename}: empty file")

    # PDFs (datasheets, manuals, brochures) are stored as-is.
    if data[:5] == b"%PDF-":
        path, url = _target(".pdf")
        path.write_bytes(data)
        return {"url": url, "name": file.filename, "kind": "file"}

    # Anything else must be a real image (checked by decoding it, not by its name).
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))
        fmt = img.format
    except Exception:
        raise HTTPException(400, f"{file.filename}: only JPG, PNG, WebP, GIF images or PDF files are accepted")
    if fmt not in IMAGE_FORMATS:
        raise HTTPException(400, f"{file.filename}: {fmt} images are not supported")

    path, url = _target(IMAGE_FORMATS[fmt])
    if fmt != "GIF" and max(img.size) > MAX_IMAGE_SIDE:
        img = ImageOps.exif_transpose(img)
        img.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
        if fmt == "JPEG" and img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        img.save(path, fmt, **({"quality": 88, "optimize": True} if fmt in ("JPEG", "WEBP") else {"optimize": True}))
    else:
        path.write_bytes(data)
    return {"url": url, "name": file.filename, "kind": "image", "width": img.size[0], "height": img.size[1]}
