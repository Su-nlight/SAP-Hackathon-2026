"""Network endpoints: health snapshot + full graph for the dashboard.

When the SAP bridge is connected, /v1/network/graph merges S/4HANA
master-data nodes (Global Bike plants + customers) into the graph as
routable nodes with road-feeder edges, so the dashboard shows the live
ERP network on top of the corridor seed.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ...config import settings
from ...sap.service import SapService
from ...services.disruption_service import DisruptionService
from ...services.network_service import NetworkService
from ..deps import get_disruption_service, get_network_service, get_sap_service

router = APIRouter(prefix="/v1/network", tags=["network"])


@router.get("/health")
async def network_health(
    ds: DisruptionService = Depends(get_disruption_service),
    ns: NetworkService = Depends(get_network_service),
    sap: SapService = Depends(get_sap_service),
):
    current = ds.current_network()
    active = ds.active()
    offline_nodes = [n for n in current.nodes.values() if n.status == "offline"]
    offline_edges = [e for e in current.edges.values() if e.status == "offline"]
    sap_status = sap.status()
    return {
        "node_count": len(current.nodes),
        "edge_count": len(current.edges),
        "active_disruptions": len(active),
        "disruption_ids": [e.id for e in active],
        "offline_nodes": [n.id for n in offline_nodes],
        "offline_edges": [e.id for e in offline_edges],
        "healthy": not (offline_nodes or offline_edges),
        "sap": {
            "connected": sap_status["sap_connected"],
            "provider": sap_status["provider"],
            "last_sync": sap_status["last_sync"],
            "plants": sap_status["plants"],
            "customers": sap_status["customers"],
        },
    }


@router.get("/graph")
async def network_graph(
    ds: DisruptionService = Depends(get_disruption_service),
    sap: SapService = Depends(get_sap_service),
):
    """Full current graph: nodes + edges + status, for the frontend renderer.

    ?sap=0 disables the S/4HANA merge (useful for pure-seed demos).
    """
    current = ds.current_network()
    if settings.sap_merge_nodes:
        current = sap.merge_into(current)
    return {
        "nodes": [
            {
                "id": n.id, "name": n.name, "type": n.type.value,
                "lat": n.location.lat, "lon": n.location.lon,
                "status": n.status, "metadata": n.metadata,
            }
            for n in current.nodes.values()
        ],
        "edges": [
            {
                "id": e.id, "source": e.source, "target": e.target,
                "mode": e.mode.value, "status": e.status,
            }
            for e in current.edges.values()
        ],
    }
