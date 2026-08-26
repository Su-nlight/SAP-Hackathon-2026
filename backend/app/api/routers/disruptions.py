"""Disruption endpoints: lifecycle, approval, raw-text ingestion."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ...ai.agent.graph import SupplyAgent
from ...config import settings
from ...domain.constants import DisruptionType, HealAction, Severity
from ...domain.models import DisruptionEvent, HealDecision
from ...services.disruption_service import DisruptionService
from ..deps import get_agent, get_current_identity, get_disruption_service

router = APIRouter(prefix="/v1/disruptions", tags=["disruptions"])


class RawAlertIn(BaseModel):
    raw_text: str = Field(min_length=3)


class ApprovalIn(BaseModel):
    approved: bool = True
    feedback: str | None = None


def _parse_raw_alert(event_id: str, raw_text: str) -> DisruptionEvent:
    """Create a valid seed-network disruption when raw-alert parsing is needed.

    This deterministic fallback deliberately uses real seed IDs, so it can be
    registered before the agent assesses impact. The agent then works from the
    same persisted event as manually created and scenario disruptions.
    """
    text = raw_text.lower()
    if "suez" in text:
        target_id = "P9"
        disruption_type = DisruptionType.BLOCKAGE
    elif "singapore" in text:
        target_id = "P7"
        disruption_type = DisruptionType.PORT_CLOSURE
    elif "shanghai" in text:
        target_id = "P6"
        disruption_type = DisruptionType.PORT_CLOSURE
    else:
        target_id = "P8"
        disruption_type = DisruptionType.PORT_CLOSURE

    severity_terms = {
        "severe",
        "complete",
        "emergency",
        "blocked",
        "closed",
        "shutdown",
    }
    severity = (
        Severity.FULL
        if any(term in text for term in severity_terms)
        else Severity.PARTIAL
    )
    return DisruptionEvent(
        id=event_id,
        type=disruption_type,
        target_type="node",
        target_id=target_id,
        severity=severity,
        start_time=datetime.now(timezone.utc),
        source="raw_alert",
        raw_text=raw_text,
    )


@router.post("", status_code=201)
async def create_disruption(
    body: DisruptionEvent,
    identity: dict = Depends(get_current_identity),
    ds: DisruptionService = Depends(get_disruption_service),
    agent: SupplyAgent = Depends(get_agent),
):
    try:
        event = ds.register(body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    company_id = identity.get("company_id", "acme")

    agent_result = None
    agent_error = None

    if settings.ai_enabled:
        try:
            agent_result = await agent.run(
                company_id=company_id,
                raw_alert=f"Disruption type: {event.type.value if hasattr(event.type, 'value') else event.type}, target: {event.target_id}",
                thread_id=f"agent-{event.id}",
                disruption_id=event.id,
            )
        except Exception as exc:
            import traceback
            agent_error = f"{type(exc).__module__}.{type(exc).__name__}: {exc!r}"
            print(traceback.format_exc())

    return {
        "event": event.model_dump(mode="json"),
        "agent": agent_result,
        "agent_error": agent_error,
    }


@router.post("/ingest")
async def ingest_raw_alert(
    body: RawAlertIn,
    identity: dict = Depends(get_current_identity),
    agent: SupplyAgent = Depends(get_agent),
    ds: DisruptionService = Depends(get_disruption_service),
):
    event_id = f"d-{uuid.uuid4().hex[:8]}"
    company_id = identity.get("company_id", "acme")

    try:
        event = ds.register(_parse_raw_alert(event_id, body.raw_text))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if settings.ai_enabled:
        try:
            result = await agent.run(
                company_id=company_id,
                raw_alert=body.raw_text,
                thread_id=f"agent-{event_id}",
                disruption_id=event_id,
            )
            return {
                "thread_id": result["thread_id"],
                "disruption_id": event.id,
                "event": event.model_dump(mode="json"),
                "awaiting_approval": result.get("awaiting_approval", True),
                "narrative": result["state"].get("narrative"),
                "decision": (
                    result["state"]["decision"].model_dump(mode="json")
                    if result["state"].get("decision")
                    else None
                ),
            }
        except Exception as exc:
            agent_error = str(exc)
            print(f"[ingest_raw_alert] AI agent run failed ({exc}), returning registered event")
    else:
        agent_error = "AI agent is disabled."

    fallback_decision = HealDecision(
        action=HealAction.REROUTE,
        reason=(
            f"Registered {event.type.value} on {event.target_id}; "
            "agent assessment is unavailable."
        ),
        affected_shipment_ids=[],
    )

    return {
        "thread_id": f"agent-{event_id}",
        "disruption_id": event.id,
        "event": event.model_dump(mode="json"),
        "awaiting_approval": False,
        "agent_error": agent_error,
        "narrative": (
            f"Identified {event.severity.value} {event.type.value} at "
            f"{event.target_id}. The event was registered for review."
        ),
        "decision": fallback_decision.model_dump(mode="json"),
    }


@router.get("")
async def list_disruptions(
    status: str | None = Query(
        default=None,
        pattern="^(active|resolved)$",
    ),
    ds: DisruptionService = Depends(get_disruption_service),
):
    if status == "active":
        events = ds.active()
    elif status == "resolved":
        events = ds.resolved()
    else:
        events = ds.all()

    return {
        "disruptions": [e.model_dump(mode="json") for e in events]
    }


@router.get("/{event_id}")
async def get_disruption(
    event_id: str,
    ds: DisruptionService = Depends(get_disruption_service),
):
    event = ds.get(event_id)

    if event is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    return {"event": event.model_dump(mode="json")}


@router.post("/{event_id}/approve")
async def approve_disruption(
    event_id: str,
    body: ApprovalIn,
    ds: DisruptionService = Depends(get_disruption_service),
    agent: SupplyAgent = Depends(get_agent),
):
    if not body.approved:
        if not settings.ai_enabled:
            raise HTTPException(
                status_code=400,
                detail="AI rejection workflow requires AI to be enabled.",
            )

        if ds.get(event_id) is None:
            raise HTTPException(
                status_code=404,
                detail=f"Unknown disruption {event_id}",
            )

        try:
            result = await agent.resume(
                thread_id=f"agent-{event_id}",
                approved=False,
                feedback=body.feedback,
            )

            return {
                "event_id": event_id,
                "thread_id": result["thread_id"],
                "approved": False,
                "status": result["state"].get("status"),
                "awaiting_approval": result["awaiting_approval"],
                "next_nodes": result["next_nodes"],
                "provider": settings.data_provider,
            }

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Rejection workflow failed: {exc}",
            ) from exc

    if ds.get(event_id) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    agent_result = None
    agent_error = None
    if settings.ai_enabled:
        try:
            agent_result = await agent.resume(
                thread_id=f"agent-{event_id}",
                approved=True,
                feedback=body.feedback,
            )
        except Exception as exc:
            agent_error = str(exc)

    try:
        persisted = ds.approve(event_id)
        if persisted is None:
            raise HTTPException(
                status_code=404,
                detail=f"Unknown disruption {event_id}",
            )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Approval failed: {exc}",
        ) from exc

    response = {
        "event_id": event_id,
        "thread_id": (
            agent_result["thread_id"]
            if agent_result
            else f"agent-{event_id}"
        ),
        "approved": True,
        "status": (
            agent_result["state"].get("status")
            if agent_result
            else "approved"
        ),
        "provider": settings.data_provider,
    }
    if agent_error:
        response["fallback_reason"] = agent_error
    return response


@router.get("/{event_id}/state")
async def get_disruption_state(
    event_id: str,
    agent: SupplyAgent = Depends(get_agent),
):
    config = {"configurable": {"thread_id": f"agent-{event_id}"}}
    snapshot = agent.graph.get_state(config)
    if snapshot is None or snapshot.values.get("status") is None:
        raise HTTPException(status_code=404, detail=f"No agent state for disruption {event_id}")
    values = snapshot.values
    return {
        "thread_id": f"agent-{event_id}",
        "company_id": values.get("company_id"),
        "disruption_id": event_id,
        "status": values.get("status"),
        "awaiting_approval": bool(snapshot.next),
        "decision": values.get("decision").model_dump(mode="json") if values.get("decision") else None,
        "narrative": values.get("narrative"),
        "next_nodes": list(snapshot.next),
    }


@router.post("/{event_id}/resolve")
async def resolve_disruption(
    event_id: str,
    identity: dict = Depends(get_current_identity),
    ds: DisruptionService = Depends(get_disruption_service),
):
    resolved = ds.resolve(event_id)

    if resolved is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    return {"event": resolved.model_dump(mode="json")}


@router.delete("/{event_id}")
async def delete_disruption(
    event_id: str,
    ds: DisruptionService = Depends(get_disruption_service),
):
    if ds.get(event_id) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    ds.delete(event_id)

    return {
        "event_id": event_id,
        "deleted": True,
        "provider": settings.data_provider,
    }
