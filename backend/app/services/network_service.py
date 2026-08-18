"""Network service: derived state + affected-shipment detection."""
from __future__ import annotations

from ..domain.models import DisruptionEvent, Network, Shipment
from ..store.network_store import NetworkStore


class NetworkService:
    def __init__(self, store: NetworkStore, shipments: list[Shipment]) -> None:
        self._store = store
        self._shipments = {s.id: s for s in shipments}

    @property
    def shipments(self) -> dict[str, Shipment]:
        return self._shipments

    def current(self, events: list[DisruptionEvent]) -> Network:
        return self._store.current(events)

    def find_affected_shipments(
        self, event: DisruptionEvent, current: Network
    ) -> list[Shipment]:
        """Shipments whose current planned path touches the disrupted element.

        In the prototype the 'current plan' is approximated as any
        shipment that either originates/destines at the target node, or
        whose origin/destination pair has no route avoiding the element
        (i.e. the element is a cut). For the demo the first rule is the
        workhorse; the cut rule makes open-ended closures meaningful.
        """
        hits: list[Shipment] = []
        for s in self._shipments.values():
            if event.target_type == "node" and event.target_id in (s.origin, s.destination):
                hits.append(s)
        return hits
