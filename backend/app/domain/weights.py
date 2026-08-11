"""Composite edge weight and disruption multipliers.

weight = a*cost + b*time + c*risk + d*emissions   (a+b+c+d = 1)
where each term is normalized to 0..1.
"""
from __future__ import annotations

from .constants import Severity
from .models import DisruptionEvent, Edge

# Delay multiplier for a fully offline element — effectively infinite cost.
OFFLINE_MULTIPLIER = 1e6


def normalized_time(edge: Edge, base_hours: float | None = None) -> float:
    """Time term normalized against a 1000h ceiling (worst sea+rail corridors)."""
    return min((base_hours or edge.base_time_hours) / 1000.0, 1.0)


def normalized_cost(edge: Edge) -> float:
    """Cost term normalized against $200/ton ceiling (air freight worst case)."""
    return min(edge.base_cost_per_ton / 200.0, 1.0)


def normalized_risk(edge: Edge) -> float:
    """Risk term from reliability (1 - reliability), floor 0.05."""
    return max(1.0 - edge.reliability, 0.05)


def normalized_co2(edge: Edge) -> float:
    """CO2 term normalized against 1.5 kg/ton-km ceiling (air freight)."""
    return min(edge.co2_per_ton_km / 1.5, 1.0)


def disruption_multipliers(
    edge: Edge,
    active_events: list[DisruptionEvent],
) -> tuple[float, float, float]:
    """Return (time_mult, cost_mult, capacity_factor) for this edge.

    Disruptions may target the edge directly or its endpoints (ports,
    airports, factories, warehouses...). A fully offline element gets
    OFFLINE_MULTIPLIER on time AND cost; partial disruption scales time
    by (1 + impact_delay_hours / base_time) and cost by the inverse of
    the residual capacity factor.
    """
    time_mult = 1.0
    cost_mult = 1.0
    cap_factor = 1.0

    for ev in active_events:
        if not ev.is_active_at():
            continue
        hits_edge = ev.target_type == "edge" and ev.target_id == edge.id
        hits_endpoint = ev.target_type == "node" and ev.target_id in (edge.source, edge.target)
        if not (hits_edge or hits_endpoint):
            continue

        if ev.severity == Severity.FULL:
            time_mult *= OFFLINE_MULTIPLIER
            cost_mult *= OFFLINE_MULTIPLIER
        else:
            time_mult *= 1.0 + (ev.impact_delay_hours / max(edge.base_time_hours, 1.0))
            cap_factor = min(cap_factor, ev.capacity_factor)
            cost_mult *= 1.0 / max(cap_factor, 0.05)

    return time_mult, cost_mult, cap_factor


def composite_weight(
    edge: Edge,
    active_events: list[DisruptionEvent],
    alpha: float = 0.5,
    beta: float = 0.3,
    gamma: float = 0.1,
    delta: float = 0.1,
) -> tuple[float, float, float]:
    """Return (weight, time_hours, cost_per_ton) with disruption applied."""
    time_mult, cost_mult, _ = disruption_multipliers(edge, active_events)

    eff_time = edge.base_time_hours * time_mult
    eff_cost = edge.base_cost_per_ton * cost_mult

    if time_mult >= OFFLINE_MULTIPLIER:
        # Fully offline: weight must dwarf any finite path.
        return OFFLINE_MULTIPLIER * 10.0, eff_time, eff_cost

    w = (
        alpha * normalized_cost(edge) * cost_mult
        + beta * normalized_time(edge) * time_mult
        + gamma * normalized_risk(edge)
        + delta * normalized_co2(edge)
    )
    return w, eff_time, eff_cost


def is_offline(edge: Edge, active_events: list[DisruptionEvent]) -> bool:
    time_mult, _, _ = disruption_multipliers(edge, active_events)
    return time_mult >= OFFLINE_MULTIPLIER
