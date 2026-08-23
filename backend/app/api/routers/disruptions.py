"""Disruption endpoints: lifecycle, approval, raw-text ingestion."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
# from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from ...ai.agent.graph import SupplyAgent
from ...config import settings
from ...domain.models import DisruptionEvent
from ...sap.service import SapService
from ...services.disruption_service import DisruptionService
from ..deps import get_agent, get_disruption_service, get_sap_service

router = APIRouter(prefix="/v1/disruptions", tags=["disruptions"])


class RawAlertIn(BaseModel):
    company_id: str = "acme"
    raw_text: str = Field(min_length=3)


class ApprovalIn(BaseModel):
    approved: bool = True
    feedback: str | None = None


@router.post("", status_code=201)
async def create_disruption(
    body: DisruptionEvent,
    ds: DisruptionService = Depends(get_disruption_service),
    sap: SapService = Depends(get_sap_service),
    agent: SupplyAgent = Depends(get_agent),
):
    """Register a structured disruption event (mirrored to S/4HANA if connected)."""
    try:
        event = ds.register(body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    BackgroundTasks.add_task(sap.mirror_event, event, action="created")

    agent_result = None
    agent_error = None
    if settings.ai_enabled:
        try:
            agent_result = await agent.run(
                company_id="default",
                raw_alert=f"Disruption type: {event.type.value}, target: {event.target_id}",
                thread_id=f"agent-{event.id}",
                disruption_id=event.id,
            )
        # except Exception as exc:  # LLM/network failure shouldn't fail the whole request
        #     agent_error = str(exc)
        except Exception as exc:
            import traceback
            agent_error = f"{type(exc).__module__}.{type(exc).__name__}: {exc!r}"
            print(traceback.format_exc())  # full traceback to your server console

    return {
        "event": event.model_dump(mode="json"),
        "agent": agent_result,
        "agent_error": agent_error,
    }


@router.post("/ingest")
async def ingest_raw_alert(
    body: RawAlertIn,
    agent: SupplyAgent = Depends(get_agent),
):
    """Ingest a raw alert; the LangGraph agent parses + assesses + recommends."""
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=503,
            detail="AI disabled (AI_ENABLED=false). Use POST /v1/disruptions with a structured event.",
        )
    event_id = f"d-{uuid.uuid4().hex[:8]}"
    result = await agent.run(
        company_id=body.company_id,
        raw_alert=body.raw_text,
        thread_id=f"agent-{event_id}",
        disruption_id=event_id,
    )
    return {
        "thread_id": result["thread_id"],
        "disruption_id": event_id,
        "awaiting_approval": result["awaiting_approval"],
        "narrative": result["state"].get("narrative"),
        "decision": (
            result["state"]["decision"].model_dump(mode="json")
            if result["state"].get("decision")
            else None
        ),
    }


@router.get("")
async def list_disruptions(
    status: str | None = Query(default=None, pattern="^(active|resolved)$"),
    ds: DisruptionService = Depends(get_disruption_service),
):
    events = ds.active() if status == "active" else (
        [e for e in ds._log.all() if e.status.value == "resolved"] if status == "resolved"
        else ds._log.all()
    )
    return {"disruptions": [e.model_dump(mode="json") for e in events]}


@router.get("/{event_id}")
async def get_disruption(
    event_id: str,
    ds: DisruptionService = Depends(get_disruption_service),
):
    event = ds._log.get(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail=f"Unknown disruption {event_id}")
    return {"event": event.model_dump(mode="json")}


@router.post("/{event_id}/approve")
async def approve_disruption(
    event_id: str,
    body: ApprovalIn,
    agent: SupplyAgent = Depends(get_agent),
):
    """Resume the agent graph: approve (or reject with feedback) the plan."""
    if not settings.ai_enabled:
        raise HTTPException(status_code=503, detail="AI disabled.")
    result = await agent.resume(
        thread_id=f"agent-{event_id}",
        approved=body.approved,
        feedback=body.feedback,
    )
    return {
        "thread_id": result["thread_id"],
        "approved": body.approved,
        "status": result["state"].get("status"),
    }


@router.get("/{event_id}/state")
async def get_disruption_state(
    event_id: str,
    agent: SupplyAgent = Depends(get_agent),
):
    """Get the LangGraph agent state for this disruption's thread."""
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


@router.delete("/{event_id}")
async def resolve_disruption(
    event_id: str,
    ds: DisruptionService = Depends(get_disruption_service),
    sap: SapService = Depends(get_sap_service),
):
    """Resolve a disruption — rolls back effects, emits network.healed."""
    resolved = ds.resolve(event_id)
    if resolved is None:
        raise HTTPException(status_code=404, detail=f"Unknown disruption {event_id}")
    BackgroundTasks.add_task( sap.mirror_event, resolved, action="resolved" )  # fire-and-forget
    return {"event": resolved.model_dump(mode="json")}