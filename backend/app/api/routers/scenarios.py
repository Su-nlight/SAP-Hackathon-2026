"""Scenario endpoints: list + replay canned disruption playbooks."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...services.scenario_service import ScenarioService
from ..deps import get_scenario_service

router = APIRouter(prefix="/v1/scenarios", tags=["scenarios"])


class RunIn(BaseModel):
    scenario_id: str


@router.get("")
async def list_scenarios(svc: ScenarioService = Depends(get_scenario_service)):
    return {"scenarios": svc.list_scenarios()}


@router.post("/run")
async def run_scenario(
    body: RunIn,
    svc: ScenarioService = Depends(get_scenario_service),
):
    try:
        return await svc.run(body.scenario_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
