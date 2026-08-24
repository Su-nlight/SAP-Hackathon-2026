from __future__ import annotations

from datetime import datetime
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


def _sap_ts(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return value[:22]

def _dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class S4HttpProvider(SapProvider):

    name = "s4_http_odata"

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
        self._csrf_token: Optional[str] = None

        self._service_url = (
            f"{self._base}/sap/opu/odata/sap/ZHEAL_ODATA_SRV"
        )

        self._session = httpx.Client(
            auth=self._auth,
            timeout=self._timeout,
            verify=settings.sap_verify_tls,
        )

    def _fetch_csrf_token(self) -> None:
        try:
            response = self._session.get(
                f"{self._service_url}/",
                headers={
                    "X-CSRF-Token": "Fetch",
                    "Accept": "application/json",
                    "sap-client": self._client,
                },
            )
        except httpx.HTTPError as exc:
            raise SapConnectionError(
                f"network error: {exc.__class__.__name__}: {exc}"
            ) from exc

        if response.status_code >= 400:
            raise SapConnectionError(
                f"SAP returned HTTP {response.status_code}: "
                f"{response.text[:300]}"
            )

        token = response.headers.get("x-csrf-token")

        if not token:
            raise SapConnectionError(
                "SAP did not return an X-CSRF-Token"
            )

        self._csrf_token = token

    def _request(
        self,
        method: str,
        path: str,
        json_body: Optional[dict] = None,
    ) -> Any:

        method = method.upper()

        url = f"{self._service_url}/{path.lstrip('/')}"

        headers = {
            "Accept": "application/json",
            "sap-client": self._client,
        }

        if method in {"POST", "PUT", "PATCH", "DELETE"}:

            if not self._csrf_token:
                self._fetch_csrf_token()

            headers["X-CSRF-Token"] = self._csrf_token
            headers["Content-Type"] = "application/json"

        try:
            response = self._session.request(
                method,
                url,
                headers=headers,
                json=json_body,
            )
        except httpx.HTTPError as exc:
            raise SapConnectionError(
                f"network error: {exc.__class__.__name__}: {exc}"
            ) from exc

        if response.status_code == 403 and method in {
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        }:
            self._fetch_csrf_token()

            headers["X-CSRF-Token"] = self._csrf_token

            try:
                response = self._session.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                )
            except httpx.HTTPError as exc:
                raise SapConnectionError(
                    f"network error: {exc.__class__.__name__}: {exc}"
                ) from exc

        if response.status_code >= 400:
            raise SapConnectionError(
                f"SAP returned HTTP {response.status_code}: "
                f"{response.text[:300]}"
            )

        if not response.content:
            return None

        content_type = response.headers.get(
            "content-type",
            "",
        ).lower()

        if "json" not in content_type:
            return response.text

        try:
            return response.json()
        except ValueError as exc:
            raise SapConnectionError(
                f"SAP returned invalid JSON: {response.text[:300]}"
            ) from exc

    def health(self) -> SapHealth:
        try:
            self._request("GET", "")
            return SapHealth(
                ok=True,
                system="S/4HANA",
                client=self._client,
            )
        except SapConnectionError as exc:
            return SapHealth(
                ok=False,
                client=self._client,
                detail=str(exc),
            )

    def fetch_network(
        self,
    ) -> tuple[list[SapNodeInfo], list[SapMaterialInfo]]:
        raise SapConnectionError(
            "Network/master-data OData endpoints are not "
            "available in ZHEAL_ODATA_SRV yet"
        )

    def list_disruptions(self) -> list[SapDisruptionRow]:

        raw = self._request(
            "GET",
            "ZHEAL_DISRUPTIONSet",
        )

        rows: list[SapDisruptionRow] = []

        if not raw:
            return rows

        entries = (
            raw.get("d", {}).get("results", [])
            if isinstance(raw, dict)
            else []
        )

        for r in entries:
            rows.append(
                SapDisruptionRow(
                    event_id=str(r.get("EventId", "")),
                    company_id=str(r.get("CompanyId", "")),
                    disrupt_type=str(r.get("DisruptType", "")),
                    target_type=str(
                        r.get("TargetType", "node")
                    ),
                    target_node=str(
                        r.get("TargetNode", "")
                    ),
                    severity=str(
                        r.get("Severity", "full")
                    ),
                    status=str(
                        r.get("Status", "new")
                    ).lower(),
                    start_ts=r.get("StartTs"),
                    end_ts=r.get("EndTs"),
                    created_at=r.get("CreatedAt"),
                    created_by=str(
                        r.get("CreatedBy", "")
                    ),
                    approved_by=str(
                        r.get("ApprovedBy", "")
                    ),
                    payload_json=str(
                        r.get("PayloadJson", "")
                    ),
                )
            )

        return rows

    def create_disruption(
        self,
        row: SapDisruptionRow,
    ) -> SapDisruptionRow:

        body = {
            "EventId": row.event_id,
            "CompanyId": row.company_id,
            "DisruptType": row.disrupt_type,
            "TargetType": row.target_type,
            "TargetNode": row.target_node,
            "Severity": row.severity,
            "Status": row.status.upper(),
            "StartTs": _sap_ts(row.start_ts),
            "EndTs": _sap_ts(row.end_ts),
            "CreatedBy": row.created_by,
            "PayloadJson": row.payload_json,
        }

        self._request(
            "POST",
            "ZHEAL_DISRUPTIONSet",
            json_body=body,
        )

        return row

    def approve_disruption(
        self,
        event_id: str,
    ) -> bool:

        self._request(
            "PUT",
            f"ZHEAL_DISRUPTIONSet('{event_id}')",
            json_body={
                "Status": "APPROVED",
            },
        )

        return True

    def resolve_disruption(
        self,
        event_id: str,
    ) -> bool:

        self._request(
            "PUT",
            f"ZHEAL_DISRUPTIONSet('{event_id}')",
            json_body={
                "Status": "RESOLVED",
            },
        )

        return True


class SapConnectionError(RuntimeError):
    pass