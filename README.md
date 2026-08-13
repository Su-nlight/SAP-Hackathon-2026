# SupplyChain-Heal

Self-healing supply network for SAP Hackfest 2026 — a disruption-aware
routing engine that detects a broken node (port closure, factory shutdown,
strike) and instantly recomputes cost/time-optimal alternatives, with a
LangGraph agent and a per-company LLM core agent (default: your OmniRouter)
wrapping the deterministic core.

```
backend/app/
  api/          FastAPI routers (disruptions, routes, network, scenarios,
                tenants, sap, events/SSE)
  domain/       pure data + math: Pydantic models, composite weights,
                geometry (zero I/O)
  engine/       GraphEngine ABC + NetworkX impl (Dijkstra, Yen k-shortest)
  services/     disruption lifecycle, heal decision table, routing, scenarios
  store/        network store + append-only JSONL event log
  sap/          S/4HANA bridge: HTTP/ICF provider, honest offline Null provider
  ai/           LLM registry (per-company provider switch), LangGraph agent
                (parse -> assess -> recommend -> narrate -> approve interrupt)
  streaming/    asyncio pub/sub -> SSE
abap/           SAP-side deliverables: DDIC table, ICF handler, ALV approval
                report, activation guide (SE11/SE24/SICF/SE38/SE51)
data/           seed network (Global Bike style), cargo manifest, scenarios
scripts/        seed_network.py (regenerates + validates data), run_demo.py
tests/          pytest suite (weights, engine, heal, APIs, LLM switch, SAP)
```

## Design rules

1. **Deterministic core, AI on top.** Paths, costs, heal decisions are pure
   Python (NetworkX). The LangGraph agent parses alerts, assesses impact,
   narrates, and pauses for human approval — it never computes a route.
2. **Event-sourced disruptions.** `data/event_log.jsonl` is append-only;
   network state is derived from seed + active events. Crash recovery and
   replay for free. DELETE resolves an event and the network visibly heals.
3. **Pluggable LLM per company.** `LLMRegistry` builds LangChain models from
   `data/companies.json`; switch a company's provider at runtime via
   `PUT /v1/tenants/{id}/llm-config` (omnirouter | openai | anthropic | groq
   | ollama | azure_openai). `POST .../test` runs a real one-shot probe.
4. **Engine seam.** `engine/base.py` ABC — NetworkX today; HANA Cloud Graph
   or a Rust core drops in as one file without touching services.

## SAP integration (S/4HANA 1809, Global Bike)

S/4HANA is the system of record: plants/customers/materials pulled live from
master data and merged into the graph as routable nodes; every disruption is
mirrored into `ZHEAL_DISRUPTIONS`; approvals happen inside SAP (ALV report)
and flow back. Without `S4_BASE_URL` the bridge shall report `sap_connected: false`
honestly and everything runs on Pre-seeded data.

