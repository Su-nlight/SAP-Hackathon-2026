"""GraphEngine abstraction. Services depend ONLY on this interface.

The seam that lets HANA Cloud Graph or a Rust core (petgraph) drop in
later as a single new implementation file without touching services.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from ..domain.models import DisruptionEvent, Network, RouteAlternative


class GraphEngine(ABC):
    @abstractmethod
    def shortest_path(
        self,
        network: Network,
        source: str,
        target: str,
        active_events: list[DisruptionEvent],
        alpha: float = 0.5,
    ) -> Optional[RouteAlternative]:
        """Best single path (composite weight) or None if unreachable."""

    @abstractmethod
    def k_shortest_paths(
        self,
        network: Network,
        source: str,
        target: str,
        active_events: list[DisruptionEvent],
        k: int = 3,
        alpha: float = 0.5,
    ) -> list[RouteAlternative]:
        """Top-k distinct paths (Yen's algorithm semantics)."""

    @abstractmethod
    def is_reachable(
        self,
        network: Network,
        source: str,
        target: str,
        active_events: list[DisruptionEvent],
        alpha: float = 0.5,
    ) -> bool:
        """Whether any finite-weight path exists."""
