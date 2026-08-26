"""Disruption endpoints: lifecycle, approval, raw-text ingestion."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ...ai.agent.graph import SupplyAgent
from ...config import settings
from ...domain.constants import DisruptionType, HealAction, Severity
from ...domain.models import DisruptionEvent, HealDecision
from ...sap.service import SapService
from ...services.disruption_service import DisruptionService
from ..deps import get_agent, get_current_identity, get_disruption_service, get_sap_service

router = APIRouter(prefix="/v1/disruptions", tags=["disruptions"])


class RawAlertIn(BaseModel):
    raw_text: str = Field(min_length=3)


class ApprovalIn(BaseModel):
    approved: bool = True
    feedback: str | None = None


@router.post("", status_code=201)
async def create_disruption(
    body: DisruptionEvent,
    background_tasks: BackgroundTasks,
    identity: dict = Depends(get_current_identity),
    ds: DisruptionService = Depends(get_disruption_service),
    sap: SapService = Depends(get_sap_service),
    agent: SupplyAgent = Depends(get_agent),
):
    try:
        event = ds.register(body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    company_id = identity.get("company_id", "acme")

    if settings.data_provider == "sap":
        background_tasks.add_task(
            sap.mirror_event,
            event,
            company_id=company_id,
            action="created",
        )

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
                "disruption_id": event_id,
                "awaiting_approval": result.get("awaiting_approval", True),
                "narrative": result["state"].get("narrative"),
                "decision": (
                    result["state"]["decision"].model_dump(mode="json")
                    if result["state"].get("decision")
                    else None
                ),
            }
        except Exception as exc:
            print(f"[ingest_raw_alert] AI agent run failed ({exc}), activating fallback")

    text = body.raw_text.lower()
    if "suez" in text:
        target_id = "E-SUEZ"
        target_type = "edge"
    elif "singapore" in text:
        target_id = "N-SINGAPORE"
        target_type = "node"
    elif "shanghai" in text:
        target_id = "N-SHANGHAI"
        target_type = "node"
    else:
        target_id = "N-ROTTERDAM"
        target_type = "node"

    if target_type == "node":
        dtype = DisruptionType.PORT_CLOSURE if ("closed" in text or "blocked" in text) else DisruptionType.PORT_CONGESTION
    else:
        dtype = DisruptionType.BLOCKAGE

    severity = Severity.FULL if any(k in text for k in ["severe", "complete", "emergency", "blocked"]) else Severity.PARTIAL

    try:
        fallback_event = DisruptionEvent(
            id=event_id,
            type=dtype,
            target_type=target_type,
            target_id=target_id,
            severity=severity,
            start_time=datetime.now(timezone.utc),
            raw_text=body.raw_text,
        )
        ds.register(fallback_event)
    except Exception as reg_err:
        print(f"[ingest_raw_alert] Could not register fallback event: {reg_err}")

    fallback_decision = HealDecision(
        action=HealAction.REROUTE,
        target_id=target_id,
        reason=f"Automated fallback strategy for {dtype.value} on {target_id}",
        affected_shipment_ids=[],
    )

    return {
        "thread_id": f"agent-{event_id}",
        "disruption_id": event_id,
        "awaiting_approval": True,
        "narrative": f"Identified {severity.value} {dtype.value} at {target_id}. Heuristic engine recommended rerouting affected shipments.",
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
    sap: SapService = Depends(get_sap_service),
):
    if not body.approved:
        raise HTTPException(
            status_code=400,
            detail="Rejection workflow is not implemented yet.",
        )

    if ds.get(event_id) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    if settings.ai_enabled:
        try:
            result = await agent.resume(
                thread_id=f"agent-{event_id}",
                approved=True,
                feedback=body.feedback,
            )

            return {
                "event_id": event_id,
                "thread_id": result["thread_id"],
                "approved": True,
                "status": result["state"].get("status"),
                "provider": settings.data_provider,
            }

        except Exception as exc:
            try:
                if settings.data_provider == "sap":
                    sap.approve_disruption(event_id)
                else:
                    ds.approve(event_id)

                return {
                    "event_id": event_id,
                    "thread_id": f"agent-{event_id}",
                    "approved": True,
                    "status": "approved",
                    "provider": settings.data_provider,
                    "fallback_reason": str(exc),
                }

            except Exception as fallback_exc:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"AI approval failed: {exc}; "
                        f"fallback approval failed: {fallback_exc}"
                    ),
                ) from fallback_exc

    try:
        if settings.data_provider == "sap":
            sap.approve_disruption(event_id)
        else:
            ds.approve(event_id)

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Approval failed: {exc}",
        ) from exc

    return {
        "event_id": event_id,
        "approved": True,
        "status": "approved",
        "provider": settings.data_provider,
    }


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
    background_tasks: BackgroundTasks,
    identity: dict = Depends(get_current_identity),
    ds: DisruptionService = Depends(get_disruption_service),
    sap: SapService = Depends(get_sap_service),
):
    resolved = ds.resolve(event_id)

    if resolved is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    company_id = identity.get("company_id", "acme")

    if settings.data_provider == "sap":
        background_tasks.add_task(
            sap.mirror_event,
            resolved,
            company_id=company_id,
            action="resolved",
        )

    return {"event": resolved.model_dump(mode="json")}


@router.delete("/{event_id}")
async def delete_disruption(
    event_id: str,
    ds: DisruptionService = Depends(get_disruption_service),
    sap: SapService = Depends(get_sap_service),
):
    if ds.get(event_id) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    if settings.data_provider == "sap":
        try:
            sap.delete_disruption(event_id)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"SAP deletion failed: {exc}",
            ) from exc
    else:
        ds.delete(event_id)

    return {
        "event_id": event_id,
        "deleted": True,
        "provider": settings.data_provider,
    }
