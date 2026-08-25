"""Chat with the AI about past decisions only — strictly tenant-scoped."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..deps import get_current_identity, get_decision_chat_service
from ...services.chat_service import DecisionChatService

router = APIRouter(prefix="/v1/chat", tags=["chat"])


class ChatIn(BaseModel):
    message: str = Field(min_length=1)


@router.post("")
async def chat(
    body: ChatIn,
    identity: dict = Depends(get_current_identity),
    chat_service: DecisionChatService = Depends(get_decision_chat_service),
) -> dict:
    return await chat_service.answer(identity["company_id"], body.message)