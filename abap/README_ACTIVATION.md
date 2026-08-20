# SAP S/4HANA Bridge — ABAP Activation Guide

This is the SAP-side half of the SupplyChain-Heal integration. The Python
side (`backend/app/sap/`) already exists and is tested. These instructions
take the ABAP deliverables in this folder from source files to a live ICF
service that the Python app can call.

System: S/4HANA 1809 (ABAP Platform 1809), enterprise Global Bike.
You need: a user with SE11, SE24, SICF, SE38, SE51 authorization (you said
you have this).

---

## 0. What you are building

| Component | Object | Where |
|---|---|---|
| Disruption log table | `ZHEAL_DISRUPTIONS` | SE11 |
| JSON-over-HTTP bridge | `ZCL_ZHEAL_HTTP_HANDLER` | SE24 (IF_HTTP_EXTENSION) |
| ICF service node | `/sap/zheal` | SICF |
| Approval report (ALV) | `ZHEAL_APPROVAL_REPORT` + screen 100 | SE38 / SE51 |

Endpoints once live (Basic auth, camelCase JSON):

```
GET  /sap/zheal/health
GET  /sap/zheal/network
GET  /sap/zheal/disruptions
POST /sap/zheal/disruptions
POST /sap/zheal/disruptions/approve
POST /sap/zheal/disruptions/resolve
```

---

## 1. Create the table (SE11)

1. `/nse11` → Data type → **Database table** → name `ZHEAL_DISRUPTIONS` → Create.
2. Delivery Class: **A (Application table)**. Display/Maintenance: allowed.
3. Fields, in order (all with MANDT as first key field, EVENT_ID as second):

| Field | Data element/type | Length | Key | Notes |
|---|---|---|---|---|
| MANDT | MANDT | 3 | X | client |
| EVENT_ID | CHAR | 40 | X | our event id, e.g. d-suez-2026 |
| COMPANY_ID | CHAR | 20 | | tenant, e.g. acme |
| DISRUPT_TYPE | CHAR | 30 | | PORT_CLOSURE, FACTORY_SHUTDOWN, STRIKE, WEATHER, CYBER, BLOCKAGE |
| TARGET_TYPE | CHAR | 10 | | node or edge |
| TARGET_NODE | CHAR | 40 | | e.g. P9 (Suez), sap:DE00 |
| SEVERITY | CHAR | 10 | | partial, full |
| STATUS | CHAR | 10 | | new, pending, APPROVED, REJECTED, RESOLVED |
| START_TS | CHAR | 22 | | ISO-8601 "2026-08-01T00:00:00Z" |
| END_TS | CHAR | 22 | | ISO-8601 or empty = open-ended |
| CREATED_AT | CHAR | 22 | | ISO-8601 |
| CREATED_BY | CHAR | 12 | | SAP user from Basic auth |
| APPROVED_BY | CHAR | 12 | | SAP user who approved in ALV |
| PAYLOAD_JSON | STRING | | | full event JSON (audit) |

4. Technical settings: no log data changes, no buffering.
5. **Activate** (Ctrl+F3). Table and structure `ZHEAL_DISRUPTIONS_TAB`
   (line type) and `ZHEAL_DISRUPTIONS_T` (table type) are generated
   automatically — the ABAP handler uses `zheal_disruptions_tab`.

---

## 2. Create the handler class (SE24)

1. `/nse24` → Object type name `ZCL_ZHEAL_HTTP_HANDLER` → Create.
2. Inst. method: Public. Class type: Usual ABAP class. Activate.
3. Tab **Interfaces** → Add → `IF_HTTP_EXTENSION`.
4. Tab **Methods** → Add the private methods exactly as in the source:
   `HANDLE_GET`, `HANDLE_POST`, `SEND_JSON`, `READ_BODY`, `AUTH_USER`.
5. Double-click each method → paste the implementation from
   `zcl_zheal_http_handler.abap`.
6. **Activate the whole class** (Ctrl+F3).

The class uses only standard objects available on 1809:
`/UI2/CL_JSON` (camelCase pretty name), `CL_ABAP_UTCLONG` (UTC
timestamps), `T001W` / `KNA1` / `MARA` / `MAKT` / `MARC` (master data).

---

## 3. Activate the ICF service (SICF)

1. `/nsicf` → right-click `default_host` → **Execute**.
2. Navigate: `default_host` → `sap` → (if not present, create it).
3. Right-click the `sap` node → **Create Host/Service**:
   - Name: `zheal`
   - Description: `SupplyChain-Heal bridge (JSON)`
   - Handler: tab **Handler** → Handler list → insert:
     `Class: ZCL_ZHEAL_HTTP_HANDLER`, Handler order: 10.
   - Tab **Logon Data**: Procedure: `Basic Authentication` (this is what
     makes HTTP Basic with your SAP user/password work).
   - Tab **Error Pages**: leave defaults.
4. **Save**, then right-click `zheal` → **Activate Service**.
5. Verify from the same machine:
   `curl -u USER:PASS "http://<host>:8000/sap/zheal/health"` →
   should return JSON with `"system":"S/4HANA 1809 / Global Bike"`.

Notes:
- If the system is reached through a message server / load balancer, use
  the dispatcher's HTTP port (normally 8000 for the application server).
- If a specific client is required, the Python provider sends
  `X-SAP-Client`; or append `?sap-client=001` in the URL — the handler
  doesn't care, sy-mandt is reported in health.

---

## 4. Create the approval report (SE38 + SE51)

1. `/nse38` → Program `ZHEAL_APPROVAL_REPORT` → Create (source code).
2. Paste `zheal_approval_report.abap`. Activate.
3. `/nse51` → Program `ZHEAL_APPROVAL_REPORT` → Create screen `100`:
   - Layout: draw one **custom control**, name `ALV_CONTAINER`, fill the
     whole screen.
   - Flow logic:
     - PBO: `MODULE status_0100.`
     - PAI: `MODULE user_command_0100.` and `MODULE pai_approve.`
   - **Menu bar** (double-click MAIN in the PBO module):
     - Function `EXIT` — type E — function code `EXIT`.
     - Function `APPROVE` — type B — function code `APPROVE` —
       icon `ICON_CHECKED` — text "Approve Selected".
   - **Title bar** `T100`: "SupplyChain-Heal — Disruption Approval".
4. Activate screen, then run the report (`/nse38` → Execute).

Workflow: the planner selects pending rows and presses **Approve
Selected**; status flips to APPROVED with `approved_by` set. Back in
Python, `POST /v1/sap/pull-approvals` fetches the approved rows and
resumes the LangGraph agent's interrupt — approval made in SAP, effect
in the self-healing engine.

---

## 5. Connect the Python side

In `/opt/data/supplychain-heal/.env` (or environment):

```
S4_BASE_URL=http://<host>:8000
S4_USERNAME=DEMO
S4_PASSWORD=<your password>
S4_CLIENT=001
SAP_SYNC_ON_BOOT=true
SAP_MERGE_NODES=true
```

Then restart the service and check:

```
curl http://127.0.0.1:8021/v1/sap/status
# -> sap_connected: true, provider: s4_http_icf, plants/customers/materials counts
```

Boot-time sync pulls Global Bike plants (DE00 Hamburg, US00 Dallas, ...),
customers, and materials (OR-1000 deluxe touring bike, ...) and merges
them into the routing graph as routable nodes with road-feeder edges.
Every disruption you inject is mirrored into ZHEAL_DISRUPTIONS, and
approvals made in the ALV report flow back. If S4_BASE_URL is unset the
whole bridge reports `sap_connected: false` honestly and the service
keeps running on seed data — the demo never breaks either way.

---

## 6. Smoke test end to end

1. In Python: `POST /v1/disruptions` with a port closure on a SAP node
   (e.g. `sap:DE00`).
2. In SAP GUI: `/nse38` → run `ZHEAL_APPROVAL_REPORT` → see the row with
   status `new` → select → **Approve Selected**.
3. In Python: `POST /v1/sap/pull-approvals` → returns `["d-..."]` and
   the local event resolves; the network heals and SSE emits
   `network.healed`.
4. Dashboard (M5) shows the full arc: fracture → reroute → approve in
   SAP → heal.
