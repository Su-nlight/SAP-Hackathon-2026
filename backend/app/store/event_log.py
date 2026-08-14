"""Append-only JSONL event log with startup replay.

The log is the system of record. Current network state is always
derived by applying ACTIVE events to the seed network — never mutated.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

from ..domain.models import DisruptionEvent


class EventLog:
    def __init__(self, path: Path):
        self._path = path
        self._lock = threading.Lock()
        self._events: dict[str, DisruptionEvent] = {}

    def load(self) -> list[DisruptionEvent]:
        """Replay the log on startup; returns events in order."""
        if not self._path.exists():
            return []
        events: list[DisruptionEvent] = []
        with open(self._path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                ev = DisruptionEvent.model_validate_json(line)
                self._events[ev.id] = ev
                events.append(ev)
        return events

    def append(self, event: DisruptionEvent) -> None:
        with self._lock:
            self._events[event.id] = event
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(event.model_dump_json() + "\n")

    def get(self, event_id: str) -> DisruptionEvent | None:
        return self._events.get(event_id)

    def active(self) -> list[DisruptionEvent]:
        return [e for e in self._events.values() if e.status == "active"]

    def all(self) -> list[DisruptionEvent]:
        return list(self._events.values())
