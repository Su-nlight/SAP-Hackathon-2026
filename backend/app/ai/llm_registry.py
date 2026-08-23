"""Per-company LLM registry — the special feature.

Every tenant (company) carries an LLM config (provider + model +
temperature), editable at runtime via the tenant API. The registry is a
provider factory with a per-company model cache. Default provider is
OmniRouter (OpenAI-compatible endpoint), so the default path is live
out of the box.

API keys NEVER live in config files — only in environment variables.
"""
from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI

from ..config import settings
from ..domain.models import CompanyLLMConfig, LLMProbeResult

# Provider name -> model class factory (returns a langchain BaseChatModel).
# Extend this dict to add a provider; the rest of the system is generic.
PROVIDER_REGISTRY: dict[str, Any] = {
    "omnirouter": lambda cfg: ChatOpenAI(
        model=cfg.model or "auto",
        base_url=settings.omniroute_base_url,
        api_key=settings.omniroute_api_key_resolved,
        temperature=cfg.temperature,
        timeout=settings.ai_timeout_seconds,
    ),
    "openai": lambda cfg: ChatOpenAI(
        model=cfg.model or "gpt-4o-mini",
        api_key=os.environ.get("OPENAI_API_KEY", ""),
        temperature=cfg.temperature,
        timeout=settings.ai_timeout_seconds,
    ),
    "anthropic": lambda cfg: _anthropic(cfg),
    "groq": lambda cfg: _groq(cfg),
    "ollama": lambda cfg: _ollama(cfg),
}


def _anthropic(cfg: CompanyLLMConfig):
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(
        model=cfg.model or "claude-3-5-sonnet-latest",
        api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
        temperature=cfg.temperature,
        timeout=settings.ai_timeout_seconds,
    )


def _groq(cfg: CompanyLLMConfig):
    from langchain_groq import ChatGroq

    return ChatGroq(
        model=cfg.model or "llama-3.3-70b-versatile",
        api_key=os.environ.get("GROQ_API_KEY", ""),
        temperature=cfg.temperature,
        timeout=settings.ai_timeout_seconds,
    )


def _ollama(cfg: CompanyLLMConfig):
    from langchain_ollama import ChatOllama

    return ChatOllama(
        model=cfg.model or "llama3.1",
        base_url=os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=cfg.temperature,
    )


def _provider_import_error(cfg: CompanyLLMConfig) -> Optional[str]:
    """Return a readable reason if the provider's SDK is not installed."""
    required = {
        "anthropic": "langchain-anthropic",
        "groq": "langchain-groq",
        "ollama": "langchain-ollama",
    }.get(cfg.provider)
    if not required:
        return None  # omnirouter/openai ship with langchain-openai (core dep)
    try:
        import importlib  # noqa: PLC0415 — local import

        importlib.import_module(required.replace("-", "_"))
        return None
    except ImportError:
        return (
            f"SDK '{required}' not installed — add it to requirements.txt "
            f"to use provider '{cfg.provider}'."
        )


def list_providers() -> list[str]:
    return sorted(PROVIDER_REGISTRY.keys())


class LLMRegistry:
    """Thread-safe per-company model factory with cache invalidation."""

    def __init__(self, config_path: Path | None = None) -> None:
        self._config_path = config_path or (settings.data_dir / "companies.json")
        self._lock = threading.RLock()
        self._configs: dict[str, CompanyLLMConfig] = {}
        self._cache: dict[str, BaseChatModel] = {}
        self._load()

    # ---- persistence -------------------------------------------------
    def _load(self) -> None:
        if not self._config_path.exists():
            return
        try:
            raw = json.loads(self._config_path.read_text(encoding="utf-8"))
            for item in raw:
                cfg = CompanyLLMConfig.model_validate(item)
                self._configs[cfg.company_id] = cfg
        except Exception:
            # Corrupt config file must not brick the service.
            pass

    def _persist(self) -> None:
        self._config_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [cfg.model_dump() for cfg in self._configs.values()]
        self._config_path.write_text(
            json.dumps(payload, indent=2, default=str), encoding="utf-8"
        )

    # ---- public API --------------------------------------------------
    def get_config(self, company_id: str) -> CompanyLLMConfig:
        with self._lock:
            return self._configs.get(company_id) or CompanyLLMConfig(company_id=company_id)

    def all_configs(self) -> list[CompanyLLMConfig]:
        with self._lock:
            return list(self._configs.values())

    def set_config(self, cfg: CompanyLLMConfig) -> CompanyLLMConfig:
        if cfg.provider not in PROVIDER_REGISTRY:
            raise ValueError(
                f"Unknown provider '{cfg.provider}'. Known: {list_providers()}"
            )
        err = _provider_import_error(cfg)
        if err:
            raise ValueError(err)
        with self._lock:
            self._configs[cfg.company_id] = cfg
            self._cache.pop(cfg.company_id, None)  # invalidate on change
            self._persist()
            return cfg

    def get_chat_model(self, company_id: str) -> BaseChatModel:
        with self._lock:
            cached = self._cache.get(company_id)
            if cached is not None:
                return cached
            cfg = self.get_config(company_id)
            err = _provider_import_error(cfg)
            if err:
                raise RuntimeError(err)
            factory = PROVIDER_REGISTRY[cfg.provider]
            model = factory(cfg)
            self._cache[company_id] = model
            return model

    def test_provider(self, cfg: CompanyLLMConfig) -> LLMProbeResult:
        """Real one-shot probe: builds the model and calls the provider."""
        if cfg.provider not in PROVIDER_REGISTRY:
            return LLMProbeResult(ok=False, provider=cfg.provider, model=cfg.model,
                                  error=f"Unknown provider '{cfg.provider}'")
        import_err = _provider_import_error(cfg)
        if import_err:
            return LLMProbeResult(ok=False, provider=cfg.provider, model=cfg.model,
                                  error=import_err)
        try:
            model = PROVIDER_REGISTRY[cfg.provider](cfg)
            start = time.monotonic()
            resp = model.invoke("Reply with exactly: OK")
            latency = (time.monotonic() - start) * 1000.0
            return LLMProbeResult(
                ok=True, provider=cfg.provider, model=cfg.model,
                latency_ms=round(latency, 1),
            )
        except Exception as exc:  # noqa: BLE001 — probe must never raise
            return LLMProbeResult(ok=False, provider=cfg.provider, model=cfg.model,
                                  error=str(exc)[:300])


# Module-level singleton shared across the app.
registry = LLMRegistry()
