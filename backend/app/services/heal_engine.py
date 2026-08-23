"""Deterministic heal engine — the decision table.

Priority order (first matching rule wins):
  1. ESCALATE      — element unknown, or no alternative exists at all
  2. WAIT_HOLD     — disruption ends sooner than the reroute penalty
  3. REROUTE       — a feasible alternative path exists
  4. SWITCH_SUPPLIER — no path, but a sibling supplier exists
  5. EXPEDITE      — path exists but misses the deadline; mode upgrade may fix
  6. SPLIT         — no single feasible path, but two combined could fit
  7. ESCALATE      — fallback: human intervention required

Deterministic on purpose: reproducible demos, testable branches, and the
LLM only narrates the decision — it never makes it.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from ..domain.constants import HealAction
from ..domain.models import (
    DisruptionEvent,
    HealDecision,
    Network,
    RouteAlternative,
    Shipment,
)
from ..services.network_service import NetworkService
from ..services.routing_service import RoutingService


class HealEngine:
    def __init__(self, network_service: NetworkService, routing_service: RoutingService) -> None:
        self._ns = network_service
        self._rs = routing_service

    def decide(
        self,
        event: DisruptionEvent,
        active_events: list[DisruptionEvent],
        now: datetime | None = None,
    ) -> HealDecision:
        now = now or datetime.now().astimezone()
        network = self._ns.current(active_events)
        affected = self._ns.find_affected_shipments(event, network)

        if not affected:
            return HealDecision(
                action=HealAction.REROUTE,
                reason="Disruption registered; no active shipments touch the element.",
            )

        # Rule 1: wait-hold when the closure is shorter than the reroute penalty.
        if event.expected_end is not None:
            wait_hours = (event.expected_end - now).total_seconds() / 3600.0
            if wait_hours > 0:
                sample = affected[0]
                alt = self._rs.shortest(network, sample, active_events)
                if alt is not None:
                    penalty = alt.total_time_hours - _baseline_time(sample)
                    if wait_hours < penalty:
                        return HealDecision(
                            action=HealAction.WAIT_HOLD,
                            reason=(
                                f"Closure clears in {wait_hours:.1f}h, cheaper than "
                                f"rerouting ({penalty:.1f}h extra). Hold position."
                            ),
                            wait_hours=round(wait_hours, 1),
                            affected_shipment_ids=[s.id for s in affected],
                        )

        # Rules 2-6: per shipment, pick the best single action.
        shipment = max(affected, key=lambda s: _priority_rank(s))
        alts = self._rs.alternatives(network, shipment, active_events, now=now)
        feasible = [a for a in alts if a.feasibility == "feasible"]

        if not alts:
            return HealDecision(
                action=HealAction.ESCALATE,
                reason="No path exists between origin and destination. Escalating to a human.",
                affected_shipment_ids=[s.id for s in affected],
            )

        if feasible:
            best = feasible[0]
            if best.total_time_hours > _baseline_time(shipment) + 1e-9:
                return HealDecision(
                    action=HealAction.REROUTE,
                    reason=(
                        f"Reroute {shipment.id} via {best.path[0]}→{best.path[-1]} "
                        f"(+{best.delta_time_hours or 0}h, "
                        f"+{best.delta_cost_per_ton or 0}/ton vs baseline)."
                    ),
                    alternatives=feasible,
                    affected_shipment_ids=[s.id for s in affected],
                )
            return HealDecision(
                action=HealAction.REROUTE,
                reason="Recomputed plan is optimal; no change required.",
                alternatives=feasible,
                affected_shipment_ids=[s.id for s in affected],
            )

        # No feasible path: escalate (prototype) — supplier switch/expedite/
        # split are the documented extension points.
        return HealDecision(
            action=HealAction.ESCALATE,
            reason=(
                f"No alternative meets {shipment.id}'s deadline/budget "
                f"({shipment.deadline.isoformat(timespec='minutes')}, "
                f"{shipment.budget_per_ton}/ton). Escalating to a human."
            ),
            alternatives=alts,
            affected_shipment_ids=[s.id for s in affected],
        )


def _baseline_time(shipment: Shipment) -> float:
    # Prototype baseline: direct great-circle proxy. Replaced by the
    # pre-disruption planned route in the full implementation.
    return 24.0


def _priority_rank(s: Shipment) -> int:
    return {"low": 0, "standard": 1, "high": 2, "critical": 3}[s.priority]
