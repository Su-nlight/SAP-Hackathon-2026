from __future__ import annotations

from datetime import datetime

from ..domain.constants import DisruptionStatus, DisruptionType, Severity
from ..domain.models import DisruptionEvent
from ..sap.base import SapDisruptionRow
from ..sap.service import SapService
from .disruption_provider import DisruptionProvider


class SapDisruptionProvider(DisruptionProvider):

    def __init__(self, sap: SapService) -> None:
        self._sap = sap

    def _row_to_event(self, row: SapDisruptionRow) -> DisruptionEvent:
        status_map = {
            "NEW": DisruptionStatus.ACTIVE,
            "APPROVED": DisruptionStatus.ACTIVE,
            "ACTIVE": DisruptionStatus.ACTIVE,
            "RESOLVED": DisruptionStatus.RESOLVED,
            "PENDING_REVIEW": DisruptionStatus.PENDING_REVIEW,
        }

        status = status_map.get(
            row.status.upper(),
            DisruptionStatus.ACTIVE,
        )

        return DisruptionEvent(
            id=row.event_id,
            type=DisruptionType(row.disrupt_type),
            target_type=row.target_type,
            target_id=row.target_id,
            severity=Severity(row.severity),
            start_time=datetime.fromisoformat(
                row.start_ts.replace("Z", "+00:00")
            ),
            expected_end=(
                datetime.fromisoformat(
                    row.end_ts.replace("Z", "+00:00")
                )
                if row.end_ts
                else None
            ),
            impact_delay_hours=row.impact_delay,
            capacity_factor=row.capacity_factor,
            source=row.source or "manual",
            raw_text=row.raw_text,
            status=status,
            created_at=(
                datetime.fromisoformat(
                    row.created_at.replace("Z", "+00:00")
                )
                if row.created_at
                else datetime.now()
            ),
            resolved_at=(
                datetime.fromisoformat(
                    row.resolved_at.replace("Z", "+00:00")
                )
                if row.resolved_at
                else None
            ),
            manual_review=row.manual_review,
        )

    def _get_row(self, event_id: str) -> SapDisruptionRow | None:
        rows = self._sap.list_disruptions()

        for row in rows:
            if row.event_id == event_id:
                return row

        return None

    def register(self, event: DisruptionEvent) -> DisruptionEvent:
        row = SapDisruptionRow(
            event_id=event.id,
            company_id="acme",
            disrupt_type=event.type.value,
            target_type=event.target_type,
            target_id=event.target_id,
            severity=event.severity.value,
            status="new",
            start_ts=event.start_time.isoformat(),
            end_ts=event.expected_end.isoformat() if event.expected_end else None,
            impact_delay=event.impact_delay_hours,
            capacity_factor=event.capacity_factor,
            source=event.source,
            raw_text=event.raw_text,
            manual_review=event.manual_review,
            payload_json="",
        )

        self._sap.create_disruption(row)
        return event

    def approve(self, event_id: str) -> DisruptionEvent | None:
        row = self._get_row(event_id)

        if row is None:
            return None

        self._sap.approve_disruption(event_id)

        updated = self._get_row(event_id)

        return self._row_to_event(updated) if updated else None

    def resolve(self, event_id: str) -> DisruptionEvent | None:
        row = self._get_row(event_id)

        if row is None:
            return None

        self._sap.resolve_disruption(event_id)

        updated = self._get_row(event_id)

        return self._row_to_event(updated) if updated else None

    def delete(self, event_id: str) -> bool:
        row = self._get_row(event_id)

        if row is None:
            return False

        return self._sap.delete_disruption(event_id)

    def get(self, event_id: str) -> DisruptionEvent | None:
        row = self._get_row(event_id)

        return self._row_to_event(row) if row else None

    def all(self) -> list[DisruptionEvent]:
        events = []

        for row in self._sap.list_disruptions():
            if not row.event_id:
                continue

            if not row.disrupt_type:
                continue

            if not row.severity:
                continue

            if not row.start_ts:
                continue

            try:
                events.append(self._row_to_event(row))
            except (ValueError, TypeError):
                continue

        return events

    def active(self) -> list[DisruptionEvent]:
        return [
            event
            for event in self.all()
            if event.status == DisruptionStatus.ACTIVE
        ]

    def resolved(self) -> list[DisruptionEvent]:
        return [
            event
            for event in self.all()
            if event.status == DisruptionStatus.RESOLVED
        ]