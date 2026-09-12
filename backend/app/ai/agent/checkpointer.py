"""Persistent SQLite checkpointer for LangGraph approval state."""
from __future__ import annotations

from pathlib import Path

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver


CHECKPOINT_PATH = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "langgraph_checkpoints.sqlite"
)


class PersistentCheckpointer:
    def __init__(self, path: Path = CHECKPOINT_PATH) -> None:
        self._path = path
        self._context = None
        self.saver = None

    async def start(self):
        if self.saver is not None:
            return self.saver

        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._context = AsyncSqliteSaver.from_conn_string(str(self._path))
        self.saver = await self._context.__aenter__()
        await self.saver.setup()
        return self.saver

    async def close(self):
        if self._context is not None:
            await self._context.__aexit__(None, None, None)
            self._context = None
            self.saver = None


__all__ = ["PersistentCheckpointer"]