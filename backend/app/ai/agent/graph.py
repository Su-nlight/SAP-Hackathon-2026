"""LangGraph StateGraph: parse -> assess -> recommend -> narrate -> [interrupt] -> apply.

The approval step is a real LangGraph interrupt: the graph pauses on the
checkpointer, the dashboard shows Approve/Reject, and resuming with
Command(resume=...) continues the run. Rejection loops back to assess
with feedback.
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from ...domain.constants import AgentStatus
from .nodes import AgentNodes
from .state import SupplyAgentState


class SupplyAgent:
    def __init__(self, nodes: AgentNodes, saver=None) -> None:
        self._nodes = nodes
        self._saver = saver or InMemorySaver()
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

        return g.compile(checkpointer=self._saver)

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
        return {"approved": approved, "feedback": feedback , "disruption_id": state.get("disruption_id")}

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
        snapshot = await self.graph.aget_state(config)
        return {
            "thread_id": thread_id,
            "state": result,
            "awaiting_approval": bool(snapshot.next),
            "next_nodes": list(snapshot.next),
        }

    async def resume(
        self,
        thread_id: str,
        approved: bool,
        feedback: Optional[str] = None,
    ) -> dict:
        config = {"configurable": {"thread_id": thread_id}}

        snapshot = await self.graph.aget_state(config)

        if snapshot is None or not snapshot.values:
            raise ValueError(f"No agent state for thread {thread_id}")
        if "approval" not in snapshot.next:
            raise ValueError(
                f"Agent thread {thread_id} is not awaiting approval"
            )

        payload: Any = {
            "approved": approved,
        }

        if feedback:
            payload["feedback"] = feedback

        values = snapshot.values

        if not values.get("disruption_id"):
            event_id = thread_id.removeprefix("agent-")
            payload["disruption_id"] = event_id

        result = await self.graph.ainvoke(
            Command(resume=payload),
            config=config,
        )

        snapshot = await self.graph.aget_state(config)

        return {
            "thread_id": thread_id,
            "state": result,
            "awaiting_approval": bool(snapshot.next),
            "next_nodes": list(snapshot.next),
        }

    async def state(self, thread_id: str) -> dict[str, Any]:
        config = {"configurable": {"thread_id": thread_id}}
        snapshot = await self.graph.aget_state(config)
        if snapshot is None or not snapshot.values:
            raise ValueError(f"No agent state for thread {thread_id}")
        return {
            "values": dict(snapshot.values),
            "next_nodes": list(snapshot.next),
        }

    async def is_awaiting_approval(self, thread_id: str) -> bool:
        snapshot = await self.state(thread_id)
        return (
            snapshot["values"].get("status")
            == AgentStatus.AWAITING_APPROVAL.value
            and "approval" in snapshot["next_nodes"]
        )
