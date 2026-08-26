"""Writes finalized decisions to a durable JSONL log and optional vector store."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..config import settings
from ..domain.models import DecisionRecord
from ..vectorstore.pinecone_client import query_decisions, upsert_decision

try:
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    _GOOGLE_GENAI_AVAILABLE = True
except ImportError:
    GoogleGenerativeAIEmbeddings = None
    _GOOGLE_GENAI_AVAILABLE = False


class DecisionArchiveService:
    def __init__(self, archive_path: Path | None = None) -> None:
        self._path = archive_path or settings.decisions_archive_path
        self._path.parent.mkdir(parents=True, exist_ok=True)

        self._embeddings = None
        api_key = getattr(settings, "gemini_api_key_resolved", None)
        if _GOOGLE_GENAI_AVAILABLE and api_key:
            try:
                self._embeddings = GoogleGenerativeAIEmbeddings(
                    model=settings.embedding_model,
                    google_api_key=api_key,
                )
            except Exception as exc:
                print(f"[DecisionArchiveService] Failed to initialize embeddings: {exc}")

    async def archive(self, record: DecisionRecord) -> None:
        try:
            line = record.model_dump_json() + "\n"
            with self._path.open("a", encoding="utf-8") as f:
                f.write(line)
        except Exception as exc:
            print(f"[DecisionArchiveService] Error writing to {self._path}: {exc}")
            return

        if self._embeddings:
            try:
                vector = await self._embeddings.aembed_query(record.to_embedding_text())
                metadata = {
                    "disruption_id": record.disruption_id,
                    "target_id": record.target_id,
                    "action": record.action.value if hasattr(record.action, "value") else str(record.action),
                    "company_id": record.company_id,
                }
                upsert_decision(
                    company_id=record.company_id,
                    record_id=record.id,
                    embedding=vector,
                    metadata=metadata,
                )
            except Exception as exc:
                print(f"[DecisionArchiveService] Vector indexing skipped: {exc}")

    def get_many(self, record_ids: list[str]) -> list[DecisionRecord]:
        if not record_ids or not self._path.exists():
            return []
        id_set = set(record_ids)
        records: list[DecisionRecord] = []
        with self._path.open("r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    if data.get("id") in id_set:
                        records.append(DecisionRecord.model_validate(data))
                except Exception:
                    continue
        return records

    async def search(self, company_id: str, question: str, top_k: int = 5) -> list[DecisionRecord]:
        if self._embeddings:
            try:
                query_vector = await self._embeddings.aembed_query(question)
                matches = query_decisions(company_id, query_vector, top_k=top_k)
                if matches:
                    return self.get_many([m["id"] for m in matches if "id" in m])
            except Exception as exc:
                print(f"[DecisionArchiveService] Vector search error ({exc}), using local fallback")

        if not self._path.exists():
            return []
        results: list[DecisionRecord] = []
        terms = set(question.lower().split())
        with self._path.open("r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    if data.get("company_id") == company_id:
                        text = f"{data.get('reason', '')} {data.get('narrative', '')} {data.get('target_id', '')}".lower()
                        if any(t in text for t in terms):
                            results.append(DecisionRecord.model_validate(data))
                except Exception:
                    continue
        return results[:top_k]