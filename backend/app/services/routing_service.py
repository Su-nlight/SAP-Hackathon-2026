"""Routing service: composite-weight pathfinding + alternatives + deltas."""
from __future__ import annotations

from datetime import datetime

from ..domain.models import (
    DisruptionEvent,
    Network,
    RouteAlternative,
    Shipment,
)
from ..engine.base import GraphEngine
from ..engine.constraints import filter_feasible


class RoutingService:
    def __init__(self, engine: GraphEngine) -> None:
        self._engine = engine

    def alternatives(
        self,
        network: Network,
        shipment: Shipment,
        active_events: list[DisruptionEvent],
        now: datetime | None = None,
        k: int = 3,
        alpha: float = 0.5,
    ) -> list[RouteAlternative]:
        """Top-k paths with feasibility flags and deltas vs. the best path."""
        raw = self._engine.k_shortest_paths(
            network, shipment.origin, shipment.destination,
            active_events, k=k, alpha=alpha,
        )
        raw = filter_feasible(raw, shipment, now or datetime.now().astimezone())

        # Deltas vs the first (lowest-weight) alternative.
        if raw:
            base_time = raw[0].total_time_hours
            base_cost = raw[0].total_cost_per_ton
            for alt in raw:
                alt.delta_time_hours = round(alt.total_time_hours - base_time, 2)
                alt.delta_cost_per_ton = round(alt.total_cost_per_ton - base_cost, 2)
        return raw

    def shortest(
        self,
        network: Network,
        shipment: Shipment,
        active_events: list[DisruptionEvent],
        alpha: float = 0.5,
    ) -> RouteAlternative | None:
        return self._engine.shortest_path(
            network, shipment.origin, shipment.destination,
            active_events, alpha=alpha,
        )
