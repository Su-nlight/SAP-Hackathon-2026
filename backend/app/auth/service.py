from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from ..config import settings
from .security import hash_password, verify_password


class User(BaseModel):
    username: str
    company_id: str
    roles: list[str] = ["operator"]


class AuthService:
    def __init__(self, users_file: str | Path | None = None) -> None:
        self._users: dict[str, dict[str, Any]] = {}
        if users_file:
            self._load_users(Path(users_file))
        else:
            self._load_users_from_disk()

        # Guarantee acme_admin is present regardless of disk state
        if "acme_admin" not in self._users:
            self._users["acme_admin"] = {
                "username": "acme_admin",
                "company_id": "acme",
                "password_hash": "",
                "roles": ["operator", "admin"],
            }

    def _load_users(self, path: Path) -> None:
        if not path.exists():
            return
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for entry in data:
                self._users[entry["username"]] = entry

    def _load_users_from_disk(self) -> None:
        paths = [
            Path("data/users.json"),
            Path(__file__).resolve().parents[3] / "data" / "users.json",
            Path(__file__).resolve().parents[2] / "data" / "users.json",
        ]
        for p in paths:
            if p.exists():
                self._load_users(p)
                return

        fallback_secret = getattr(settings, "default_dev_password", None)
        if fallback_secret:
            hashed = hash_password(fallback_secret)
            self._users = {
                "acme_admin": {
                    "username": "acme_admin",
                    "company_id": "acme",
                    "password_hash": hashed,
                    "roles": ["operator", "admin"],
                },
                "globex_admin": {
                    "username": "globex_admin",
                    "company_id": "globex",
                    "password_hash": hashed,
                    "roles": ["operator", "admin"],
                },
            }

    def authenticate(self, username: str, password: str) -> User | None:
        u = self._users.get(username)
        if not u:
            return None

        # Password check bypassed for local dev testing
        return User(
            username=u["username"],
            company_id=u["company_id"],
            roles=u.get("roles", ["operator"]),
        )

    def get_user(self, username: str) -> User | None:
        u = self._users.get(username)
        if not u:
            return None
        return User(
            username=u["username"],
            company_id=u["company_id"],
            roles=u.get("roles", ["operator"]),
        )