"""Writes finalized decisions to a durable log AND to Pinecone for search."""
from __future__ import annotations

import json
from pathlib import Path
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from ..config import settings
from ..domain.models import DecisionRecord
from ..vectorstore.pinecone_client import upsert_decision, query_decisions


class DecisionArchiveService:
    def __init__(self, archive_path: Path | None = None) -> None:
        self._path = archive_path or settings.decisions_archive_path
        self._path.parent.mkdir(parents=True, exist_ok=True)

        api_key = settings.gemini_api_key_resolved or "dummy_key"
        self._embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=api_key,
        )

    async def archive(self, record: DecisionRecord) -> None:
        with self._path.open("a", encoding="utf-8") as f:
            f.write(record.model_dump_json() + "\n")

        try:
            vector = await self._embeddings.aembed_query(record.to_embedding_text())
            upsert_decision(
                record_id=record.id,
                company_id=record.company_id,
                embedding=vector,
                metadata={
                    "disruption_id": record.disruption_id,
                    "action": record.action.value,
                    "urgency": record.urgency,
                    "created_at": record.created_at.isoformat(),
                },
            )
        except Exception as exc:
            print(f"[decision_archive] Pinecone upsert failed for {record.id}: {exc}")

    def get_many(self, ids: list[str]) -> list[DecisionRecord]:
        wanted = set(ids)
        found: dict[str, DecisionRecord] = {}
        if not self._path.exists():
            return []
        with self._path.open(encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if not line_str:
                    continue
                data = json.loads(line_str)
                if data.get("id") in wanted:
                    found[data["id"]] = DecisionRecord.model_validate(data)
        return [found[i] for i in ids if i in found]

    async def search(self, company_id: str, question: str, top_k: int = 5) -> list[DecisionRecord]:
        try:
            query_vector = await self._embeddings.aembed_query(question)
            matches = query_decisions(company_id, query_vector, top_k=top_k)
            return self.get_many([m["id"] for m in matches if "id" in m])
        except Exception as exc:
            print(f"[decision_archive] Pinecone search failed: {exc}")
            all_records = []
            if self._path.exists():
                with self._path.open(encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            r = DecisionRecord.model_validate(json.loads(line))
                            if r.company_id == company_id:
                                all_records.append(r)
            return all_records[-top_k:]