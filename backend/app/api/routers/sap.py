"""SAP bridge endpoints: status, sync, master data, mirror, approvals."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ...domain.models import DisruptionEvent
from ...sap.service import SapService
from ...services.disruption_service import DisruptionService
from ..deps import get_disruption_service, get_sap_service

router = APIRouter(prefix="/v1/sap", tags=["sap"])


@router.get("/status")
async def sap_status(sap: SapService = Depends(get_sap_service)):
    """Bridge health: connected?, provider, last sync, sync stats."""
    return sap.status()


@router.post("/sync")
async def sap_sync(sap: SapService = Depends(get_sap_service)):
    """Force a pull of S/4HANA master data + mirrored disruptions."""
    result = sap.sync()
    return {
        "ok": result.ok,
        "connected": result.connected,
        "provider": result.provider,
        "pulled_at": result.pulled_at.isoformat() if result.pulled_at else None,
        "plants": result.plants,
        "customers": result.customers,
        "materials": result.materials,
        "disruptions_mirrored": result.disruptions_mirrored,
        "error": result.error,
    }


@router.get("/network")
async def sap_network(sap: SapService = Depends(get_sap_service)):
    """Raw master data as fetched from S/4HANA (plants, customers, materials)."""
    return {
        "nodes": [
            {
                "id": n.id, "name": n.name, "kind": n.kind,
                "city": n.city, "country": n.country,
                "lat": n.lat, "lon": n.lon,
                "merged": n.lat is not None,
            }
            for n in sap.raw_nodes()
        ],
        "materials": [
            {
                "material": m.material, "description": m.description,
                "uom": m.uom, "weight_kg": m.weight_kg,
                "total_stock": m.total_stock,
            }
            for m in sap.raw_materials()
        ],
    }


@router.get("/disruptions")
async def sap_disruptions(sap: SapService = Depends(get_sap_service)):
    """Rows currently in ZHEAL_DISRUPTIONS (the SAP-side mirror)."""
    if sap.status()["provider"] == "offline":
        return {"disruptions": [], "note": "SAP bridge offline"}
    return {"disruptions": [r.__dict__ for r in sap._provider.list_disruptions()]}


@router.post("/disruptions/mirror")
async def sap_mirror_disruption(
    body: DisruptionEvent,
    sap: SapService = Depends(get_sap_service),
):
    """Mirror a single disruption into ZHEAL_DISRUPTIONS."""
    ok = sap.mirror_event(body, action="created")
    if not ok:
        raise HTTPException(status_code=503, detail="SAP bridge offline or unreachable")
    return {"mirrored": True, "event_id": body.id}


@router.post("/pull-approvals")
async def sap_pull_approvals(
    sap: SapService = Depends(get_sap_service),
    ds: DisruptionService = Depends(get_disruption_service),
):
    """Approve local events whose mirror row was approved inside SAP (ALV)."""
    if sap.status()["provider"] == "offline":
        return {"approved": [], "note": "SAP bridge offline"}
    from ..deps import log

    approved = sap.pull_approvals(log, ds)
    return {"approved": approved}
