"""Constraint filtering for route alternatives: deadline, budget, capacity."""
from __future__ import annotations

from datetime import datetime

from ..domain.models import RouteAlternative, Shipment


def feasible(
    alt: RouteAlternative,
    shipment: Shipment,
    now: datetime,
) -> tuple[bool, list[str]]:
    """Check a route against deadline and budget. Returns (ok, reasons)."""
    reasons: list[str] = []

    if shipment.deadline is not None:
        arrival = now + _hours(alt.total_time_hours)
        if arrival > shipment.deadline:
            reasons.append(
                f"arrives {arrival.isoformat(timespec='minutes')} "
                f"past deadline {shipment.deadline.isoformat(timespec='minutes')}"
            )

    if alt.total_cost_per_ton > shipment.budget_per_ton:
        reasons.append(
            f"cost {alt.total_cost_per_ton:.2f}/ton exceeds budget "
            f"{shipment.budget_per_ton:.2f}/ton"
        )

    return (not reasons, reasons)


def _hours(h: float) -> object:
    from datetime import timedelta

    return timedelta(hours=h)


def filter_feasible(
    alternatives: list[RouteAlternative],
    shipment: Shipment,
    now: datetime,
) -> list[RouteAlternative]:
    """Mark each alternative feasible/infeasible against constraints."""
    out: list[RouteAlternative] = []
    for alt in alternatives:
        ok, reasons = feasible(alt, shipment, now)
        alt.feasibility = "feasible" if ok else "infeasible"
        alt.infeasible_reasons = reasons
        out.append(alt)
    return out
