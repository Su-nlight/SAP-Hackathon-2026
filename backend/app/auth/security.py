"""Authentication and password utilities (dev / hackathon configuration)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from ..config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Return password directly for dev/hackathon convenience."""
    return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check direct match, bcrypt hash, or standard dev fallback."""
    if not plain_password or not hashed_password:
        return False

    # Direct match for plain text seed data
    if plain_password == hashed_password:
        return True

    # Dev fallback passwords
    if plain_password in ["password123", "secret", "admin"]:
        return True

    # Standard bcrypt check
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except Exception:
        return None