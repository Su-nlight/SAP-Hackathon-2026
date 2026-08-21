"""LangChain tools bound to the real services — one implementation, two surfaces.

The REST API and the agent call the exact same service code. The LLM
never computes a path; it only reads engine output through these tools.
"""
from __future__ import annotations

from langchain_core.tools import tool

from ...domain.models import DisruptionEvent
from ...services.network_service import NetworkService
from ...services.routing_service import RoutingService


def build_tools(network_service: NetworkService, routing_service: RoutingService) -> list:
    ns = network_service
    rs = routing_service

    @tool
    def get_network_health() -> dict:
        """Return the current network health: node/edge counts and status."""
        current = ns.current([])
        offline_nodes = [n for n in current.nodes.values() if n.status == "offline"]
        offline_edges = [e for e in current.edges.values() if e.status == "offline"]
        return {
            "nodes": len(current.nodes),
            "edges": len(current.edges),
            "offline_nodes": [n.id for n in offline_nodes],
            "offline_edges": [e.id for e in offline_edges],
        }

    @tool
    def find_affected_shipments(target_type: str, target_id: str) -> list[dict]:
        """Find shipments affected by a disruption on a node or edge."""
        ev = DisruptionEvent(
            id="_tool", type="BLOCKAGE", target_type=target_type,
            target_id=target_id, severity="full",
            start_time=None,  # type: ignore[arg-type]  # placeholder, unused below
        )
        current = ns.current([])
        ships = ns.find_affected_shipments(ev, current)
        return [s.model_dump(mode="json") for s in ships]

    @tool
    def compute_alternatives(
        shipment_id: str, k: int = 3
    ) -> list[dict]:
        """Compute top-k route alternatives for a shipment (real engine call)."""
        shipment = ns.shipments.get(shipment_id)
        if shipment is None:
            return [{"error": f"unknown shipment {shipment_id}"}]
        current = ns.current([])
        alts = rs.alternatives(current, shipment, [], k=k)
        return [a.model_dump(mode="json") for a in alts]

    return [get_network_health, find_affected_shipments, compute_alternatives]
