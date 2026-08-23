"""Routing endpoints: optimize a shipment under the current network state."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ...domain.models import Shipment
from ...services.disruption_service import DisruptionService
from ...services.routing_service import RoutingService
from ..deps import get_disruption_service, get_routing_service

router = APIRouter(prefix="/v1/routes", tags=["routes"])


class OptimizeIn(BaseModel):
    shipment: Shipment
    k: int = Field(default=3, ge=1, le=5)


@router.post("/optimize")
async def optimize_route(
    body: OptimizeIn,
    rs: RoutingService = Depends(get_routing_service),
    ds: DisruptionService = Depends(get_disruption_service),
):
    """Compute top-k alternatives for a shipment given live disruptions."""
    current = ds.current_network()
    alts = rs.alternatives(current, body.shipment, ds.active(), now=datetime.now().astimezone(), k=body.k)
    return {
        "shipment_id": body.shipment.id,
        "active_disruptions": [e.id for e in ds.active()],
        "alternatives": [a.model_dump(mode="json") for a in alts],
    }

