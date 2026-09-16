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

from datetime import datetime
from copy import deepcopy
from ..domain.constants import HealAction
from ..domain.models import (
    DisruptionEvent,
    HealDecision,
    Network,
    RouteAlternative,
    Shipment,
    SplitAllocation,
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
                    penalty = alt.total_time_hours - self._baseline_time(sample, now)
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

        supplier_alts = self._supplier_alternatives(
            shipment,
            network,
            active_events,
            now,
        )

        if supplier_alts and not feasible:
            supplier_id, best_route = supplier_alts[0]
            return HealDecision(
                action=HealAction.SWITCH_SUPPLIER,
                reason=(
                    f"Switch {shipment.id} from supplier {shipment.origin} "
                    f"to {supplier_id}; alternate route takes "
                    f"{best_route.total_time_hours:.1f}h."
                ),
                alternatives=[best_route],
                affected_shipment_ids=[s.id for s in affected],
            )

        if not alts:
            return HealDecision(
                action=HealAction.ESCALATE,
                reason="No path exists between origin and destination. Escalating to a human.",
                affected_shipment_ids=[s.id for s in affected],
            )
        deadline_alts = [
            a for a in alts
            if a.feasibility == "infeasible"
            and any("deadline" in r.lower() for r in a.infeasible_reasons)
        ]

        if deadline_alts:
            best = min(deadline_alts, key=lambda a: a.total_time_hours)
            return HealDecision(
                action=HealAction.EXPEDITE,
                reason=(
                    f"Expedite {shipment.id}: available routes miss the deadline; "
                    f"fastest route takes {best.total_time_hours:.1f}h."
                ),
                alternatives=alts,
                affected_shipment_ids=[s.id for s in affected],
            )
        if len(feasible) >= 2:
            first = feasible[0]
            second = feasible[1]

            first_cargo = shipment.cargo_tons * 0.5
            second_cargo = shipment.cargo_tons - first_cargo

            return HealDecision(
                action=HealAction.SPLIT,
                reason=(
                    f"Split {shipment.id} across {first.route_id} and "
                    f"{second.route_id} to diversify the shipment."
                ),
                alternatives=[first, second],
                split_allocations=[
                    SplitAllocation(
                        shipment_id=shipment.id,
                        route_id=first.route_id,
                        cargo_tons=first_cargo,
                        percentage=50.0,
                    ),
                    SplitAllocation(
                        shipment_id=shipment.id,
                        route_id=second.route_id,
                        cargo_tons=second_cargo,
                        percentage=50.0,
                    ),
                ],
                affected_shipment_ids=[s.id for s in affected],
            )
        if feasible:
            best = feasible[0]
            if best.total_time_hours > self._baseline_time(shipment, now) + 1e-9:
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
        split_candidates = [
            a for a in alts
            if a.feasibility == "feasible"
        ]

        if len(split_candidates) >= 2:
            first = split_candidates[0]
            second = split_candidates[1]

            first_cargo = shipment.cargo_tons * 0.5
            second_cargo = shipment.cargo_tons - first_cargo

            return HealDecision(
                action=HealAction.SPLIT,
                reason=(
                    f"Split {shipment.id} across {first.route_id} and "
                    f"{second.route_id} to diversify the shipment."
                ),
                alternatives=[first, second],
                split_allocations=[
                    SplitAllocation(
                        shipment_id=shipment.id,
                        route_id=first.route_id,
                        cargo_tons=first_cargo,
                        percentage=50.0,
                    ),
                    SplitAllocation(
                        shipment_id=shipment.id,
                        route_id=second.route_id,
                        cargo_tons=second_cargo,
                        percentage=50.0,
                    ),
                ],
                affected_shipment_ids=[s.id for s in affected],
            )
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

    def _baseline_time(
        self,
        shipment: Shipment,
        now: datetime | None = None,
    ) -> float:
        network = self._ns.current([])
        route = self._rs.shortest(network, shipment, [], alpha=0.5)

        if route is not None:
            return route.total_time_hours

        return 24.0

    def _supplier_alternatives(
        self,
        shipment: Shipment,
        network: Network,
        active_events: list[DisruptionEvent],
        now: datetime,
    ) -> list[tuple[str, RouteAlternative]]:
        origin = network.nodes.get(shipment.origin)

        if origin is None or origin.type != "supplier":
            return []

        results: list[tuple[str, RouteAlternative]] = []

        for supplier in network.nodes.values():
            if supplier.type != "supplier" or supplier.id == origin.id:
                continue
            if supplier.status == "offline":
                continue

            candidate = deepcopy(shipment)
            candidate.origin = supplier.id

            alternatives = self._rs.alternatives(
                network,
                candidate,
                active_events,
                now=now,
            )

            route = next(
                (
                    alternative
                    for alternative in alternatives
                    if alternative.feasibility == "feasible"
                ),
                None,
            )
            if route is not None:
                results.append((supplier.id, route))

        return sorted(results, key=lambda x: x[1].total_time_hours)

def _priority_rank(s: Shipment) -> int:
    return {"low": 0, "standard": 1, "high": 2, "critical": 3}[s.priority]
