"""Disruption lifecycle service: validate, append, apply, resolve."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from ..domain.constants import DisruptionStatus
from ..domain.models import DisruptionEvent, Network
from ..streaming.hub import SinkHub
from ..store.event_log import EventLog
from ..store.network_store import NetworkStore


class DisruptionService:
    def __init__(
        self,
        store: NetworkStore,
        log: EventLog,
        hub: SinkHub,
    ) -> None:
        self._store = store
        self._log = log
        self._hub = hub

    def register(self, event: DisruptionEvent) -> DisruptionEvent:
        """Append a disruption to the log and emit the created event."""
        if self._log.get(event.id) is not None:
            raise ValueError(f"Disruption {event.id} already exists (idempotency)")
        self._log.append(event)

        try:
            asyncio.get_running_loop().create_task(
                self._hub.publish({"type": "disruption.created", "data": event.model_dump(mode="json")})
            )
        except RuntimeError:
            pass
        return event

    def approve(self, event_id: str) -> DisruptionEvent | None:
        """Record a mock approval without changing the disruption lifecycle status."""
        return self._log.get(event_id)

    def resolve(self, event_id: str) -> DisruptionEvent | None:
        """Resolve a disruption: mark RESOLVED, emit network.healed."""
        ev = self._log.get(event_id)
        if ev is None:
            return None
        resolved = ev.model_copy(update={
            "status": DisruptionStatus.RESOLVED,
            "resolved_at": datetime.now(timezone.utc),
        })
        self._log.append(resolved)

        try:
            asyncio.get_running_loop().create_task(
                self._hub.publish({"type": "network.healed", "data": resolved.model_dump(mode="json")})
            )
        except RuntimeError:
            pass
        return resolved

    def delete(self, event_id: str) -> bool:
        """Delete a disruption from the mock event store."""
        return self._log.delete(event_id)

    def get(self, event_id: str) -> DisruptionEvent | None:
        """Retrieve a disruption event by its ID."""
        return self._log.get(event_id)

    def all(self) -> list[DisruptionEvent]:
        """Retrieve all disruption events in the log."""
        return self._log.all()

    def active(self) -> list[DisruptionEvent]:
        """Retrieve currently active disruption events."""
        return self._log.active()

    def resolved(self) -> list[DisruptionEvent]:
        """Retrieve resolved disruption events."""
        return [e for e in self._log.all() if e.status.value == "resolved"]

    def current_network(self) -> Network:
        return self._store.current(self._log.active())
