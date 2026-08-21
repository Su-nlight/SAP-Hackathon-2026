"""LangGraph agent state. TypedDict — the contract every node reads/writes."""
from __future__ import annotations

from typing import Any, Optional, TypedDict

from ..schemas import DisruptionParse, ImpactAssessment
from ...domain.models import HealDecision


class SupplyAgentState(TypedDict, total=False):
    # input
    company_id: str
    raw_alert: str

    # parse step
    parse_result: Optional[DisruptionParse]
    disruption_id: Optional[str]

    # assess step
    assessment: Optional[ImpactAssessment]

    # recommend step
    decision: Optional[HealDecision]

    # narrate step
    narrative: Optional[str]

    # workflow control
    status: str  # AgentStatus values
    feedback: Optional[str]
    approved: Optional[bool]

    # passthrough for the API response
    extras: dict[str, Any]
