"""Scenario runner: replays canned disruption playbooks end-to-end."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from ..config import settings
from ..domain.constants import DisruptionStatus, DisruptionType, Severity
from ..domain.models import DisruptionEvent
from ..services.disruption_service import DisruptionService


class ScenarioService:
    def __init__(self, disruption_service: DisruptionService, scenarios_path: Path | None = None) -> None:
        self._ds = disruption_service
        self._path = scenarios_path or (settings.data_dir / "scenarios.json")

    def list_scenarios(self) -> list[dict]:
        if not self._path.exists():
            return []
        try:
            return json.loads(self._path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []

    async def run(self, scenario_id: str, fast_forward: bool = True) -> dict:
        """Inject every step of a scenario as a live disruption."""
        import asyncio

        scenarios = self.list_scenarios()
        scenario = next((s for s in scenarios if s["id"] == scenario_id), None)
        if scenario is None:
            raise KeyError(f"Unknown scenario '{scenario_id}'")

        injected: list[DisruptionEvent] = []
        now = datetime.now().astimezone()
        for step in scenario["steps"]:
            end = None
            if step.get("expected_end_hours") is not None:
                end = now + timedelta(hours=step["expected_end_hours"])
            ev = DisruptionEvent(
                id=f"{scenario_id}-{step['seq']}-{uuid.uuid4().hex[:6]}",
                type=DisruptionType(step["type"]),
                target_type=step["target_type"],
                target_id=step["target_id"],
                severity=Severity(step["severity"]),
                start_time=now,
                expected_end=end,
                impact_delay_hours=step.get("impact_delay_hours", 0.0),
                capacity_factor=step.get("capacity_factor", 1.0),
                source=f"scenario:{scenario_id}",
                raw_text=step.get("raw_text", ""),
            )
            self._ds.register(ev)
            injected.append(ev)
            await asyncio.sleep(0.05)  # let SSE fan-out breathe between steps

        return {
            "scenario": scenario_id,
            "name": scenario["name"],
            "injected": [e.model_dump(mode="json") for e in injected],
        }
