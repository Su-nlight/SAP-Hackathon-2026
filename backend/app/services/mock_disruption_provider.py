from __future__ import annotations

from datetime import datetime, timezone

from ..domain.constants import DisruptionStatus
from ..domain.models import DisruptionEvent
from ..store.event_log import EventLog
from .disruption_provider import DisruptionProvider


class MockDisruptionProvider(DisruptionProvider):

    def __init__(self, log: EventLog) -> None:
        self._log = log

    def register(self, event: DisruptionEvent) -> DisruptionEvent:
        if self._log.get(event.id) is not None:
            raise ValueError(f"Disruption {event.id} already exists (idempotency)")
        self._log.append(event)
        return event

    def approve(self, event_id: str) -> DisruptionEvent | None:
        return self._log.get(event_id)

    def resolve(self, event_id: str) -> DisruptionEvent | None:
        ev = self._log.get(event_id)

        if ev is None:
            return None

        resolved = ev.model_copy(
            update={
                "status": DisruptionStatus.RESOLVED,
                "resolved_at": datetime.now(timezone.utc),
            }
        )

        self._log.append(resolved)
        return resolved

    def delete(self, event_id: str) -> bool:
        return self._log.delete(event_id)

    def get(self, event_id: str) -> DisruptionEvent | None:
        return self._log.get(event_id)

    def all(self) -> list[DisruptionEvent]:
        return self._log.all()

    def active(self) -> list[DisruptionEvent]:
        return self._log.active()

    def resolved(self) -> list[DisruptionEvent]:
        return [
            event
            for event in self._log.all()
            if event.status == DisruptionStatus.RESOLVED
        ]