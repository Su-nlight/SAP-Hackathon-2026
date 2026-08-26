"""Decision-History RAG chat router."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ...services.chat_service import DecisionChatService
from ..deps import get_current_identity, get_decision_chat_service

router = APIRouter(prefix="/v1/chat", tags=["chat"])


class ChatIn(BaseModel):
    message: str = Field(min_length=1)


@router.post("")
async def chat(
    body: ChatIn,
    identity: dict = Depends(get_current_identity),
    chat_service: DecisionChatService = Depends(get_decision_chat_service),
) -> dict:
    company_id = identity.get("company_id")
    if not company_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing company_id")
    return await chat_service.answer(company_id, body.message)