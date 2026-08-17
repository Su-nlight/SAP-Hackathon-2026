"""NetworkX implementation of GraphEngine: Dijkstra + Yen k-shortest."""
from __future__ import annotations

import itertools
from typing import Optional

import networkx as nx

from ..domain.models import DisruptionEvent, Edge, Network, RouteAlternative, RouteLeg
from ..domain.weights import OFFLINE_MULTIPLIER, composite_weight
from .base import GraphEngine


class NetworkXEngine(GraphEngine):
    """Builds a directed weighted graph from the current network state.

    Edge weights are the composite disruption-aware weights. Edges whose
    time multiplier hits OFFLINE_MULTIPLIER are pruned entirely so Yen's
    algorithm explores only genuinely viable lanes.
    """

    def _build(self, network: Network, active_events: list[DisruptionEvent], alpha: float):
        g = nx.DiGraph()
        for nid in network.nodes:
            g.add_node(nid)
        for eid, edge in network.edges.items():
            w, eff_time, eff_cost = composite_weight(edge, active_events, alpha=alpha)
            if w >= OFFLINE_MULTIPLIER:
                continue  # effectively offline -> not traversable
            g.add_edge(edge.source, edge.target, key=eid, weight=w,
                       time=eff_time, cost=eff_cost, edge_obj=edge)
        return g

    @staticmethod
    def _to_alternative(g: nx.DiGraph, path: list[str], route_id: str) -> RouteAlternative:
        total_time = total_cost = 0.0
        legs: list[RouteLeg] = []
        for a, b in zip(path, path[1:]):
            data = g.get_edge_data(a, b)
            if data is None:
                continue
            edge: Edge = data["edge_obj"]
            legs.append(RouteLeg(
                edge_id=data.get("key", ""),
                mode=edge.mode,
                source=a,
                target=b,
                distance_km=edge.distance_km,
                time_hours=data["time"],
                cost_per_ton=data["cost"],
            ))
            total_time += data["time"]
            total_cost += data["cost"]
        total_risk = sum(
            1.0 - g.get_edge_data(a, b)["edge_obj"].reliability
            for a, b in zip(path, path[1:]) if g.get_edge_data(a, b)
        )
        total_co2 = sum(
            g.get_edge_data(a, b)["edge_obj"].co2_per_ton_km * g.get_edge_data(a, b)["edge_obj"].distance_km
            for a, b in zip(path, path[1:]) if g.get_edge_data(a, b)
        )
        return RouteAlternative(
            route_id=route_id,
            path=path,
            legs=legs,
            total_time_hours=round(total_time, 2),
            total_cost_per_ton=round(total_cost, 2),
            total_risk=round(total_risk, 4),
            total_co2_per_ton=round(total_co2, 2),
            composite_weight=round(sum(
                g.get_edge_data(a, b)["weight"]
                for a, b in zip(path, path[1:]) if g.get_edge_data(a, b)
            ), 4),
        )

    def shortest_path(self, network, source, target, active_events, alpha=0.5):
        g = self._build(network, active_events, alpha)
        if source not in g or target not in g:
            return None
        try:
            path = nx.dijkstra_path(g, source, target, weight="weight")
        except nx.NetworkXNoPath:
            return None
        return self._to_alternative(g, path, f"r1")

    def k_shortest_paths(self, network, source, target, active_events, k=3, alpha=0.5):
        g = self._build(network, active_events, alpha)
        if source not in g or target not in g:
            return []
        try:
            paths = list(itertools.islice(
                nx.shortest_simple_paths(g, source, target, weight="weight"), k
            ))
        except nx.NetworkXNoPath:
            return []
        return [
            self._to_alternative(g, p, f"r{i + 1}")
            for i, p in enumerate(paths)
        ]

    def is_reachable(self, network, source, target, active_events, alpha=0.5):
        g = self._build(network, active_events, alpha)
        if source not in g or target not in g:
            return False
        return nx.has_path(g, source, target)
