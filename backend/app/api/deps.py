"""Dependency injection: build the service graph once, share across requests."""
from __future__ import annotations

import json

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from ..ai.agent.graph import SupplyAgent
from ..ai.agent.nodes import AgentNodes
from ..ai.llm_registry import LLMRegistry, registry as default_registry
from ..auth.security import decode_access_token
from ..auth.service import AuthService, User
from ..config import settings
from ..domain.models import Network, Shipment
from ..engine.networkx_engine import NetworkXEngine
from ..sap.service import SapService
from ..services.disruption_service import DisruptionService
from ..services.heal_engine import HealEngine
from ..services.mock_disruption_provider import MockDisruptionProvider
from ..services.network_service import NetworkService
from ..services.routing_service import RoutingService
from ..services.sap_disruption_provider import SapDisruptionProvider
from ..services.scenario_service import ScenarioService
from ..store.event_log import EventLog
from ..store.network_store import NetworkStore
from ..streaming.hub import SinkHub


def _load_seed_network() -> Network:
    path = settings.data_dir / "network_seed.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    return Network.model_validate(raw)


def _load_shipments() -> list[Shipment]:
    path = settings.data_dir / "cargo_manifest.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [Shipment.model_validate(s) for s in raw]


store = NetworkStore(_load_seed_network())
log = EventLog(settings.event_log_path)
log.load()
hub = SinkHub()
engine = NetworkXEngine()
network_service = NetworkService(store, _load_shipments())
routing_service = RoutingService(engine)

sap_service = SapService()

if settings.data_provider == "sap":
    disruption_provider = SapDisruptionProvider(sap_service)
else:
    disruption_provider = MockDisruptionProvider(log)

disruption_service = DisruptionService(
    store,
    log,
    hub,
    disruption_provider,
)

heal_engine = HealEngine(network_service, routing_service)
scenario_service = ScenarioService(disruption_service)

agent_nodes = AgentNodes(
    default_registry,
    disruption_service,
    network_service,
    heal_engine,
    hub,
)

agent = SupplyAgent(agent_nodes)
_auth_service = AuthService()

bearer_scheme = HTTPBearer(auto_error=False)


def get_llm_registry() -> LLMRegistry:
    return default_registry


def get_network_service() -> NetworkService:
    return network_service


def get_routing_service() -> RoutingService:
    return routing_service


def get_disruption_service() -> DisruptionService:
    return disruption_service


def get_scenario_service() -> ScenarioService:
    return scenario_service


def get_hub() -> SinkHub:
    return hub


def get_agent() -> SupplyAgent:
    return agent


def get_sap_service() -> SapService:
    return sap_service


def get_auth_service() -> AuthService:
    return _auth_service


def get_current_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    identity: dict = Depends(get_current_identity),
    auth: AuthService = Depends(get_auth_service),
) -> User:
    username = identity.get("sub")

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    u = auth.get_user(username)

    if not u:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return u