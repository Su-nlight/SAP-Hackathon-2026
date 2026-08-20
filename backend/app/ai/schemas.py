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
    def _empty_end_is_none(cls, v):
        # LLMs love emitting "" instead of null for unknown fields.
        return None if v in ("", None) else v


class ImpactAssessment(BaseModel):
    affected_shipment_ids: list[str] = Field(default_factory=list)
    cargo_value_at_risk: float = 0.0
    sla_exposure: list[str] = Field(default_factory=list)
    urgency: Literal["low", "medium", "high", "critical"] = "medium"
    summary: str = ""
