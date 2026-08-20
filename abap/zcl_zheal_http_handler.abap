" =====================================================================
" ZCL_ZHEAL_HTTP_HANDLER
" SAP-side bridge for SupplyChain-Heal.
"
" Exposes the S/4HANA system as JSON over HTTP via ICF:
"   GET  /sap/zheal/health         -> system, client, user, time
"   GET  /sap/zheal/network        -> plants, customers, materials
"                                      (Global Bike master data)
"   GET  /sap/zheal/disruptions    -> rows from ZHEAL_DISRUPTIONS
"   POST /sap/zheal/disruptions    -> insert a mirrored disruption
"   POST /sap/zheal/disruptions/approve  -> status = APPROVED
"   POST /sap/zheal/disruptions/resolve  -> status = RESOLVED
"
" JSON contract: camelCase keys via /UI2/CL_JSON pretty_name=CAMEL_CASE,
" matching the Python S4HttpProvider (backend/app/sap/http_provider.py).
"
" Transport notes:
"   * Auth: HTTP Basic (set the logon procedure in SICF; the handler
"     trusts the ICF-authenticated user, reported as created_by).
"   * Timestamps travel as ISO-8601 CHAR22 strings ("2026-08-01T00:00:00Z")
"     so Python's datetime.fromisoformat can parse them directly.
"
" Create it: SE24 -> Class ZCL_ZHEAL_HTTP_HANDLER, implement
" IF_HTTP_EXTENSION, paste this source, activate.
" =====================================================================

CLASS zcl_zheal_http_handler DEFINITION
  PUBLIC
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_http_extension.

  PRIVATE SECTION.
    TYPES: BEGIN OF ty_plant,
             id      TYPE werks,
             name    TYPE name1,
             city    TYPE ort01,
             country TYPE land1,
           END OF ty_plant,
           ty_plants TYPE STANDARD TABLE OF ty_plant WITH EMPTY KEY.

    TYPES: BEGIN OF ty_customer,
             id      TYPE kunnr,
             name    TYPE name1,
             city    TYPE ort01,
             country TYPE land1,
           END OF ty_customer,
           ty_customers TYPE STANDARD TABLE OF ty_customer WITH EMPTY KEY.

    TYPES: BEGIN OF ty_material,
             material    TYPE matnr,
             description TYPE maktx,
             uom         TYPE meins,
             weight_kg   TYPE p LENGTH 8 DECIMALS 2,
             total_stock TYPE p LENGTH 12 DECIMALS 2,
           END OF ty_material,
           ty_materials TYPE STANDARD TABLE OF ty_material WITH EMPTY KEY.

    TYPES: BEGIN OF ty_network_response,
             plants    TYPE ty_plants,
             customers TYPE ty_customers,
             materials TYPE ty_materials,
           END OF ty_network_response.

    TYPES: BEGIN OF ty_health,
             system TYPE string,
             client TYPE string,
             user   TYPE string,
             time   TYPE string,
           END OF ty_health.

    TYPES: BEGIN OF ty_disruption_response,
             disruptions TYPE zheal_disruptions_tab,
           END OF ty_disruption_response.

    METHODS handle_get
      IMPORTING !server TYPE REF TO if_http_server.
    METHODS handle_post
      IMPORTING !server TYPE REF TO if_http_server.
    METHODS send_json
      IMPORTING !server TYPE REF TO if_http_server
                !json   TYPE string
                !code   TYPE i DEFAULT 200.
    METHODS read_body
      IMPORTING !server TYPE REF TO if_http_server
      RETURNING VALUE(rv_body) TYPE string.
    METHODS auth_user
      RETURNING VALUE(rv_user) TYPE string.

ENDCLASS.

CLASS zcl_zheal_http_handler IMPLEMENTATION.

  METHOD if_http_extension~handle_request.
    CASE server->request->get_method( ).
      WHEN 'GET'.
        handle_get( server ).
      WHEN 'POST'.
        handle_post( server ).
      WHEN OTHERS.
        send_json( server = server
                   json   = `{"error":"method not supported"}`
                   code   = 405 ).
    ENDCASE.
  ENDMETHOD.

  METHOD handle_get.
    DATA(lv_path) = server->request->get_header_field( '~uri' ).
    " /sap/zheal/health | /sap/zheal/network | /sap/zheal/disruptions
    IF lv_path CS '/health'.
      DATA(ls_health) = VALUE ty_health(
        system = 'S/4HANA 1809 / Global Bike'
        client = sy-mandt
        user   = auth_user( )
        time   = |{ cl_abap_utclong=>get_display( cl_abap_utclong=>get_current( ) ) }| ).
      send_json( server = server
                 json   = /ui2/cl_json=>serialize(
                            data        = ls_health
                            pretty_name = /ui2/cl_json=>pretty_name-camel_case ) ).

    ELSEIF lv_path CS '/network'.
      DATA(ls_resp) = VALUE ty_network_response( ).

      " Plants: T001W (plant master) — Global Bike: DE00 Hamburg, US00 Dallas, ...
      SELECT werks AS id, name1 AS name, ort01 AS city, land1 AS country
        FROM t001w
        INTO CORRESPONDING FIELDS OF TABLE @ls_resp-plants
        UP TO 30 ROWS.

      " Customers: KNA1 — Global Bike dealer network
      SELECT kunnr AS id, name1 AS name, ort01 AS city, land1 AS country
        FROM kna1
        INTO CORRESPONDING FIELDS OF TABLE @ls_resp-customers
        UP TO 30 ROWS.

      " Materials: MARA + MAKT text + MARC stock at first plant
      SELECT matnr, meins
        FROM mara
        INTO TABLE @DATA(lt_mara)
        UP TO 30 ROWS.
      LOOP AT lt_mara INTO DATA(ls_mara).
        DATA(ls_mat) = VALUE ty_material( material = ls_mara-matnr
                                          uom      = ls_mara-meins ).
        SELECT SINGLE maktx FROM makt INTO ls_mat-description
          WHERE matnr = ls_mara-matnr AND spras = sy-langu.
        SELECT SINGLE SUM( labst ) FROM marc INTO ls_mat-total_stock
          WHERE matnr = ls_mara-matnr.
        SELECT SINGLE brutto FROM mara INTO ls_mat-weight_kg
          WHERE matnr = ls_mara-matnr.
        APPEND ls_mat TO ls_resp-materials.
      ENDLOOP.

      send_json( server = server
                 json   = /ui2/cl_json=>serialize(
                            data        = ls_resp
                            pretty_name = /ui2/cl_json=>pretty_name-camel_case ) ).

    ELSEIF lv_path CS '/disruptions'.
      DATA(ls_dresp) = VALUE ty_disruption_response( ).
      SELECT * FROM zheal_disruptions
        INTO CORRESPONDING FIELDS OF TABLE @ls_dresp-disruptions
        ORDER BY created_at DESCENDING.
      send_json( server = server
                 json   = /ui2/cl_json=>serialize(
                            data        = ls_dresp
                            pretty_name = /ui2/cl_json=>pretty_name-camel_case ) ).

    ELSE.
      send_json( server = server
                 json   = `{"error":"unknown endpoint"}`
                 code   = 404 ).
    ENDIF.
  ENDMETHOD.

  METHOD handle_post.
    DATA(lv_path) = server->request->get_header_field( '~uri' ).
    DATA(lv_body) = read_body( server ).
    DATA(ls_row)  = VALUE zheal_disruptions( ).

    IF lv_path CS '/approve'.
      /ui2/cl_json=>deserialize(
        EXPORTING json        = lv_body
                  pretty_name = /ui2/cl_json=>pretty_name-camel_case
        CHANGING  data        = ls_row ).
      UPDATE zheal_disruptions
         SET status      = 'APPROVED'
             approved_by = auth_user( )
       WHERE event_id    = ls_row-event_id.
      IF sy-subrc = 0.
        send_json( server = server
                   json   = |{{"eventId":"{ ls_row-event_id }","status":"APPROVED"}}| ).
      ELSE.
        send_json( server = server json = `{"error":"event not found"}` code = 404 ).
      ENDIF.

    ELSEIF lv_path CS '/resolve'.
      /ui2/cl_json=>deserialize(
        EXPORTING json        = lv_body
                  pretty_name = /ui2/cl_json=>pretty_name-camel_case
        CHANGING  data        = ls_row ).
      UPDATE zheal_disruptions
         SET status      = 'RESOLVED'
             approved_by = auth_user( )
       WHERE event_id    = ls_row-event_id.
      IF sy-subrc = 0.
        send_json( server = server
                   json   = |{{"eventId":"{ ls_row-event_id }","status":"RESOLVED"}}| ).
      ELSE.
        send_json( server = server json = `{"error":"event not found"}` code = 404 ).
      ENDIF.

    ELSEIF lv_path CS '/disruptions'.
      /ui2/cl_json=>deserialize(
        EXPORTING json        = lv_body
                  pretty_name = /ui2/cl_json=>pretty_name-camel_case
        CHANGING  data        = ls_row ).
      IF ls_row-event_id IS INITIAL.
        send_json( server = server json = `{"error":"eventId required"}` code = 400 ).
        RETURN.
      ENDIF.
      ls_row-created_by = auth_user( ).
      ls_row-status     = COND #( WHEN ls_row-status IS INITIAL THEN 'new'
                                  ELSE ls_row-status ).
      ls_row-created_at = |{ cl_abap_utclong=>get_display( cl_abap_utclong=>get_current( ) ) }|.
      MODIFY zheal_disruptions FROM ls_row.
      send_json( server = server
                 json   = /ui2/cl_json=>serialize(
                            data        = ls_row
                            pretty_name = /ui2/cl_json=>pretty_name-camel_case )
                 code   = 201 ).

    ELSE.
      send_json( server = server json = `{"error":"unknown endpoint"}` code = 404 ).
    ENDIF.
  ENDMETHOD.

  METHOD send_json.
    server->response->set_status( code = code reason = 'OK' ).
    server->response->set_header_field( name  = 'Content-Type'
                                        value = 'application/json; charset=utf-8' ).
    server->response->set_cdata( json ).
  ENDMETHOD.

  METHOD read_body.
    server->request->get_cdata( RECEIVING data = rv_body ).
  ENDMETHOD.

  METHOD auth_user.
    " Under an ICF Basic-auth logon procedure, sy-uname is the
    " authenticated SAP user (e.g. DEMO, PLANNER).
    rv_user = sy-uname.
  ENDMETHOD.

ENDCLASS.
