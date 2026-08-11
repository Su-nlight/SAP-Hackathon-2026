"""Core domain models. Pure data — no I/O, no side effects."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .constants import (
    AgentStatus,
    DisruptionStatus,
    DisruptionType,
    EdgeMode,
    HealAction,
    NodeType,
    Severity,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class GeoPoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class Node(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    type: NodeType
    location: GeoPoint
    capacity: float = 1.0  # relative throughput capacity 0..1
    inventory: float = 0.0  # buffer stock available at this node
    status: Literal["online", "degraded", "offline"] = "online"
    metadata: dict[str, Any] = Field(default_factory=dict)


class Edge(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    target: str
    mode: EdgeMode
    distance_km: float = Field(gt=0)
    base_time_hours: float = Field(gt=0)
    base_cost_per_ton: float = Field(ge=0)
    capacity: float = 1.0
    reliability: float = Field(default=0.9, ge=0, le=1)
    co2_per_ton_km: float = Field(default=0.02, ge=0)
    schedule: list[str] = Field(default_factory=list)  # departure windows (ISO times)


class Network(BaseModel):
    nodes: dict[str, Node]
    edges: dict[str, Edge]

    def neighbors(self, node_id: str) -> list[str]:
        return [e.target for e in self.edges.values() if e.source == node_id]


class Shipment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    origin: str
    destination: str
    cargo_tons: float = Field(gt=0)
    deadline: datetime
    budget_per_ton: float = Field(ge=0)
    priority: Literal["low", "standard", "high", "critical"] = "standard"
    mode_preference: Optional[EdgeMode] = None


class DisruptionEvent(BaseModel):
    """A disruption targeting a node or edge. Append-only in the event log."""

    model_config = ConfigDict(extra="forbid")

    id: str
    type: DisruptionType
    target_type: Literal["node", "edge"]
    target_id: str
    severity: Severity
    start_time: datetime
    expected_end: Optional[datetime] = None  # None => open-ended
    impact_delay_hours: float = 0.0  # extra delay applied to the element
    capacity_factor: float = Field(default=1.0, ge=0, le=1)
    source: str = "manual"
    raw_text: str = ""
    status: DisruptionStatus = DisruptionStatus.ACTIVE
    created_at: datetime = Field(default_factory=utcnow)
    resolved_at: Optional[datetime] = None
    manual_review: bool = False  # flagged when LLM parse confidence was low

    @property
    def is_open_ended(self) -> bool:
        return self.expected_end is None

    def is_active_at(self, when: Optional[datetime] = None) -> bool:
        if self.status != DisruptionStatus.ACTIVE:
            return False
        when = when or utcnow()
        if when < self.start_time:
            return False
        if self.expected_end is not None and when > self.expected_end:
            return False
        return True


class RouteLeg(BaseModel):
    edge_id: str
    mode: EdgeMode
    source: str
    target: str
    distance_km: float
    time_hours: float
    cost_per_ton: float


class RouteAlternative(BaseModel):
    route_id: str
    path: list[str]  # node ids
    legs: list[RouteLeg]
    total_time_hours: float
    total_cost_per_ton: float
    total_risk: float
    total_co2_per_ton: float
    composite_weight: float
    delta_time_hours: Optional[float] = None
    delta_cost_per_ton: Optional[float] = None
    feasibility: Literal["feasible", "infeasible"] = "feasible"
    infeasible_reasons: list[str] = Field(default_factory=list)


class HealDecision(BaseModel):
    action: HealAction
    reason: str
    alternatives: list[RouteAlternative] = Field(default_factory=list)
    wait_hours: Optional[float] = None  # for wait_hold
    affected_shipment_ids: list[str] = Field(default_factory=list)


class ImpactAssessment(BaseModel):
    affected_shipment_ids: list[str] = Field(default_factory=list)
    cargo_value_at_risk: float = 0.0
    sla_exposure: list[str] = Field(default_factory=list)  # shipment ids near deadline
    urgency: Literal["low", "medium", "high", "critical"] = "medium"
    summary: str = ""


class DisruptionParse(BaseModel):
    """Structured output of the LLM parse step."""

    type: DisruptionType
    target_type: Literal["node", "edge"]
    target_id: str
    severity: Severity
    expected_end: Optional[datetime] = None
    confidence: float = Field(ge=0, le=1)
    notes: str = ""


class CompanyLLMConfig(BaseModel):
    """Per-company LLM choice. The special feature."""

    model_config = ConfigDict(extra="forbid")

    company_id: str
    provider: str = "omnirouter"
    model: str = "auto"
    temperature: float = 0.2

    @field_validator("provider")
    @classmethod
    def _provider_lower(cls, v: str) -> str:
        return v.lower().strip()


class LLMProbeResult(BaseModel):
    ok: bool
    provider: str
    model: str
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class AppState(BaseModel):
    """Snapshot of the whole system for the dashboard."""

    active_disruptions: list[DisruptionEvent] = Field(default_factory=list)
    pending_approvals: list[dict[str, Any]] = Field(default_factory=list)
    node_count: int = 0
    edge_count: int = 0
    healthy: bool = True
