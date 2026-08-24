"""HTTP/ICF provider: talks to the ABAP ICF service over plain JSON.

JSON contract with the ABAP handler (zcl_zheal_http_handler):
  * all keys camelCase ( /UI2/CL_JSON pretty_name='C' )
  * endpoints under <S4_BASE_URL>/sap/zheal/...
  * HTTP Basic auth, validated by the ICF logon procedure (basic auth)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from ..config import settings
from .base import (
    SapDisruptionRow,
    SapHealth,
    SapMaterialInfo,
    SapNodeInfo,
    SapProvider,
)

DEFAULT_TIMEOUT = 10.0


def _dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class S4HttpProvider(SapProvider):
    """Live S/4HANA over HTTP/ICF. Raises SapConnectionError on failure."""

    name = "s4_http_icf"

    def __init__(
        self,
        base_url: str,
        username: str,
        password: str,
        client: str = "000",
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self._base = base_url.rstrip("/")
        self._auth = (username, password)
        self._client = client
        self._timeout = timeout

    # ---- plumbing ---------------------------------------------------
    def _url(self, path: str) -> str:
        return f"{self._base}/sap/zheal/{path}"

    def _request(self, method: str, path: str, json_body: Optional[dict] = None) -> Any:
        """Return parsed JSON or raise SapConnectionError with a readable reason."""
        headers = {"X-SAP-Client": self._client}
        try:
            resp = httpx.request(
                method,
                self._url(path),
                auth=self._auth,
                headers=headers,
                json=json_body,
                timeout=self._timeout,
                verify=settings.sap_verify_tls,
            )
        except httpx.HTTPError as exc:
            raise SapConnectionError(f"network error: {exc.__class__.__name__}: {exc}") from exc
        if resp.status_code >= 400:
            raise SapConnectionError(
                f"SAP returned HTTP {resp.status_code}: {resp.text[:200]}"
            )
        try:
            return resp.json()
        except ValueError as exc:
            raise SapConnectionError(f"SAP returned non-JSON body: {resp.text[:200]}") from exc

    # ---- provider interface -----------------------------------------
    def health(self) -> SapHealth:
        try:
            raw = self._request("GET", "health")
            return SapHealth(
                ok=True,
                system=raw.get("system", ""),
                client=raw.get("client", self._client),
                user=raw.get("user", ""),
                time=_dt(raw.get("time")),
            )
        except SapConnectionError as exc:
            return SapHealth(ok=False, detail=str(exc))

    def fetch_network(self) -> tuple[list[SapNodeInfo], list[SapMaterialInfo]]:
        raw = self._request("GET", "network")
        nodes: list[SapNodeInfo] = []
        for p in raw.get("plants", []):
            nodes.append(SapNodeInfo(
                id=str(p.get("id", "")),
                name=str(p.get("name", "")),
                kind="plant",
                city=str(p.get("city", "")),
                country=str(p.get("country", "")),
                lat=p.get("lat"), lon=p.get("lon"),
            ))
        for c in raw.get("customers", []):
            nodes.append(SapNodeInfo(
                id=str(c.get("id", "")),
                name=str(c.get("name", "")),
                kind="customer",
                city=str(c.get("city", "")),
                country=str(c.get("country", "")),
                lat=c.get("lat"), lon=c.get("lon"),
            ))
        materials = [
            SapMaterialInfo(
                material=str(m.get("material", "")),
                description=str(m.get("description", "")),
                uom=str(m.get("uom", "")),
                weight_kg=m.get("weightKg"),
                total_stock=m.get("totalStock"),
            )
            for m in raw.get("materials", [])
        ]
        return nodes, materials

    def list_disruptions(self) -> list[SapDisruptionRow]:
        raw = self._request("GET", "disruptions")
        rows: list[SapDisruptionRow] = []
        for r in raw.get("disruptions", []):
            rows.append(SapDisruptionRow(
                event_id=str(r.get("eventId", "")),
                company_id=str(r.get("companyId", "")),
                disrupt_type=str(r.get("disruptType", "")),
                target_type=str(r.get("targetType", "node")),
                target_node=str(r.get("targetNode", "")),
                severity=str(r.get("severity", "full")),
                status=str(r.get("status", "")).lower(),
                start_ts=r.get("startTs"), end_ts=r.get("endTs"),
                created_at=r.get("createdAt"),
                created_by=str(r.get("createdBy", "")),
                approved_by=str(r.get("approvedBy", "")),
                payload_json=str(r.get("payloadJson", "")),
            ))
        return rows

    def create_disruption(self, row: SapDisruptionRow) -> SapDisruptionRow:
        body = {
            "eventId": row.event_id,
            "companyId": row.company_id,
            "disruptType": row.disrupt_type,
            "targetType": row.target_type,
            "targetNode": row.target_node,
            "severity": row.severity,
            "status": row.status,
            "startTs": row.start_ts,
            "endTs": row.end_ts,
        }
        self._request("POST", "disruptions", json_body=body)
        return row

    def approve_disruption(self, event_id: str) -> bool:
        self._request("POST", "disruptions/approve", json_body={"eventId": event_id})
        return True

    def resolve_disruption(self, event_id: str) -> bool:
        self._request("POST", "disruptions/resolve", json_body={"eventId": event_id})
        return True


class SapConnectionError(RuntimeError):
    """Raised when the SAP system is unreachable or returns an error."""