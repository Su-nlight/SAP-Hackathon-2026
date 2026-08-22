"""Pydantic structured-output schemas for the agent's LLM steps."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from ..domain.constants import DisruptionType, Severity


class DisruptionParse(BaseModel):
    """The parse step's structured output — strict, LLM must fill all fields."""

    type: DisruptionType
    target_type: Literal["node", "edge"]
    target_id: str
    severity: Severity
    expected_end: Optional[datetime] = None
    confidence: float = Field(ge=0.0, le=1.0)
    notes: str = ""

    @field_validator("expected_end", mode="before")
    @classmethod
    def _coerce_invalid_end(cls, v):
        # LLMs emit "", "unknown", "N/A", "TBD" — coerce all to None.
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                from datetime import datetime as _dt
                _dt.fromisoformat(v.replace("Z", "+00:00"))
                return v
            except (ValueError, TypeError):
                return None
        return v


class ImpactAssessment(BaseModel):
    affected_shipment_ids: list[str] = Field(default_factory=list)
    cargo_value_at_risk: float = 0.0
    sla_exposure: list[str] = Field(default_factory=list)
    urgency: Literal["low", "medium", "high", "critical"] = "medium"
    summary: str = ""
