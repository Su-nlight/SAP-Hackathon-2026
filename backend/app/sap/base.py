"""SAP bridge contracts: DTOs and the provider interface.

The provider interface is deliberately tiny (five calls) so an RFC-based
provider (pyrfc) or OData provider can be swapped in later without
touching SapService.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass
class SapNodeInfo:
    """A master-data node from S/4HANA (plant or customer)."""

    id: str                    # e.g. "DE00", "US00", "0000001000"
    name: str
    kind: str                  # "plant" | "customer"
    city: str = ""
    country: str = ""
    lat: Optional[float] = None
    lon: Optional[float] = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class SapMaterialInfo:
    material: str
    description: str = ""
    uom: str = ""
    weight_kg: Optional[float] = None
    total_stock: Optional[float] = None


@dataclass
class SapDisruptionRow:
    """Row from ZHEAL_DISRUPTIONS (mirrored events)."""

    event_id: str
    company_id: str = ""
    disrupt_type: str = ""
    target_type: str = "node"
    target_node: str = ""
    severity: str = "full"
    status: str = "new"        # new | pending | approved | rejected | resolved
    start_ts: Optional[str] = None
    end_ts: Optional[str] = None
    created_at: Optional[str] = None
    created_by: str = ""
    approved_by: str = ""
    payload_json: str = ""


@dataclass
class SapHealth:
    ok: bool
    system: str = ""
    client: str = ""
    user: str = ""
    time: Optional[datetime] = None
    detail: str = ""


@dataclass
class SapSyncResult:
    ok: bool
    connected: bool
    provider: str
    pulled_at: Optional[datetime] = None
    plants: int = 0
    customers: int = 0
    materials: int = 0
    disruptions_mirrored: int = 0
    error: Optional[str] = None


class SapProvider(ABC):
    """Transport-agnostic access to the S/4HANA bridge endpoints."""

    name: str = "abstract"

    @abstractmethod
    def health(self) -> SapHealth:
        """Probe the ICF service (GET /sap/zheal/health)."""

    @abstractmethod
    def fetch_network(self) -> tuple[list[SapNodeInfo], list[SapMaterialInfo]]:
        """Pull plants + customers + materials (GET /sap/zheal/network)."""

    @abstractmethod
    def list_disruptions(self) -> list[SapDisruptionRow]:
        """List ZHEAL_DISRUPTIONS rows (GET /sap/zheal/disruptions)."""

    @abstractmethod
    def create_disruption(self, row: SapDisruptionRow) -> SapDisruptionRow:
        """Mirror a disruption into SAP (POST /sap/zheal/disruptions)."""

    @abstractmethod
    def approve_disruption(self, event_id: str) -> bool:
        """Approve inside SAP (POST /sap/zheal/disruptions/approve)."""

    @abstractmethod
    def resolve_disruption(self, event_id: str) -> bool:
        """Resolve inside SAP (POST /sap/zheal/disruptions/resolve)."""
