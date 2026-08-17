from __future__ import annotations

import threading
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

Listener = Callable[[dict[str, Any]], Awaitable[None]]


class EventHub:
    """Async pub/sub. Each event is fanned out to every subscribed listener."""

    def __init__(self) -> None:
        self._listeners: set[Listener] = set()
        self._lock = threading.Lock()

    def subscribe(self, listener: Listener) -> None:
        with self._lock:
            self._listeners.add(listener)

    def unsubscribe(self, listener: Listener) -> None:
        with self._lock:
            self._listeners.discard(listener)

    async def publish(self, event: dict[str, Any]) -> None:
        with self._lock:
            listeners = list(self._listeners)
        for fn in listeners:
            try:
                await fn(event)
            except Exception:  # a dead listener must not kill the publisher
                pass


class SinkHub(EventHub):
    """Hub that keeps a bounded per-topic ring buffer for late subscribers."""

    def __init__(self, capacity: int = 1000) -> None:
        super().__init__()
        self._buffer: list[dict[str, Any]] = []
        self._capacity = capacity

    async def publish(self, event: dict[str, Any]) -> None:
        with self._lock:
            self._buffer.append(event)
            if len(self._buffer) > self._capacity:
                self._buffer = self._buffer[-self._capacity:]
        await super().publish(event)

    def replay(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._buffer)
