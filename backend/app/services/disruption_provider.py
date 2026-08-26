from __future__ import annotations

from abc import ABC, abstractmethod

from ..domain.models import DisruptionEvent


class DisruptionProvider(ABC):

    @abstractmethod
    def register(self, event: DisruptionEvent) -> DisruptionEvent:
        pass

    @abstractmethod
    def approve(self, event_id: str) -> DisruptionEvent | None:
        pass

    @abstractmethod
    def resolve(self, event_id: str) -> DisruptionEvent | None:
        pass

    @abstractmethod
    def delete(self, event_id: str) -> bool:
        pass

    @abstractmethod
    def get(self, event_id: str) -> DisruptionEvent | None:
        pass

    @abstractmethod
    def all(self) -> list[DisruptionEvent]:
        pass

    @abstractmethod
    def active(self) -> list[DisruptionEvent]:
        pass

    @abstractmethod
    def resolved(self) -> list[DisruptionEvent]:
        pass