from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel

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
            self._load_mock_users()

    def _load_users(self, path: Path) -> None:
        if not path.exists():
            return
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for entry in data:
                self._users[entry["username"]] = entry

    def _load_mock_users(self) -> None:
        paths = [
            Path("data/users.json"),
            Path(__file__).resolve().parents[3] / "data" / "users.json",
            Path(__file__).resolve().parents[2] / "data" / "users.json",
        ]
        for p in paths:
            if p.exists():
                self._load_users(p)
                return

        default_hash = hash_password("password123")
        self._users = {
            "acme_admin": {
                "username": "acme_admin",
                "company_id": "acme",
                "password_hash": default_hash,
                "roles": ["operator", "admin"],
            },
            "globex_admin": {
                "username": "globex_admin",
                "company_id": "globex",
                "password_hash": default_hash,
                "roles": ["operator", "admin"],
            },
        }

    def authenticate(self, username: str, password: str) -> User | None:
        u = self._users.get(username)
        if not u:
            return None
        if not verify_password(password, u["password_hash"]):
            return None
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