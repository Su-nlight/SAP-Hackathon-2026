"""Pinecone index wrapper. Tenant isolation via namespace."""
from __future__ import annotations

from pinecone import Pinecone, ServerlessSpec

from ..config import settings

# If using Gemini embeddings use 768; if using OpenAI text-embedding-3-small use 1536
EMBEDDING_DIM = 768 if "gemini" in getattr(settings, "embedding_model", "").lower() or getattr(settings, "gemini_api_key_resolved", None) else 1536

pc: Pinecone | None = None
if getattr(settings, "pinecone_api_key", None):
    try:
        pc = Pinecone(api_key=settings.pinecone_api_key)
    except Exception as exc:
        print(f"[pinecone_client] Pinecone client init failed: {exc}")
        pc = None


def get_index():
    if not pc or not settings.pinecone_index_name:
        return None
    try:
        existing = [i.name for i in pc.list_indexes()]
        if settings.pinecone_index_name not in existing:
            pc.create_index(
                name=settings.pinecone_index_name,
                dimension=EMBEDDING_DIM,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        return pc.Index(settings.pinecone_index_name)
    except Exception as exc:
        print(f"[pinecone_client] Failed to access/create index: {exc}")
        return None


def upsert_decision(record_id: str, company_id: str, embedding: list[float], metadata: dict) -> None:
    try:
        idx = get_index()
        if idx:
            idx.upsert(
                vectors=[{"id": record_id, "values": embedding, "metadata": metadata}],
                namespace=company_id,
            )
    except Exception as exc:
        print(f"[pinecone_client] Upsert failed for {record_id}: {exc}")


def query_decisions(company_id: str, embedding: list[float], top_k: int = 5) -> list[dict]:
    try:
        idx = get_index()
        if not idx:
            return []
        result = idx.query(
            vector=embedding,
            top_k=top_k,
            namespace=company_id,
            include_metadata=True,
        )
        return result.get("matches", [])
    except Exception as exc:
        print(f"[pinecone_client] Query failed for {company_id}: {exc}")
        return []