" =====================================================================
" ZHEAL_DISRUPTIONS — DDIC table definition (SE11)
"
" Create via SE11:
"   1. Transaction SE11 -> Data type -> Database table -> ZHEAL_DISRUPTIONS
"   2. Delivery class A (application table), maintenance allowed, no log
"   3. Fields as below (MANDT key field, EVENT_ID key field)
"   4. Activate
"
" Field            Key  Data element / type          Length  Notes
" ---------------- ---- ---------------------------- ------- -------------------------------
" MANDT            X    MANDT                        3       client
" EVENT_ID         X    CHAR                         40      e.g. d-suez-2026 (our event id)
" COMPANY_ID            CHAR                         20      tenant, e.g. "acme"
" DISRUPT_TYPE          CHAR                         30      PORT_CLOSURE | FACTORY_SHUTDOWN |
"                                                            STRIKE | WEATHER | CYBER | BLOCKAGE
" TARGET_TYPE           CHAR                         10      node | edge
" TARGET_NODE           CHAR                         40      e.g. P9 (Suez), sap:DE00
" SEVERITY              CHAR                         10      partial | full
" STATUS                CHAR                         10      new | pending | APPROVED |
"                                                            REJECTED | RESOLVED
" START_TS              CHAR                         22      ISO-8601 "2026-08-01T00:00:00Z"
" END_TS                CHAR                         22      ISO-8601 or empty (open-ended)
" CREATED_AT            CHAR                         22      ISO-8601
" CREATED_BY            CHAR                         12      SAP user (ICF basic auth)
" APPROVED_BY           CHAR                         12      SAP user who approved in ALV
" PAYLOAD_JSON          STRING                               full event JSON (for audit)
"
" NOTE: timestamps travel as CHAR22 ISO strings so the Python side
" (datetime.fromisoformat) parses them without conversion logic.
" =====================================================================
