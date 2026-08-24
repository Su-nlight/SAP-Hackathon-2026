"""Disruption endpoints: lifecycle, approval, raw-text ingestion."""
from __future__ import annotations

import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
# from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from ...ai.agent.graph import SupplyAgent
from ...config import settings
from ...domain.models import DisruptionEvent
from ...sap.service import SapService
from ...services.disruption_service import DisruptionService
from ..deps import get_agent, get_disruption_service, get_sap_service
from ...sap.base import SapDisruptionRow
from ...sap.http_provider import SapConnectionError

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
    sap: SapService = Depends(get_sap_service),
):
    try:
        row = SapDisruptionRow(
            event_id=body.id,
            company_id="acme",
            disrupt_type=body.type.value,
            target_type=body.target_type,
            target_node=body.target_id,
            severity=body.severity.value,
            status="new",
            start_ts=(
                body.start_time.isoformat()
                if body.start_time
                else None
            ),
            end_ts=(
                body.expected_end.isoformat()
                if body.expected_end
                else None
            ),
            created_by=settings.sap_username,
            payload_json=json.dumps(
                body.model_dump(mode="json"),
                default=str,
            )[:255],
        )

        created = sap.create_disruption(row)

        return {
            "message": "Disruption created in SAP",
            "event": {
                "id": created.event_id,
                "company_id": created.company_id,
                "type": created.disrupt_type,
                "target_type": created.target_type,
                "target_id": created.target_node,
                "severity": created.severity,
                "status": created.status,
                "start_time": created.start_ts,
                "expected_end": created.end_ts,
                "created_by": created.created_by,
                "payload_json": created.payload_json,
            },
        }

    except SapConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail = f"SAP connection failed: {exc}",
        ) from exc

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
    status: str | None = Query(default=None, pattern="^(new|pending|approved|rejected|resolved)$"),
    sap: SapService = Depends(get_sap_service),
):
    try:
        rows = sap._provider.list_disruptions()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"SAP connection failed: {exc}",
        ) from exc

    if status:
        rows = [row for row in rows if row.status == status]

    return {
        "disruptions": [
            {
                "id": row.event_id,
                "company_id": row.company_id,
                "type": row.disrupt_type,
                "target_type": row.target_type,
                "target_id": row.target_node,
                "severity": row.severity,
                "status": row.status,
                "start_time": row.start_ts,
                "expected_end": row.end_ts,
                "created_at": row.created_at,
                "created_by": row.created_by,
                "approved_by": row.approved_by,
                "payload_json": row.payload_json,
            }
            for row in rows
        ]
    }
@router.get("/{event_id}")
async def get_disruption(
    event_id: str,
    sap: SapService = Depends(get_sap_service),
):
    try:
        rows = sap._provider.list_disruptions()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"SAP connection failed: {exc}",
        ) from exc

    row = next(
        (r for r in rows if r.event_id == event_id),
        None,
    )

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown disruption {event_id}",
        )

    return {
        "event": {
            "id": row.event_id,
            "company_id": row.company_id,
            "type": row.disrupt_type,
            "target_type": row.target_type,
            "target_id": row.target_node,
            "severity": row.severity,
            "status": row.status,
            "start_time": row.start_ts,
            "expected_end": row.end_ts,
            "created_at": row.created_at,
            "created_by": row.created_by,
            "approved_by": row.approved_by,
            "payload_json": row.payload_json,
        }
    }

@router.post("/{event_id}/approve")
async def approve_disruption(
    event_id: str,
    body: ApprovalIn,
    sap: SapService = Depends(get_sap_service),
):
    if not body.approved:
        raise HTTPException(
            status_code=400,
            detail="SAP approval endpoint currently supports approval only.",
        )

    try:
        success = sap.approve_disruption(event_id)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="SAP approval failed.",
            )

        return {
            "message": "Disruption approved in SAP",
            "event_id": event_id,
            "approved": True,
            "status": "approved",
        }

    except SapConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"SAP connection failed: {exc}",
        ) from exc


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
    sap: SapService = Depends(get_sap_service),
):
    try:
        success = sap.resolve_disruption(event_id)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="SAP resolve operation failed.",
            )

        return {
            "message": "Disruption resolved in SAP",
            "event_id": event_id,
            "status": "resolved",
        }

    except SapConnectionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"SAP connection failed: {exc}",
        ) from exc