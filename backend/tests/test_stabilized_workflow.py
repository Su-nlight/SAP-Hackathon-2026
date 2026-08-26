from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.ai.agent.graph import SupplyAgent
from app.api.deps import get_agent, get_current_identity, get_disruption_service
from app.api.routers.disruptions import router as disruptions_router
from app.config import settings
from app.domain.constants import AgentStatus, DisruptionStatus, DisruptionType, HealAction, Severity
from app.domain.models import DisruptionEvent, GeoPoint, HealDecision, Network, Node, RouteAlternative, Shipment
from app.sap.base import SapDisruptionRow
from app.services.disruption_service import DisruptionService
from app.services.heal_engine import HealEngine
from app.services.mock_disruption_provider import MockDisruptionProvider
from app.services.sap_disruption_provider import SapDisruptionProvider
from app.services.scenario_service import ScenarioService
from app.store.event_log import EventLog
from app.store.network_store import NetworkStore
from app.streaming.hub import SinkHub


def _event(event_id: str = "event-1") -> DisruptionEvent:
    return DisruptionEvent(
        id=event_id,
        type=DisruptionType.BLOCKAGE,
        target_type="node",
        target_id="P9",
        severity=Severity.FULL,
        start_time=datetime.now(timezone.utc),
        raw_text="Suez Canal blocked",
    )


class RecordingMockProvider(MockDisruptionProvider):
    def __init__(self, log: EventLog) -> None:
        super().__init__(log)
        self.approve_calls = 0

    def approve(self, event_id: str) -> DisruptionEvent | None:
        self.approve_calls += 1
        return super().approve(event_id)


class RecordingAgent:
    def __init__(self, disruptions: DisruptionService) -> None:
        self._disruptions = disruptions
        self.run_ids: list[str] = []
        self.resume_calls: list[tuple[str, bool, str | None]] = []

    async def run(self, company_id: str, raw_alert: str, thread_id: str, disruption_id: str) -> dict:
        assert self._disruptions.get(disruption_id) is not None
        self.run_ids.append(disruption_id)
        return {
            "thread_id": thread_id,
            "state": {
                "status": AgentStatus.AWAITING_APPROVAL.value,
                "narrative": "Review the deterministic recommendation.",
                "decision": HealDecision(
                    action=HealAction.REROUTE,
                    reason="A registered disruption requires rerouting.",
                ),
            },
            "awaiting_approval": True,
            "next_nodes": ["approval"],
        }

    async def resume(self, thread_id: str, approved: bool, feedback: str | None = None) -> dict:
        self.resume_calls.append((thread_id, approved, feedback))
        return {
            "thread_id": thread_id,
            "state": {
                "status": (
                    AgentStatus.APPROVED.value
                    if approved
                    else AgentStatus.AWAITING_APPROVAL.value
                ),
            },
            "awaiting_approval": not approved,
            "next_nodes": [] if approved else ["approval"],
        }


def _mock_disruption_service(tmp_path: Path) -> tuple[DisruptionService, RecordingMockProvider]:
    log = EventLog(tmp_path / "events.jsonl")
    provider = RecordingMockProvider(log)
    service = DisruptionService(
        NetworkStore(Network(nodes={}, edges={})),
        log,
        SinkHub(),
        provider,
    )
    return service, provider


def _disruptions_client(
    disruptions: DisruptionService,
    agent: RecordingAgent,
) -> TestClient:
    app = FastAPI()
    app.include_router(disruptions_router)
    app.dependency_overrides[get_current_identity] = lambda: {
        "sub": "acme_admin",
        "company_id": "acme",
    }
    app.dependency_overrides[get_disruption_service] = lambda: disruptions
    app.dependency_overrides[get_agent] = lambda: agent
    return TestClient(app)


def test_raw_alert_is_registered_before_agent_assessment(tmp_path: Path, monkeypatch) -> None:
    disruptions, _ = _mock_disruption_service(tmp_path)
    agent = RecordingAgent(disruptions)
    monkeypatch.setattr(settings, "ai_enabled", True)

    response = _disruptions_client(disruptions, agent).post(
        "/v1/disruptions/ingest",
        json={"raw_text": "Suez Canal is completely blocked"},
    )

    assert response.status_code == 200
    body = response.json()
    event = disruptions.get(body["disruption_id"])
    assert event is not None
    assert event.target_id == "P9"
    assert event.type == DisruptionType.BLOCKAGE
    assert event.severity == Severity.FULL
    assert agent.run_ids == [event.id]
    assert body["awaiting_approval"] is True


def test_approval_persists_once_to_mock_provider(tmp_path: Path, monkeypatch) -> None:
    disruptions, provider = _mock_disruption_service(tmp_path)
    disruptions.register(_event())
    agent = RecordingAgent(disruptions)
    monkeypatch.setattr(settings, "ai_enabled", True)
    monkeypatch.setattr(settings, "data_provider", "mock")
    client = _disruptions_client(disruptions, agent)

    first = client.post("/v1/disruptions/event-1/approve", json={"approved": True})
    second = client.post("/v1/disruptions/event-1/approve", json={"approved": True})

    assert first.status_code == 200
    assert second.status_code == 200
    assert provider.approve_calls == 2
    assert disruptions.get("event-1").status == DisruptionStatus.APPROVED
    lines = (tmp_path / "events.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2  # registration plus one durable approval transition


class StubNodes:
    def __init__(self) -> None:
        self.assessment_feedback: list[str | None] = []

    async def parse_node(self, state: dict) -> dict:
        return {"status": AgentStatus.PARSING.value}

    async def assess_node(self, state: dict) -> dict:
        self.assessment_feedback.append(state.get("feedback"))
        return {"status": AgentStatus.ASSESSING.value}

    async def recommend_node(self, state: dict) -> dict:
        return {
            "status": AgentStatus.RECOMMENDING.value,
            "decision": HealDecision(
                action=HealAction.REROUTE,
                reason="deterministic test decision",
            ),
        }

    async def narrate_node(self, state: dict) -> dict:
        return {
            "status": AgentStatus.AWAITING_APPROVAL.value,
            "narrative": "review this plan",
        }

    async def apply_plan_node(self, state: dict) -> dict:
        return {"status": AgentStatus.APPROVED.value, "approved": True}


def test_rejection_reassesses_before_returning_to_approval() -> None:
    nodes = StubNodes()
    agent = SupplyAgent(nodes)

    first = asyncio.run(
        agent.run(
            company_id="acme",
            raw_alert="test alert",
            thread_id="agent-reject-test",
            disruption_id="event-reject",
        )
    )
    resumed = asyncio.run(
        agent.resume(
            "agent-reject-test",
            approved=False,
            feedback="Need a lower-cost route.",
        )
    )

    assert first["awaiting_approval"] is True
    assert resumed["awaiting_approval"] is True
    assert resumed["state"]["status"] == AgentStatus.AWAITING_APPROVAL.value
    assert nodes.assessment_feedback == [None, "Need a lower-cost route."]


class ScenarioAgent:
    def __init__(self, disruptions: DisruptionService) -> None:
        self._disruptions = disruptions
        self.calls: list[str] = []

    async def run(self, company_id: str, raw_alert: str, thread_id: str, disruption_id: str) -> dict:
        assert self._disruptions.get(disruption_id) is not None
        self.calls.append(disruption_id)
        return {"thread_id": thread_id, "state": {}, "awaiting_approval": True}


def test_suez_scenario_registers_event_before_agent_run(tmp_path: Path, monkeypatch) -> None:
    disruptions, _ = _mock_disruption_service(tmp_path)
    agent = ScenarioAgent(disruptions)
    scenario_path = Path(__file__).resolve().parents[2] / "data" / "scenarios.json"
    service = ScenarioService(disruptions, agent, scenarios_path=scenario_path)
    monkeypatch.setattr(settings, "ai_enabled", True)

    result = asyncio.run(service.run("suez-blockage"))

    assert result["scenario"] == "suez-blockage"
    assert result["injected"][0]["target_id"] == "P9"
    assert len(agent.calls) == 1
    assert disruptions.get(agent.calls[0]).type == DisruptionType.BLOCKAGE


class RecordingSapService:
    def __init__(self) -> None:
        self.rows: dict[str, SapDisruptionRow] = {}
        self.create_calls = 0
        self.approve_calls = 0

    def list_disruptions(self) -> list[SapDisruptionRow]:
        return list(self.rows.values())

    def create_disruption(self, row: SapDisruptionRow) -> SapDisruptionRow:
        self.create_calls += 1
        self.rows[row.event_id] = row
        return row

    def approve_disruption(self, event_id: str) -> bool:
        self.approve_calls += 1
        row = self.rows[event_id]
        self.rows[event_id] = SapDisruptionRow(
            **{**row.__dict__, "status": "APPROVED"}
        )
        return True

    def resolve_disruption(self, event_id: str) -> bool:
        return True

    def delete_disruption(self, event_id: str) -> bool:
        return self.rows.pop(event_id, None) is not None


def test_sap_provider_persists_create_and_idempotent_approval() -> None:
    sap = RecordingSapService()
    provider = SapDisruptionProvider(sap)

    provider.register(_event("sap-event"))
    first = provider.approve("sap-event")
    second = provider.approve("sap-event")

    assert sap.create_calls == 1
    assert sap.approve_calls == 1
    assert first is not None and first.status == DisruptionStatus.APPROVED
    assert second is not None and second.status == DisruptionStatus.APPROVED


class AlternativesOnlyRouting:
    def alternatives(self, network, shipment, active_events, now=None) -> list[RouteAlternative]:
        return [
            RouteAlternative(
                route_id="supplier-route",
                path=[shipment.origin, shipment.destination],
                legs=[],
                total_time_hours=12,
                total_cost_per_ton=20,
                total_risk=0.1,
                total_co2_per_ton=1,
                composite_weight=0.2,
            )
        ]


def test_supplier_switch_uses_feasible_alternatives_without_shortest_kwargs() -> None:
    network = Network(
        nodes={
            "S1": Node(
                id="S1",
                name="Original supplier",
                type="supplier",
                location=GeoPoint(lat=0, lon=0),
            ),
            "S2": Node(
                id="S2",
                name="Alternative supplier",
                type="supplier",
                location=GeoPoint(lat=1, lon=1),
            ),
        },
        edges={},
    )
    shipment = Shipment(
        id="shipment-1",
        origin="S1",
        destination="C1",
        cargo_tons=10,
        deadline=datetime(2026, 12, 1, tzinfo=timezone.utc),
        budget_per_ton=100,
    )
    engine = HealEngine(network_service=None, routing_service=AlternativesOnlyRouting())

    alternatives = engine._supplier_alternatives(
        shipment,
        network,
        [],
        datetime.now(timezone.utc),
    )

    assert alternatives[0][0] == "S2"
    assert alternatives[0][1].route_id == "supplier-route"
