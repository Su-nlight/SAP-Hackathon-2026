"""Ordered approval finalization across provider, graph, archive, and events.

This service is deliberately not a transaction manager: SAP/provider writes,
LangGraph checkpoints, and JSONL archival do not share a transaction. It does
provide a strict order and retry-safe IDs so a failure is visible and can be
retried without another provider write.
"""
from __future__ import annotations

import asyncio
from typing import Any

from ..domain.constants import AgentStatus, DisruptionStatus
from ..domain.models import DecisionRecord, DisruptionEvent, HealDecision


class ApprovalFinalizationError(RuntimeError):
    """Base error for an approval that did not complete end to end."""


class ApprovalNotPendingError(ApprovalFinalizationError):
    """Raised when a request does not target an approval interrupt."""


class ProviderApprovalError(ApprovalFinalizationError):
    """Raised before graph finalization when provider approval fails."""


class AgentFinalizationError(ApprovalFinalizationError):
    """Raised after provider approval when graph finalization fails."""


class ArchiveFinalizationError(ApprovalFinalizationError):
    """Raised after graph finalization when durable archival fails."""


class ApprovalFinalizationService:
    """Coordinate the ordered, retry-safe approval sequence.

    Sequence: pending interrupt -> provider approval -> graph completion ->
    durable archive -> plan.approved publication. A retry after an archive
    failure skips already-persisted provider/graph steps and retries archival.
    """

    def __init__(self, agent, disruption_service, archive_service, hub) -> None:
        self._agent = agent
        self._disruptions = disruption_service
        self._archive = archive_service
        self._hub = hub
        self._locks: dict[str, asyncio.Lock] = {}

    async def _agent_state(self, thread_id: str):
        result = self._agent.state(thread_id)
        if asyncio.iscoroutine(result):
            return await result
        return result

    async def _agent_is_awaiting_approval(self, thread_id: str) -> bool:
        result = self._agent.is_awaiting_approval(thread_id)
        if asyncio.iscoroutine(result):
            return await result
        return result

    async def approve(
        self,
        event_id: str,
        feedback: str | None = None,
    ) -> dict[str, Any]:
        lock = self._locks.setdefault(event_id, asyncio.Lock())
        async with lock:
            return await self._approve(event_id, feedback)

    async def _approve(
        self,
        event_id: str,
        feedback: str | None,
    ) -> dict[str, Any]:
        thread_id = f"agent-{event_id}"
        event = self._disruptions.get(event_id)
        if event is None:
            raise ProviderApprovalError(f"Unknown disruption {event_id}")

        state = await self._agent_state(thread_id)
        values = state["values"]
        agent_is_approved = (
            values.get("status") == AgentStatus.APPROVED.value
        )

        if not agent_is_approved and not await self._agent_is_awaiting_approval(thread_id):
            raise ApprovalNotPendingError(
                f"Agent thread {thread_id} is not awaiting approval"
            )

        if not agent_is_approved:
            try:
                persisted = self._disruptions.approve(event_id)
            except Exception as exc:
                raise ProviderApprovalError(
                    f"Provider approval failed for {event_id}: {exc}"
                ) from exc
            if persisted is None or persisted.status != DisruptionStatus.APPROVED:
                raise ProviderApprovalError(
                    f"Provider did not confirm approval for {event_id}"
                )

            try:
                result = await self._agent.resume(
                    thread_id=thread_id,
                    approved=True,
                    feedback=feedback,
                )
            except Exception as exc:
                raise AgentFinalizationError(
                    f"Provider approved {event_id}, but graph finalization failed: {exc}"
                ) from exc

            values = result["state"]
            if values.get("status") != AgentStatus.APPROVED.value:
                raise AgentFinalizationError(
                    f"Provider approved {event_id}, but graph did not reach approved"
                )
            event = persisted
        elif event.status != DisruptionStatus.APPROVED:
            raise AgentFinalizationError(
                f"Agent is approved but provider is not approved for {event_id}"
            )

        record = self._decision_record(event_id, event, values)
        try:
            archived_now = await self._archive.archive(record)
        except Exception as exc:
            raise ArchiveFinalizationError(
                f"Provider and graph are approved for {event_id}, but archival failed: {exc}"
            ) from exc

        if archived_now:
            decision = values["decision"]
            await self._hub.publish({
                "type": "plan.approved",
                "data": {
                    "disruption_id": event_id,
                    "action": decision.action.value,
                    "reason": decision.reason,
                },
            })

        return {
            "event_id": event_id,
            "thread_id": thread_id,
            "approved": True,
            "status": AgentStatus.APPROVED.value,
            "provider_status": event.status.value,
            "archive_created": archived_now,
            "idempotent": not archived_now,
        }

    @staticmethod
    def _decision_record(
        event_id: str,
        event: DisruptionEvent,
        state: dict[str, Any],
    ) -> DecisionRecord:
        decision: HealDecision = state["decision"]
        assessment = state.get("assessment")
        return DecisionRecord(
            id=f"dec-{event_id}",
            company_id=state["company_id"],
            disruption_id=event_id,
            disruption_type=event.type,
            target_type=event.target_type,
            target_id=event.target_id,
            severity=event.severity,
            action=decision.action,
            reason=decision.reason,
            narrative=state.get("narrative") or "",
            urgency=getattr(assessment, "urgency", "medium"),
            affected_shipment_ids=decision.affected_shipment_ids,
            approved=True,
            feedback=state.get("feedback"),
        )
