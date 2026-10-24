# ADR 0002: Pure Planning Engine, Rule Pack Layering, and Dual-Horizon Scheduling

## Status

Accepted

## Context

Pravaah requires an intelligent, deterministic planning engine that models inter-state Indian transport regulations across diverse citizen relocation scenarios. Transport administration in India is governed concurrently: federal legislation (Motor Vehicles Act 1988 and Central Motor Vehicles Rules 1989) sets national statutes, while state transport departments implement local rules, slot queues, portal interfaces, and fee schedules.

## Decisions

### 1. Pure Functional Architecture

- **Decision**: The entire engine in `src/engine/` consists of pure, deterministic functions. No DOM, no React, no network requests, and no clock access (`Date.now()`).
- **Rationale**: Transport planning involves complex graph dependencies, critical path tracing, and multi-criteria optimization. Pure functions allow running hundreds of invariant simulations and instant property tests in milliseconds without mocks or side-effect leaks.

### 2. Central + State Layered Rule Packs

- **Decision**: Regulatory data is partitioned into a base `central.json` file and state override packs (`TS.json`, `KA.json`, etc.). State packs inherit all central statutory baselines, overriding or augmenting only state-specific policies or local fees.
- **Rationale**: Avoids duplicating 90% of identical federal rules across 28 states and 8 UTs. If an unmapped state is encountered, the engine gracefully falls back to degraded mode without crashing.

### 3. Dual-Horizon Evaluation (Expected vs Slow Runs)

- **Decision**: Every option combination is evaluated across two parallel temporal horizons:
  1. _Expected Case_: Nominal turnaround times based on standard administrative processing.
  2. _Slow Case_: Pessimistic processing delays (e.g. Form 35 taking 35 days instead of 21).
- **Rationale**: Government bureaucracy exhibits real-world variance. Recommending a pathway that performs well nominally but catastrophically breaches statutory deadlines under minor delays produces fragile advice. Dual-horizon evaluation ensures recommendations are resilient against administrative friction.

## Consequences

- Engine algorithms are 100% portable and reusable across web, mobile, or CLI environments.
- Adding a new state requires authoring only localized overrides in a single small JSON file.
- The user interface can immediately display realistic contingency buffers and trade-offs.
