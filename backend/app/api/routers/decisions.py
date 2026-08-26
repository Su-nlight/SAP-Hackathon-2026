"""Decision archive endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ...services.decision_archive_service import DecisionArchiveService
from ..deps import get_current_identity, get_decision_archive_service

router = APIRouter(prefix="/v1/decisions", tags=["decisions"])


@router.get("")
async def list_decisions(
    identity: dict = Depends(get_current_identity),
    archive: DecisionArchiveService = Depends(get_decision_archive_service),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    company_id = identity.get("company_id", "acme")

    if not archive._path.exists():
        return {"decisions": []}

    records = []
    with archive._path.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                import json
                data = json.loads(line)
                if data.get("company_id") == company_id:
                    records.append(data)
            except Exception:
                continue

    records = records[-limit:]
    records.reverse()

    return {"decisions": records}