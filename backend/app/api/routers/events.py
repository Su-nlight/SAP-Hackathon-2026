"""SSE stream endpoint — pushes live events to the dashboard."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse

from ...streaming.hub import SinkHub
from ..deps import get_hub

router = APIRouter(prefix="/v1/events", tags=["events"])


@router.get("/stream")
async def stream_events(request: Request, hub: SinkHub = Depends(get_hub)):
    """Server-sent events: disruption.created, plan.pending_approval,
    plan.approved, network.healed, llm.switched..."""

    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

    async def listener(event: dict[str, Any]) -> None:
        await queue.put(event)

    hub.subscribe(listener)

    async def gen():
        try:
            # replay recent history so late joiners see current state
            for ev in hub.replay():
                yield _sse(ev)
            while True:
                if await request.is_disconnected():
                    break
                try:
                    ev = await asyncio.wait_for(queue.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    yield _sse({"type": "heartbeat", "data": {}})
                    continue
                yield _sse(ev)
        finally:
            hub.unsubscribe(listener)

    return EventSourceResponse(gen())


def _sse(event: dict[str, Any]) -> dict[str, str]:
    return {"event": event.get("type", "message"), "data": json.dumps(event)}
