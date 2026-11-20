"""Admin login: one shared password (ADMIN_PASSWORD) exchanged for a signed,
expiring token that the admin page sends as `Authorization: Bearer <token>`."""

import base64
import hashlib
import hmac
import json
import threading
import time

from fastapi import Header, HTTPException, Request, status

from . import config

_FAIL_WINDOW = 10 * 60  # seconds
_FAIL_LIMIT = 8  # failed attempts per IP within the window
_failures: dict[str, list[float]] = {}
_lock = threading.Lock()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(payload: str) -> str:
    return _b64(hmac.new(config.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())


def issue_token() -> tuple[str, int]:
    exp = int(time.time() + config.ADMIN_TOKEN_HOURS * 3600)
    payload = _b64(json.dumps({"sub": "admin", "exp": exp}).encode())
    return f"{payload}.{_sign(payload)}", exp


def verify_token(token: str) -> bool:
    try:
        payload, sig = token.split(".", 1)
        if not hmac.compare_digest(sig, _sign(payload)):
            return False
        return json.loads(_unb64(payload)).get("exp", 0) > time.time()
    except Exception:
        return False


def check_password(request: Request, password: str) -> None:
    """Raises 429 after too many failures from one IP, 401 on a wrong password."""
    if not config.ADMIN_PASSWORD or not config.SECRET_KEY:
        raise HTTPException(500, "Admin login is not configured (ADMIN_PASSWORD / SECRET_KEY in backend/.env)")
    ip = request.client.host if request.client else "?"
    now = time.time()
    with _lock:
        recent = [t for t in _failures.get(ip, []) if now - t < _FAIL_WINDOW]
        _failures[ip] = recent
        if len(recent) >= _FAIL_LIMIT:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Try again in a few minutes.")
    if not hmac.compare_digest(password.encode(), config.ADMIN_PASSWORD.encode()):
        with _lock:
            _failures.setdefault(ip, []).append(now)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect password")
    with _lock:
        _failures.pop(ip, None)


def require_admin(authorization: str = Header("")) -> None:
    """FastAPI dependency for every /api/admin route except login."""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not verify_token(token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in again", headers={"WWW-Authenticate": "Bearer"})
