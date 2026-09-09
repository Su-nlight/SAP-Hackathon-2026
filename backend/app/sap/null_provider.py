"""Null provider: honest offline mode when SAP is not configured.

The service keeps working on seed data; every SAP endpoint reports
`sap_connected: false` with a human-readable reason instead of failing
or bluffing.
"""
from __future__ import annotations

from .base import (
    SapDisruptionRow,
    SapHealth,
    SapMaterialInfo,
    SapNodeInfo,
    SapProvider,
)


class NullSapProvider(SapProvider):
    name = "offline"

    def __init__(self, reason: str) -> None:
        self._reason = reason

    def health(self) -> SapHealth:
        return SapHealth(ok=False, detail=self._reason)

    def fetch_network(self) -> tuple[list[SapNodeInfo], list[SapMaterialInfo]]:
        raise SapNotConfigured(self._reason)

    def list_disruptions(self) -> list[SapDisruptionRow]:
        raise SapNotConfigured(self._reason)

    def create_disruption(self, row: SapDisruptionRow) -> SapDisruptionRow:
        raise SapNotConfigured(self._reason)

    def approve_disruption(self, event_id: str) -> bool:
        raise SapNotConfigured(self._reason)

    def resolve_disruption(self, event_id: str) -> bool:
        raise SapNotConfigured(self._reason)

    def delete_disruption(self, event_id: str) -> bool:
        """Stub deletion for offline/seed mode."""
        return True
class SapNotConfigured(RuntimeError):
    """Raised when an SAP operation is attempted while offline."""
