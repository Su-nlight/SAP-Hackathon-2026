"""Pinecone vector store client with strict multi-tenant namespace isolation."""
from __future__ import annotations

from typing import Any
from ..config import settings

try:
    from pinecone import Pinecone
    _PINECONE_AVAILABLE = True
except ImportError:
    Pinecone = None
    _PINECONE_AVAILABLE = False

_client: Pinecone | None = None


def get_embedding_dimension() -> int:
    model_name = getattr(settings, "embedding_model", "").lower()
    if "gemini" in model_name or "text-embedding-004" in model_name:
        return 768
    return 1536


def get_pinecone() -> Pinecone | None:
    global _client
    if not _PINECONE_AVAILABLE:
        return None
    api_key = getattr(settings, "pinecone_api_key", None)
    if not api_key:
        return None
    if _client is None:
        _client = Pinecone(api_key=api_key)
    return _client


def get_index():
    pc = get_pinecone()
    if not pc:
        return None
    idx_name = getattr(settings, "pinecone_index_name", "decision-archive")
    try:
        return pc.Index(idx_name)
    except Exception as exc:
        print(f"[pinecone_client] Index connection error: {exc}")
        return None


def upsert_decision(
    company_id: str,
    record_id: str,
    embedding: list[float],
    metadata: dict[str, Any] | None = None,
) -> None:
    try:
        idx = get_index()
        if not idx:
            return
        idx.upsert(
            vectors=[(record_id, embedding, metadata or {})],
            namespace=company_id,
        )
    except Exception as exc:
        print(f"[pinecone_client] Upsert failed for {record_id}: {exc}")


def query_decisions(company_id: str, embedding: list[float], top_k: int = 5) -> list[dict]:
    try:
        idx = get_index()
        if not idx:
            return []
        res = idx.query(
            vector=embedding,
            top_k=top_k,
            namespace=company_id,
            include_metadata=True,
        )
        raw_matches = getattr(res, "matches", None)
        if raw_matches is None and isinstance(res, dict):
            raw_matches = res.get("matches", [])

        normalized = []
        for m in (raw_matches or []):
            if isinstance(m, dict):
                normalized.append(m)
            else:
                normalized.append({
                    "id": getattr(m, "id", ""),
                    "score": getattr(m, "score", 0.0),
                    "metadata": getattr(m, "metadata", {}),
                })
        return normalized
    except Exception as exc:
        print(f"[pinecone_client] Query failed: {exc}")
        return []