"""SAP S/4HANA bridge.

Connects the self-healing network to a real SAP system (S/4HANA 1809,
Global Bike) over HTTP/ICF. The S/4HANA side is implemented by ABAP
deliverables in /abap of the repo root:

  - zcl_zheal_http_handler.abap   ICF handler (SE24 -> IF_HTTP_EXTENSION)
  - zheal_alv_approve.abap        ALV approval worklist (SE38)
  - zheal_create_tables.abap      optional programmatic DDIC table creation

Roles:
  * system of record  - plants/customers/materials are pulled live from
    S/4HANA master data (T001W / KNA1 / MARA+MAKT / MARD) and merged
    into the graph as routable nodes.
  * write-back         - disruptions are mirrored into ZHEAL_DISRUPTIONS;
    the human can approve them inside SAP (ALV report) and the Python
    side polls approvals back.

If S4_BASE_URL is empty the bridge degrades to the Null provider: the
service stays fully functional on seed data and reports an honest
`sap_connected: false` with a reason.
"""
from .base import SapProvider, SapSyncResult
from .http_provider import S4HttpProvider
from .null_provider import NullSapProvider
from .service import SapService

__all__ = [
    "SapProvider",
    "SapSyncResult",
    "S4HttpProvider",
    "NullSapProvider",
    "SapService",
]
