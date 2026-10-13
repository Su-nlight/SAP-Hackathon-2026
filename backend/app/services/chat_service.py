"""Chat over past decisions only — strictly grounded, no general knowledge."""
from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from ..ai.llm_registry import LLMRegistry
from ..ai.prompts import CHAT_SYSTEM
from .decision_archive_service import DecisionArchiveService


class DecisionChatService:
    def __init__(self, archive: DecisionArchiveService, registry: LLMRegistry) -> None:
        self._archive = archive
        self._registry = registry

    async def answer(self, company_id: str, question: str) -> dict:
        records = []
        try:
            records = await self._archive.search(company_id, question, top_k=5)
        except Exception:
            pass

        if not records:
            return {
                "answer": "I don't have a record of a decision matching that query in the archive.",
                "sources": [],
            }

        context = "\n\n".join(
            f"[{r.id}] {r.created_at.isoformat()} disruption {r.disruption_id}\n{r.to_embedding_text()}"
            for r in records
        )

        try:
            model = self._registry.get_chat_model(company_id)
            msgs = [
                SystemMessage(content=CHAT_SYSTEM),
                HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}"),
            ]
            resp = await model.ainvoke(msgs)
            answer_text = resp.content
        except Exception:
            # Local fallback summary when external LLM credentials are unconfigured
            r = records[0]
            answer_text = (
                f"Disruption {r.disruption_id} was recorded on {r.created_at.isoformat()}. "
                f"Matching decision details: {r.to_embedding_text()}"
            )

        return {
            "answer": answer_text,
            "sources": [
                {
                    "decision_id": r.id,
                    "disruption_id": r.disruption_id,
                    "created_at": r.created_at.isoformat(),
                }
                for r in records
            ],
        }