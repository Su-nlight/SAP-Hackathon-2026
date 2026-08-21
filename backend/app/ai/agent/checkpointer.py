"""In-memory checkpointer for the approval interrupt.

InMemorySaver keeps graph state across the interrupt within the process
— exactly what a live demo needs. Swap to PostgresSaver (or a Redis
checkpointer) for multi-instance production; the graph code is unchanged.
"""
from __future__ import annotations

from langgraph.checkpoint.memory import InMemorySaver

__all__ = ["InMemorySaver"]
