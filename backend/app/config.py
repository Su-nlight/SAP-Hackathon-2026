"""Application configuration via pydantic-settings (env vars + .env file)."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # repo root


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    app_name: str = "supplychain-heal"
    data_dir: Path = BASE_DIR / "data"
    event_log_path: Path = BASE_DIR / "data" / "event_log.jsonl"

    # LLM defaults
    ai_enabled: bool = True
    ai_timeout_seconds: float = 15.0
    default_llm_provider: str = "omnirouter"
    default_llm_model: str = "auto"
    omniroute_base_url: str = "http://omniroute:20128/v1"
    omniroute_api_key: str = ""  # falls back to env OMNIROUTE_API_KEY
    default_temperature: float = 0.2

    # Graph defaults
    default_alpha: float = 0.5  # weight = a*cost + b*time + c*risk + d*emissions

    # SAP S/4HANA bridge (HTTP/ICF). Leave S4_BASE_URL empty to stay
    # offline: the service runs on seed data and reports sap_connected=false.
    sap_base_url: str = ""
    sap_username: str = ""
    sap_password: str = ""
    sap_client: str = "000"
    sap_verify_tls: bool = False
    sap_sync_on_boot: bool = True
    sap_merge_nodes: bool = True

    @property
    def omniroute_api_key_resolved(self) -> str:
        return self.omniroute_api_key or _from_env("OMNIROUTE_API_KEY", "")


def _from_env(name: str, default: str) -> str:
    import os

    return os.environ.get(name, default)


settings = Settings()
