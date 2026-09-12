import asyncio
from datetime import datetime, timezone
from pathlib import Path

from app.ai.agent.graph import SupplyAgent
from app.ai.agent.nodes import AgentNodes
from app.api.deps import (
    decision_archive_service,
    default_registry,
    heal_engine,
    hub,
    log,
    network_service,
    store,
)
from app.ai.agent.checkpointer import PersistentCheckpointer
from app.domain.constants import DisruptionType
from app.domain.models import DisruptionEvent
from app.services.disruption_service import DisruptionService
from app.services.mock_disruption_provider import MockDisruptionProvider


async def main():
    db_path = Path("data/persistence_test.sqlite")
    if db_path.exists():
        db_path.unlink()

    event_id = "persistence-test-event"
    thread_id = "agent-persistence-test"

    mock_service = DisruptionService(
        store,
        log,
        hub,
        MockDisruptionProvider(log),
    )

    event = DisruptionEvent(
        id=event_id,
        type=DisruptionType.BLOCKAGE,
        target_type="node",
        target_id="P9",
        severity="partial",
        start_time=datetime.now(timezone.utc),
    )

    mock_service.register(event)

    nodes = AgentNodes(
        default_registry,
        mock_service,
        network_service,
        heal_engine,
        hub,
        decision_archive_service,
    )

    checkpointer = PersistentCheckpointer(db_path)
    saver = await checkpointer.start()

    agent = SupplyAgent(nodes, saver)

    result = await agent.run(
        company_id="acme",
        raw_alert="Suez Canal blocked",
        thread_id=thread_id,
        disruption_id=event_id,
    )

    print("Awaiting approval:", result["awaiting_approval"])
    print("Next nodes:", result["next_nodes"])

    await checkpointer.close()


asyncio.run(main())