"""Domain constants: disruption types, severity, heal actions, node/edge types."""
from __future__ import annotations

from enum import Enum


class NodeType(str, Enum):
    SUPPLIER = "supplier"
    FACTORY = "factory"
    WAREHOUSE = "warehouse"
    PORT = "port"
    AIRPORT = "airport"
    RAIL_HUB = "rail_hub"
    CUSTOMER = "customer"


class EdgeMode(str, Enum):
    SEA = "sea"
    AIR = "air"
    RAIL = "rail"
    ROAD = "road"


class DisruptionType(str, Enum):
    PORT_CLOSURE = "PORT_CLOSURE"
    FACTORY_SHUTDOWN = "FACTORY_SHUTDOWN"
    STRIKE = "STRIKE"
    WEATHER = "WEATHER"
    CYBER = "CYBER"
    BLOCKAGE = "BLOCKAGE"  # e.g. Suez / canal blockage


class Severity(str, Enum):
    PARTIAL = "partial"  # capacity reduction factor
    FULL = "full"        # node/edge offline


class HealAction(str, Enum):
    REROUTE = "reroute"
    WAIT_HOLD = "wait_hold"
    SWITCH_SUPPLIER = "switch_supplier"
    EXPEDITE = "expedite"      # upgrade mode (sea -> air)
    SPLIT = "split"
    ESCALATE = "escalate"


class DisruptionStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    PENDING_REVIEW = "pending_review"


class AgentStatus(str, Enum):
    PARSING = "parsing"
    ASSESSING = "assessing"
    RECOMMENDING = "recommending"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
