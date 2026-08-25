"""Agent nodes — parse, assess, recommend, narrate, apply_plan.

Rule: the LLM parses, assesses, and narrates. It NEVER decides — the
recommendation comes from the deterministic heal engine, and the LLM
only re-expresses it.
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage

from ...config import settings
from ...domain.constants import AgentStatus
from ...domain.models import DecisionRecord, DisruptionEvent
from ..prompts import ASSESS_SYSTEM, NARRATE_SYSTEM, PARSE_SYSTEM
from ..llm_registry import LLMRegistry
from ..schemas import DisruptionParse, ImpactAssessment
from .state import SupplyAgentState


class AgentNodes:
    def __init__(
        self,
        registry: LLMRegistry,
        disruption_service,
        network_service,
        heal_engine,
        hub,
        archive_service=None,
    ) -> None:
        self._registry = registry
        self._ds = disruption_service
        self._ns = network_service
        self._heal = heal_engine
        self._hub = hub
        self._archive = archive_service

    # ---- parse -------------------------------------------------------
    async def parse_node(self, state: SupplyAgentState) -> dict:
        model = self._registry.get_chat_model(state["company_id"])
        structured = model.with_structured_output(DisruptionParse)

        msgs = [
            SystemMessage(content=PARSE_SYSTEM),
            HumanMessage(content=state["raw_alert"]),
        ]
        parsed: DisruptionParse = await structured.ainvoke(msgs)

        event = self._ds._log.get(state["disruption_id"])

        if not event:
            event = DisruptionEvent(
                id=state["disruption_id"],
                type=parsed.type,
                target_type=parsed.target_type,
                target_id=parsed.target_id,
                severity=parsed.severity,
                start_time=datetime.now().astimezone(),
                expected_end=parsed.expected_end,
                raw_text=state["raw_alert"],
            )
            event = self._ds.register(event)

        return {"disruption": event, "status": AgentStatus.PARSING.value}

    # ---- assess ------------------------------------------------------
    async def assess_node(self, state: SupplyAgentState) -> dict:
        model = self._registry.get_chat_model(state["company_id"])
        structured = model.with_structured_output(ImpactAssessment)

        current = self._ns.current(self._ds.active())
        disruption = state.get("disruption")
        if not disruption:
            disruption = self._ds._log.get(state["disruption_id"])

        affected = self._ns.find_affected_shipments(disruption, current)

        parse_result = state.get("parse_result")
        if parse_result:
            context = f"Disruption: {parse_result.model_dump_json()}\n"
        else:
            context = f"Disruption: {disruption.model_dump_json()}\n"

        context += f"Affected Shipments: {[s.id for s in affected]}\n"

        msgs = [
            SystemMessage(content=ASSESS_SYSTEM),
            HumanMessage(content=f"Analyze impact based on ground truth:\n{context}"),
        ]
        assessment: ImpactAssessment = await structured.ainvoke(msgs)
        return {"assessment": assessment, "status": AgentStatus.ASSESSING.value}

    def _ground_truth(self, state: SupplyAgentState) -> str:
        """Real engine data, not LLM guesswork."""
        parsed = state["parse_result"]
        ev = DisruptionEvent(
            id=state.get("disruption_id", "x"),
            type=parsed.type,
            target_type=parsed.target_type,
            target_id=parsed.target_id,
            severity=parsed.severity,
            start_time=datetime.now().astimezone(),
            expected_end=parsed.expected_end,
        )
        current = self._ns.current(self._ds.active())
        affected = self._ns.find_affected_shipments(ev, current)
        lines = [
            f"active disruptions: {[e.id for e in self._ds.active()]}",
            f"affected shipments: {[s.id for s in affected]}",
        ]
        return "\n".join(lines)

    # ---- recommend (DETERMINISTIC — no LLM) --------------------------
    async def recommend_node(self, state: SupplyAgentState) -> dict:
        disruption = state.get("disruption")
        if not disruption:
            disruption = self._ds._log.get(state["disruption_id"])

        active = self._ds.active()
        decision = self._heal.decide(disruption, active)

        return {"decision": decision, "status": AgentStatus.RECOMMENDING.value}

    # ---- narrate -----------------------------------------------------
    async def narrate_node(self, state: SupplyAgentState) -> dict:
        model = self._registry.get_chat_model(state["company_id"])
        decision = state["decision"]
        payload = {
            "action": decision.action.value,
            "reason": decision.reason,
            "alternatives": [a.model_dump(mode="json") for a in decision.alternatives],
            "affected_shipments": decision.affected_shipment_ids,
        }
        msgs = [
            SystemMessage(content=NARRATE_SYSTEM),
            HumanMessage(
                content=(
                    f"Decision from engine:\n{payload}\n"
                    f"Assessment:\n{state.get('assessment').model_dump_json() if state.get('assessment') else 'none'}"
                )
            ),
        ]
        resp = await model.ainvoke(msgs)
        return {"narrative": resp.content, "status": AgentStatus.AWAITING_APPROVAL.value}

    # ---- apply plan (post-approval, pure code) -----------------------
    async def apply_plan_node(self, state: SupplyAgentState) -> dict:
        decision = state["decision"]
        disruption = state.get("disruption") or self._ds._log.get(state["disruption_id"])
        assessment = state.get("assessment")

        # Archive the approved decision into durable log + Pinecone RAG[cite: 1]
        if self._archive and disruption:
            record = DecisionRecord(
                id=f"dec-{uuid.uuid4().hex}",
                company_id=state["company_id"],
                disruption_id=state["disruption_id"],
                disruption_type=disruption.type,
                target_type=disruption.target_type,
                target_id=disruption.target_id,
                severity=disruption.severity,
                action=decision.action,
                reason=decision.reason,
                narrative=state.get("narrative") or "",
                urgency=getattr(assessment, "urgency", "medium") if assessment else "medium",
                affected_shipment_ids=decision.affected_shipment_ids,
                approved=True,
                feedback=state.get("feedback"),
            )
            asyncio.create_task(self._archive.archive(record))

        await self._hub.publish({
            "type": "plan.approved",
            "data": {
                "disruption_id": state.get("disruption_id"),
                "action": decision.action.value,
                "reason": decision.reason,
            },
        })
        return {"status": AgentStatus.APPROVED.value, "approved": True}

    # ---- archive rejected decisions (Section 15 open design) ---------
    async def archive_rejected_node(self, state: SupplyAgentState) -> dict:
        """Archive rejected recommendations so users can query past turned-down options[cite: 1]."""
        decision = state.get("decision")
        disruption = state.get("disruption") or self._ds._log.get(state["disruption_id"])
        assessment = state.get("assessment")

        if self._archive and disruption and decision:
            record = DecisionRecord(
                id=f"dec-{uuid.uuid4().hex}",
                company_id=state["company_id"],
                disruption_id=state["disruption_id"],
                disruption_type=disruption.type,
                target_type=disruption.target_type,
                target_id=disruption.target_id,
                severity=disruption.severity,
                action=decision.action,
                reason=decision.reason,
                narrative=state.get("narrative") or "",
                urgency=getattr(assessment, "urgency", "medium") if assessment else "medium",
                affected_shipment_ids=decision.affected_shipment_ids,
                approved=False,
                feedback=state.get("feedback"),
            )
            asyncio.create_task(self._archive.archive(record))

        return {"status": AgentStatus.REJECTED.value, "approved": False}