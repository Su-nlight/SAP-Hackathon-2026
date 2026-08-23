" =====================================================================
" ZHEAL_APPROVAL_REPORT — classic ALV report for the human-in-the-loop
" approval step INSIDE SAP.
"
" The SupplyChain-Heal engine mirrors every disruption into
" ZHEAL_DISRUPTIONS (status 'new'). The logistics planner opens this
" report in SAP GUI, reviews the pending reroutes, and presses the
" Approve button. Back in Python, POST /v1/sap/pull-approvals picks up
" the APPROVED rows and resumes the LangGraph agent's interrupt.
"
" Run via SE38: program ZHEAL_APPROVAL_REPORT -> Execute.
" The report is intentionally dependency-free (plain ALV grid, no
" function-group wizardry) so it activates cleanly on a training system.
" =====================================================================

REPORT zheal_approval_report.

TABLES: zheal_disruptions.

SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-t01.
PARAMETERS: p_status TYPE zheal_disruptions-status DEFAULT 'new' OBLIGATORY.
SELECTION-SCREEN END OF BLOCK b1.

" ---- data -----------------------------------------------------------
DATA: gt_rows  TYPE TABLE OF zheal_disruptions,
      gs_row   LIKE LINE OF gt_rows,
      gt_sel   TYPE TABLE OF zheal_disruptions,
      go_alv   TYPE REF TO cl_gui_alv_grid,
      go_cust  TYPE REF TO cl_gui_custom_container,
      gv_ok    TYPE c,
      gv_msg   TYPE string,
      gv_user  TYPE sy-uname.

" ---- PAI handlers ----------------------------------------------------
CLASS lcl_events DEFINITION.
  PUBLIC SECTION.
    METHODS on_user_command
      IMPORTING !e_ucomm TYPE sy-ucomm.
ENDCLASS.

CLASS lcl_events IMPLEMENTATION.
  METHOD on_user_command.
    IF e_ucomm = 'APPROVE'.
      DATA(lt_selected) = go_alv->get_selected_rows( ).
      LOOP AT lt_selected INTO DATA(ls_sel).
        READ TABLE gt_rows INTO gs_row INDEX ls_sel-index.
        IF sy-subrc = 0.
          gs_row-status      = 'APPROVED'.
          gs_row-approved_by = gv_user.
          MODIFY zheal_disruptions FROM gs_row.
          IF sy-subrc = 0.
            gv_ok = 'X'.
          ENDIF.
        ENDIF.
      ENDLOOP.
      IF gv_ok = 'X'.
        MESSAGE 'Selected reroutes approved in SAP' TYPE 'S'.
        " refresh the grid with the new statuses
        SELECT * FROM zheal_disruptions INTO TABLE gt_rows
          WHERE status = p_status.
        go_alv->refresh_table_display( ).
      ENDIF.
    ENDIF.
  ENDMETHOD.
ENDCLASS.

DATA: go_events TYPE REF TO lcl_events.

" ---- PBO -------------------------------------------------------------
START-OF-SELECTION.
  gv_user = sy-uname.
  SELECT * FROM zheal_disruptions INTO TABLE gt_rows
    WHERE status = p_status
    ORDER BY created_at DESCENDING.

  IF gt_rows IS INITIAL.
    MESSAGE 'No disruptions with the selected status' TYPE 'I'.
    EXIT.
  ENDIF.

  CALL SCREEN 100.

*----------------------------------------------------------------------*
MODULE status_0100 OUTPUT.
  SET PF-STATUS 'MAIN'."  function: APPROVE (with icon), EXIT
  SET TITLEBAR 'T100'.

  IF go_cust IS INITIAL.
    CREATE OBJECT go_cust
      EXPORTING container_name = 'ALV_CONTAINER'.
    CREATE OBJECT go_alv
      EXPORTING i_parent = go_cust.
    CREATE OBJECT go_events.
    SET HANDLER go_events->on_user_command FOR go_alv.

    go_alv->set_table_for_first_display(
      EXPORTING i_structure_name = 'ZHEAL_DISRUPTIONS'
      CHANGING  it_outtab        = gt_rows ).
  ENDIF.
ENDMODULE.

*----------------------------------------------------------------------*
MODULE user_command_0100 INPUT.
  CASE sy-ucomm.
    WHEN 'EXIT' OR 'BACK' OR 'CANCEL'.
      LEAVE PROGRAM.
    WHEN 'APPROVE'.
      " handled in the event class so the ALV selection is current
  ENDCASE.
ENDMODULE.

*----------------------------------------------------------------------*
MODULE pai_approve INPUT.
  " no-op; approval is driven from the ALV toolbar event
ENDMODULE.

*----------------------------------------------------------------------*
" Screen 100 (SE51): 900x300
"   PBO modules: status_0100
"   PAI modules: user_command_0100, pai_approve
"   Layout: one custom control ALV_CONTAINER filling the screen
"   PF-STATUS MAIN:  EXIT (type E), APPROVE (type B, function code
"   APPROVE, icon ICON_CHECKED, text 'Approve Selected')
"   TITLEBAR T100:  'SupplyChain-Heal — Disruption Approval'
" =====================================================================
