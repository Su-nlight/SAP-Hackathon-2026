"""Disruption lifecycle service."""
from __future__ import annotations

import asyncio

from ..domain.models import DisruptionEvent, Network
from ..streaming.hub import SinkHub
from ..store.event_log import EventLog
from ..store.network_store import NetworkStore
from .disruption_provider import DisruptionProvider


class DisruptionService:
    def __init__(
        self,
        store: NetworkStore,
        log: EventLog,
        hub: SinkHub,
        provider: DisruptionProvider,
    ) -> None:
        self._store = store
        self._log = log
        self._hub = hub
        self._provider = provider

    def register(self, event: DisruptionEvent) -> DisruptionEvent:
        result = self._provider.register(event)

        try:
            asyncio.get_running_loop().create_task(
                self._hub.publish(
                    {
                        "type": "disruption.created",
                        "data": result.model_dump(mode="json"),
                    }
                )
            )
        except RuntimeError:
            pass

        return result

    def approve(self, event_id: str) -> DisruptionEvent | None:
        return self._provider.approve(event_id)

    def resolve(self, event_id: str) -> DisruptionEvent | None:
        result = self._provider.resolve(event_id)

        if result is None:
            return None

        try:
            asyncio.get_running_loop().create_task(
                self._hub.publish(
                    {
                        "type": "network.healed",
                        "data": result.model_dump(mode="json"),
                    }
                )
            )
        except RuntimeError:
            pass

        return result

    def delete(self, event_id: str) -> bool:
        return self._provider.delete(event_id)

    def get(self, event_id: str) -> DisruptionEvent | None:
        return self._provider.get(event_id)

    def all(self) -> list[DisruptionEvent]:
        return self._provider.all()

    def active(self) -> list[DisruptionEvent]:
        return self._provider.active()

    def resolved(self) -> list[DisruptionEvent]:
        return self._provider.resolved()

    def current_network(self) -> Network:
        return self._store.current(self._log.active())