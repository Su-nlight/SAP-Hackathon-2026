"""Authenticates API callers — via SAP (real ICF Basic Auth) when SAP is
connected, or a local mock user store otherwise. Same output shape either
way: (company_id, username, roles) or None on failure.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

from ..config import settings
from ..sap.http_provider import S4HttpProvider, SapConnectionError
from .security import verify_password


@dataclass
class Identity:
    username: str
    company_id: str
    roles: list[str]
    auth_source: str  # "mock" | "sap"


class AuthService:
    def __init__(self) -> None:
        self._mock_users = self._load_mock_users()

    @staticmethod
    def _load_mock_users() -> list[dict]:
        path = settings.mock_users_path
        if not path.exists():
            return []
        return json.loads(path.read_text(encoding="utf-8"))

    def _authenticate_mock(self, username: str, password: str) -> Identity | None:
        for user in self._mock_users:
            if user["username"] == username and verify_password(password, user["password_hash"]):
                return Identity(
                    username=username,
                    company_id=user["company_id"],
                    roles=user.get("roles", []),
                    auth_source="mock",
                )
        return None

    def _authenticate_sap(self, username: str, password: str) -> Identity | None:
        """Validate the caller's own SAP credentials directly against ICF.

        Deliberately builds a throwaway provider with the CALLER's creds —
        never the shared service-account creds from settings — so this
        actually authenticates the human, not just proves the backend's
        own SAP link is up.
        """
        if not settings.sap_base_url:
            return None
        probe = S4HttpProvider(
            base_url=settings.sap_base_url,
            username=username,
            password=password,
            client=settings.sap_client,
        )
        health = probe.health()
        if not health.ok:
            return None
        # Map the SAP user to a tenant. Adjust this lookup to however your
        # org actually maps SAP users -> companies (e.g. a table, or the
        # SAP client/company code itself). Placeholder: derive from client.
        company_id = self._company_for_sap_client(health.client) or "acme"
        return Identity(username=username, company_id=company_id, roles=["operator"], auth_source="sap")

    @staticmethod
    def _company_for_sap_client(sap_client: str) -> str | None:
        mapping = {"000": "acme", "100": "globex"}  # replace with your real mapping
        return mapping.get(sap_client)

    def authenticate(self, username: str, password: str) -> Identity | None:
        mode = settings.auth_mode
        if mode == "mock":
            return self._authenticate_mock(username, password)
        if mode == "sap":
            return self._authenticate_sap(username, password)
        # "auto": prefer SAP if it's actually configured, fall back to mock
        # (covers real-SAP deployments where SAP is briefly down, and pure
        # local/hackathon dev where SAP was never configured at all)
        if settings.sap_base_url:
            identity = self._authenticate_sap(username, password)
            if identity is not None:
                return identity
        return self._authenticate_mock(username, password)