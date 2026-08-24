"""FastAPI app factory."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.deps import log, sap_service
from .api.routers import auth, disruptions, events, network, routes, sap, scenarios, tenants
from .config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="SupplyChain-Heal",
        description=(
            "Self-healing supply network: disruption-aware routing, "
            "deterministic heal decisions, and a per-company LLM core agent."
        ),
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # hackathon prototype; tighten for production
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for r in (auth, disruptions, routes, network, scenarios, tenants, events, sap):
        app.include_router(r.router)

    @app.get("/")
    async def root():
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "ai_enabled": settings.ai_enabled,
            "default_llm_provider": settings.default_llm_provider,
        }

    @app.get("/healthz")
    async def healthz():
        return {
            "status": "ok",
            "replayed_events": len(log.all()),
            "active_disruptions": len(log.active()),
            "sap_connected": sap_service.status()["sap_connected"],
        }

    @app.on_event("startup")
    async def _sap_sync_on_boot():
        """Pull S/4HANA master data once at boot (non-fatal if unreachable)."""
        if settings.sap_sync_on_boot:
            try:
                sap_service.sync()
            except Exception:  # noqa: BLE001 — boot must never fail on SAP
                pass

    return app


app = create_app()
