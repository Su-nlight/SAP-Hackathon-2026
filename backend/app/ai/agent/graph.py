"""LangGraph StateGraph: parse -> assess -> recommend -> narrate -> [interrupt] -> apply.

The approval step is a real LangGraph interrupt: the graph pauses on the
checkpointer, the dashboard shows Approve/Reject, and resuming with
Command(resume=...) continues the run. Rejection loops back to assess
with feedback.
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from ...domain.constants import AgentStatus
from .checkpointer import InMemorySaver
from .nodes import AgentNodes
from .state import SupplyAgentState


class SupplyAgent:
    def __init__(self, nodes: AgentNodes) -> None:
        self._nodes = nodes
        self.graph = self._build()

    def _build(self):
        g = StateGraph(SupplyAgentState)

        g.add_node("parse", self._nodes.parse_node)
        g.add_node("assess", self._nodes.assess_node)
        g.add_node("recommend", self._nodes.recommend_node)
        g.add_node("narrate", self._nodes.narrate_node)
        g.add_node("approval", self._approval_node)
        g.add_node("apply_plan", self._nodes.apply_plan_node)

        g.add_edge(START, "parse")
        g.add_edge("parse", "assess")
        g.add_edge("assess", "recommend")
        g.add_edge("recommend", "narrate")
        g.add_edge("narrate", "approval")
        g.add_conditional_edges(
            "approval",
            self._route_after_approval,
            {"approved": "apply_plan", "rejected": "assess"},
        )
        g.add_edge("apply_plan", END)

        return g.compile(checkpointer=InMemorySaver())

    # ---- approval interrupt ------------------------------------------
    async def _approval_node(self, state: SupplyAgentState) -> dict:
        decision = state.get("decision")
        resume = interrupt({
            "type": "plan.pending_approval",
            "disruption_id": state.get("disruption_id"),
            "narrative": state.get("narrative"),
            "action": decision.action.value if decision else None,
            "reason": decision.reason if decision else None,
            "alternatives": [a.model_dump(mode="json") for a in decision.alternatives] if decision else [],
        })
        if isinstance(resume, dict):
            approved = bool(resume.get("approved", False))
            feedback = resume.get("feedback")
        else:
            approved = resume == "approved"
            feedback = None
        return {"approved": approved, "feedback": feedback}

    @staticmethod
    def _route_after_approval(state: SupplyAgentState) -> str:
        return "approved" if state.get("approved") else "rejected"

    # ---- public API ---------------------------------------------------
    def new_thread(self) -> str:
        return f"agent-{uuid.uuid4().hex[:10]}"

    async def run(
        self,
        company_id: str,
        raw_alert: str,
        thread_id: Optional[str] = None,
        disruption_id: Optional[str] = None,
    ) -> dict:
        thread_id = thread_id or self.new_thread()
        config = {"configurable": {"thread_id": thread_id}}
        initial: SupplyAgentState = {
            "company_id": company_id,
            "raw_alert": raw_alert,
            "status": AgentStatus.PARSING.value,
        }
        if disruption_id:
            initial["disruption_id"] = disruption_id
        result = await self.graph.ainvoke(initial, config=config)
        snapshot = self.graph.get_state(config)
        return {
            "thread_id": thread_id,
            "state": result,
            "awaiting_approval": bool(snapshot.next),
            "next_nodes": list(snapshot.next),
        }

    async def resume(self, thread_id: str, approved: bool, feedback: Optional[str] = None) -> dict:
        config = {"configurable": {"thread_id": thread_id}}
        payload: Any = {"approved": approved}
        if feedback:
            payload["feedback"] = feedback
        result = await self.graph.ainvoke(Command(resume=payload), config=config)
        snapshot = self.graph.get_state(config)
        return {
            "thread_id": thread_id,
            "state": result,
            "awaiting_approval": bool(snapshot.next),
            "next_nodes": list(snapshot.next),
        }
