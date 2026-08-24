"""SapService: orchestrates the S/4HANA bridge for the rest of the app."""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from typing import Optional

from ..config import settings
from ..domain.geometry import haversine_km
from ..domain.models import DisruptionEvent, Edge, GeoPoint, Network, Node, NodeType
from .base import (
    SapDisruptionRow,
    SapHealth,
    SapMaterialInfo,
    SapNodeInfo,
    SapProvider,
    SapSyncResult,
)
from .http_provider import S4HttpProvider, SapConnectionError
from .null_provider import NullSapProvider, SapNotConfigured


CITY_GEO: dict[str, tuple[float, float]] = {
    "HAMBURG": (53.5511, 9.9937),
    "DALLAS": (32.7767, -96.7970),
    "HEIDELBERG": (49.3988, 8.6724),
    "SAN DIEGO": (32.7157, -117.1611),
    "TORONTO": (43.6532, -79.3832),
    "MIAMI": (25.7617, -80.1918),
    "SEATTLE": (47.6062, -122.3321),
    "MEXICO CITY": (19.4326, -99.1332),
    "AMSTERDAM": (52.3676, 4.9041),
    "LONDON": (51.5074, -0.1278),
    "NEW YORK": (40.7128, -74.0060),
    "CHICAGO": (41.8781, -87.6298),
    "LOS ANGELES": (34.0522, -118.2437),
    "SAN FRANCISCO": (37.7749, -122.4194),
    "BOSTON": (42.3601, -71.0589),
    "AUSTIN": (30.2672, -97.7431),
    "DENVER": (39.7392, -104.9903),
    "PHOENIX": (33.4484, -112.0740),
    "ATLANTA": (33.7490, -84.3880),
    "PORTLAND": (45.5152, -122.6784),
    "VANCOUVER": (49.2827, -123.1207),
    "MONTREAL": (45.5017, -73.5673),
    "CALGARY": (51.0447, -114.0719),
    "BANGALORE": (12.9716, 77.5946),
    "MUMBAI": (19.0760, 72.8777),
    "DELHI": (28.7041, 77.1025),
    "CHENNAI": (13.0827, 80.2707),
    "PUNE": (18.5204, 73.8567),
    "SHANGHAI": (31.2304, 121.4737),
    "SINGAPORE": (1.3521, 103.8198),
    "ROTTERDAM": (51.9244, 4.4777),
    "SUEZ": (29.9668, 32.5498),
    "COLOMBO": (6.9271, 79.8612),
    "JAKARTA": (-6.2088, 106.8456),
    "DUBAI": (25.2048, 55.2708),
    "FRANKFURT": (50.1109, 8.6821),
    "MUNICH": (48.1351, 11.5820),
    "PARIS": (48.8566, 2.3522),
    "MILAN": (45.4642, 9.1900),
    "MADRID": (40.4168, -3.7038),
    "BERLIN": (52.5200, 13.4050),
    "VIENNA": (48.2082, 16.3738),
    "ZURICH": (47.3769, 8.5417),
    "STOCKHOLM": (59.3293, 18.0686),
    "OSLO": (59.9139, 10.7522),
    "HELSINKI": (60.1699, 24.9384),
}


TRANSPORT_NODE_TYPES = {
    NodeType.PORT,
    NodeType.AIRPORT,
    NodeType.RAIL_HUB,
    NodeType.WAREHOUSE,
}


def _geocode(city: str) -> Optional[tuple[float, float]]:
    return CITY_GEO.get(city.strip().upper())


class SapService:
    def __init__(self, provider: Optional[SapProvider] = None) -> None:
        self._lock = threading.Lock()
        self._provider = provider or self._build_provider()
        self._nodes: list[SapNodeInfo] = []
        self._materials: list[SapMaterialInfo] = []
        self._last_sync: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._disruptions_mirrored = 0
        self._health_cache: Optional[SapHealth] = None
        if self._provider.name == "offline":
            self._last_error = getattr(
                self._provider,
                "_reason",
                "SAP bridge offline.",
            )

    @staticmethod
    def _build_provider() -> SapProvider:
        if not settings.sap_base_url:
            return NullSapProvider(
                "SAP_BASE_URL not set — SAP bridge offline (seed network in use)."
            )

        return S4HttpProvider(
            base_url=settings.sap_base_url,
            username=settings.sap_username,
            password=settings.sap_password,
            client=settings.sap_client,
        )

    def status(self) -> dict:
        with self._lock:
            return {
                "sap_connected": self._provider.name != "offline",
                "provider": self._provider.name,
                "last_sync": (
                    self._last_sync.isoformat()
                    if self._last_sync
                    else None
                ),
                "last_error": self._last_error,
                "plants": sum(
                    1 for n in self._nodes if n.kind == "plant"
                ),
                "customers": sum(
                    1 for n in self._nodes if n.kind == "customer"
                ),
                "materials": len(self._materials),
                "disruptions_mirrored": self._disruptions_mirrored,
                "health": self._provider.health().__dict__,
            }

    def sync(self) -> SapSyncResult:
        """Pull master data + mirrored disruptions from S/4HANA."""

        if self._provider.name == "offline":
            self._last_error = "SAP_BASE_URL not set — SAP bridge offline."

            return SapSyncResult(
                ok=False,
                connected=False,
                provider=self._provider.name,
                error=self._last_error,
            )

        try:
            nodes, materials = self._provider.fetch_network()
            rows = self._provider.list_disruptions()

            with self._lock:
                self._nodes = nodes
                self._materials = materials
                self._disruptions_mirrored = len(rows)
                self._last_sync = datetime.now(timezone.utc)
                self._last_error = None

            return SapSyncResult(
                ok=True,
                connected=True,
                provider=self._provider.name,
                pulled_at=self._last_sync,
                plants=sum(1 for n in nodes if n.kind == "plant"),
                customers=sum(1 for n in nodes if n.kind == "customer"),
                materials=len(materials),
                disruptions_mirrored=len(rows),
            )

        except SapConnectionError as exc:
            self._last_error = str(exc)

            return SapSyncResult(
                ok=False,
                connected=True,
                provider=self._provider.name,
                error=str(exc),
            )

    def raw_nodes(self) -> list[SapNodeInfo]:
        with self._lock:
            return list(self._nodes)

    def raw_materials(self) -> list[SapMaterialInfo]:
        with self._lock:
            return list(self._materials)

    def merge_into(self, network: Network) -> Network:
        if self._provider.name == "offline":
            return network

        nodes = dict(network.nodes)
        edges = dict(network.edges)

        transport = [
            n
            for n in nodes.values()
            if n.type in TRANSPORT_NODE_TYPES
            and n.status != "offline"
        ]

        if not transport:
            return network

        for sap in self._nodes:
            geo = _geocode(sap.city)

            if geo is None:
                continue

            nid = f"sap:{sap.id}"

            if nid in nodes:
                continue

            point = GeoPoint(
                lat=geo[0],
                lon=geo[1],
            )

            node_type = (
                NodeType.FACTORY
                if sap.kind == "plant"
                else NodeType.CUSTOMER
            )

            nodes[nid] = Node(
                id=nid,
                name=sap.name,
                type=node_type,
                location=point,
                inventory=0.0,
                metadata={
                    "source": "sap",
                    "sap_kind": sap.kind,
                    "city": sap.city,
                    "country": sap.country,
                    "material_count": 0,
                },
            )
            nearest = min(
                transport,
                key=lambda t: haversine_km(point, t.location),
            )

            dist = haversine_km(
                point,
                nearest.location,
            )

            eid = f"sap-link-{sap.id}"

            edges[eid] = Edge(
                id=eid,
                source=nid,
                target=nearest.id,
                mode="road",
                distance_km=round(dist, 1),
                base_time_hours=round(dist / 40.0, 1),
                base_cost_per_ton=round(dist * 0.02, 2),
                capacity=1.0,
                reliability=0.95,
                co2_per_ton_km=0.06,
            )

        return Network(
            nodes=nodes,
            edges=edges,
        )

    # ---- SAP disruption CRUD -----------------------------------------

    def list_disruptions(self) -> list[SapDisruptionRow]:
        if self._provider.name == "offline":
            raise SapConnectionError("SAP bridge offline.")

        return self._provider.list_disruptions()

    def create_disruption(
        self,
        row: SapDisruptionRow,
    ) -> SapDisruptionRow:
        if self._provider.name == "offline":
            raise SapConnectionError("SAP bridge offline.")

        result = self._provider.create_disruption(row)

        with self._lock:
            self._disruptions_mirrored += 1

        return result

    def approve_disruption(self, event_id: str) -> bool:
        if self._provider.name == "offline":
            raise SapConnectionError("SAP bridge offline.")

        return self._provider.approve_disruption(event_id)

    def resolve_disruption(self, event_id: str) -> bool:
        if self._provider.name == "offline":
            raise SapConnectionError("SAP bridge offline.")

        return self._provider.resolve_disruption(event_id)

    # ---- write-back ---------------------------------------------------

    def mirror_event(
        self,
        event: DisruptionEvent,
        action: str = "created",
    ) -> bool:
        """Mirror a disruption into ZHEAL_DISRUPTION."""

        if self._provider.name == "offline":
            return False

        try:
            row = SapDisruptionRow(
                event_id=event.id,
                company_id=company_id,
                disrupt_type=event.type.value,
                target_type=event.target_type,
                target_node=event.target_id,
                severity=event.severity.value,
                status=(
                    "resolved"
                    if action == "resolved"
                    else "new"
                ),
                start_ts=(
                    event.start_time.isoformat()
                    if event.start_time
                    else None
                ),
                end_ts=(
                    event.expected_end.isoformat()
                    if event.expected_end
                    else None
                ),
                payload_json=json.dumps(
                    event.model_dump(mode="json"),
                    default=str,
                )[:2000],
            )

            if action == "resolved":
                self.resolve_disruption(event.id)
            else:
                self.create_disruption(row)

            return True

        except (
            SapConnectionError,
            SapNotConfigured,
        ):
            return False

    def pull_approvals(
        self,
        log,
        disruption_service,
    ) -> list[str]:
        """Approve local events that were approved inside SAP."""

        if self._provider.name == "offline":
            return []

        try:
            rows = self.list_disruptions()
        except SapConnectionError:
            return []

        approved: list[str] = []

        for row in rows:
            if row.status != "approved":
                continue

            local = log.get(row.event_id)

            if local is None or local.status.value == "resolved":
                continue

            if (
                local.status.value == "active"
                or local.status.value == "pending_review"
            ):
                approved.append(row.event_id)
                disruption_service.resolve(row.event_id)

        return approved
