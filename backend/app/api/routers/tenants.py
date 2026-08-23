"""Tenant endpoints: the per-company LLM choice feature."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ...ai.llm_registry import LLMRegistry, list_providers
from ...domain.models import CompanyLLMConfig, LLMProbeResult
from ..deps import get_llm_registry

router = APIRouter(prefix="/v1", tags=["tenants"])


@router.get("/llm/providers")
async def llm_providers():
    """What the UI renders in the provider dropdown."""
    return {"providers": list_providers()}


@router.get("/tenants")
async def list_tenants(reg: LLMRegistry = Depends(get_llm_registry)):
    return {"tenants": [cfg.model_dump() for cfg in reg.all_configs()]}


@router.get("/tenants/{company_id}/llm-config")
async def get_llm_config(company_id: str, reg: LLMRegistry = Depends(get_llm_registry)):
    return reg.get_config(company_id).model_dump()


@router.put("/tenants/{company_id}/llm-config")
async def set_llm_config(
    company_id: str,
    body: CompanyLLMConfig,
    reg: LLMRegistry = Depends(get_llm_registry),
):
    """Change a company's LLM core agent at runtime. Takes effect on next alert."""
    body.company_id = company_id
    try:
        cfg = reg.set_config(body)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"updated": cfg.model_dump(), "note": "Effective on next agent invocation."}


@router.post("/tenants/{company_id}/llm-config/test")
async def test_llm_config(
    company_id: str,
    reg: LLMRegistry = Depends(get_llm_registry),
) -> LLMProbeResult:
    """Real one-shot probe against the configured provider. Anti-bluff proof."""
    return reg.test_provider(reg.get_config(company_id))
