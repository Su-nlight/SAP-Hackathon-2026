"""In-memory network store: seed network + derived current state."""
from __future__ import annotations

import threading

from ..domain.models import DisruptionEvent, Network


class NetworkStore:
    def __init__(self, seed: Network):
        self._seed = seed
        self._lock = threading.Lock()

    @property
    def seed(self) -> Network:
        return self._seed

    def current(self, active_events: list[DisruptionEvent]) -> Network:
        """Derive current state: seed topology + status flags from events.

        Nodes/edges targeted by a FULL disruption are marked offline;
        PARTIAL disruptions mark them degraded. Topology is unchanged —
        weights are computed on the fly by the engine.
        """
        offline: set[str] = set()
        degraded: set[str] = set()
        for ev in active_events:
            if not ev.is_active_at():
                continue
            if ev.severity == "full":
                offline.add(ev.target_id)
            else:
                degraded.add(ev.target_id)

        nodes = {
            nid: n.model_copy(update={
                "status": "offline" if nid in offline
                else ("degraded" if nid in degraded else n.status),
            })
            for nid, n in self._seed.nodes.items()
        }
        edges = {
            eid: e.model_copy(update={
                "status": "offline" if eid in offline
                else ("degraded" if eid in degraded else "online"),
            })
            for eid, e in self._seed.edges.items()
        }
        return Network(nodes=nodes, edges=edges)
