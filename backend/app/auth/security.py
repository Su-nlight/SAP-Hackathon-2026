"""JWT issuance/verification and password hashing. No business logic here."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from ..config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def create_access_token(claims: dict[str, Any]) -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET is not set — cannot issue tokens.")
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {**claims, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Raises JWTError on invalid/expired token — caller maps to 401."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])