"""SAP bridge contracts: DTOs and the provider interface."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass
class SapNodeInfo:
    """A master-data node from S/4HANA (plant or customer)."""

    id: str
    name: str
    kind: str
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
    """Row from ZHEAL_DISRUPTION."""

    event_id: str
    company_id: str = ""
    disrupt_type: str = ""
    target_type: str = "node"
    target_id: str = ""
    severity: str = "full"
    status: str = "new"
    start_ts: Optional[str] = None
    end_ts: Optional[str] = None
    created_at: Optional[str] = None
    created_by: str = ""
    approved_by: str = ""
    impact_delay: float = 0.0
    capacity_factor: float = 1.0
    source: str = "manual"
    raw_text: str = ""
    resolved_at: Optional[str] = None
    manual_review: bool = False
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
        """Probe the SAP service."""

    @abstractmethod
    def fetch_network(self) -> tuple[list[SapNodeInfo], list[SapMaterialInfo]]:
        """Pull plants, customers and materials."""

    @abstractmethod
    def list_disruptions(self) -> list[SapDisruptionRow]:
        """List mirrored disruption rows."""

    @abstractmethod
    def create_disruption(self, row: SapDisruptionRow) -> SapDisruptionRow:
        """Create a disruption in SAP."""

    @abstractmethod
    def approve_disruption(self, event_id: str) -> bool:
        """Approve a disruption in SAP."""

    @abstractmethod
    def resolve_disruption(self, event_id: str) -> bool:
        """Resolve a disruption in SAP."""

    @abstractmethod
    def delete_disruption(self, event_id: str) -> bool:
        """Delete a disruption in SAP."""
