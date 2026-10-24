# Pravaah Implementation Roadmap

Phased implementation roadmap for Pravaah (IMPACTX 2026, Challenge 09). Build one step at a time; step numbers are referenced from folder READMEs and stay fixed.

**Execution order:** 1 → 2 → 3 → 4a → 4b → 4c → 5 → 6 → 7 → 8 → 9 → 13 → 14. Steps 10–12 (3D and story) are optional and start only after Step 14.

- [x] **Step 1: Foundation and directory structure**
- [ ] **Step 2: Design system, app shell, i18n scaffold, guardrails**
  - Tokens, layout shell, accessible primitives (text-plus-colour status, keyboard focus).
  - i18n scaffold for `en`, `hi`, `kn`, `mr` (Marathi, for the MH→KA scenario). Keep `te` only if a Telangana pack is verified.
  - ESLint bans on `Date.now`, `Math.random`, `new Date()` in `engine/`, and on colour literals outside `tokens.css`.
  - Move the honesty, privacy and workflow rules into a tracked `docs/conventions.md`.
- [ ] **Step 3: Data layer: schemas, sources, rule packs, scenarios, assumptions**
  - Rule schema: `version`, `effectiveFrom`, `basis` (`statute` | `notification` | `state-portal` | `modelled`), `verified`, `officialUrl`, `lastChecked`.
  - Fee schema: components, `estimate` | `official` label, freshness label, `officialUrl`, `lastChecked`.
  - Per-rule-pack fields: renewal window, grace period, late-fee tiers, faceless-service availability, plate series to vehicle-class map (only where a state defines one).
  - Rule packs: MH, KA, DL (TS only if verified). Everything unverified stays `verified: false` + `TODO_VERIFY`.
  - Scenarios (fictional): Ramesh (DL expiring, MH→KA, pending Form 35, unpaid challan, scarce slots), spouse's two-wheeler, a family member adding a vehicle. One consistent set of demo numbers across all scenarios.
  - Assumptions: all timing values labelled "assumed".
  - Ingest the project's database files here, each with its source and date.
  - Verify before encoding: interstate RC route (NOC then re-registration vs address change), DL renewal window, grace period and late fees, e-challan blocking rules.
- [ ] **Step 4a: Engine model and typed dependency links**
  - Entities: vehicles, licences, documents, tasks.
  - Links typed `requires` | `unlocks` | `invalidates` | `propagates`, each with a reason, a source and an official/assumed flag. Graph validation (acyclic).
- [ ] **Step 4b: Engine scheduling and latest safe dates**
  - Topological order and critical path (named, per the time model).
  - Latest safe date per task, propagated backwards through the graph.
  - Inputs: expiry, renewal window, grace period, late-fee tiers, appointment wait, scarcity buffer, scrutiny time.
- [ ] **Step 4c: Engine checks, jurisdiction resolution, plate parsing, gold plans**
  - Eligibility, document validity, blocked-by-pending-request detection.
  - Jurisdiction resolver returns an explicit `RULES_UNKNOWN` result (never defaults).
  - Plate parser: 1–3 letter series, 1–4 digit number, BH series; vehicle-type mismatch flagged only where the pack defines a series map, otherwise ask.
  - Gold plans: at least 8 scenarios, hand-authored from rule-pack sources (never snapshots of engine output). Gold #1 is Ramesh: renew the DL first without an address change, then settle the challan, resolve Form 35, get the NOC, and update Aadhaar and addresses last.
- [ ] **Step 5: Engine options: comparison, fees, events, before/after diff**
  - Pending-request options: wait / withdraw / resolve, each with time, cost and consequence, all marked assumed.
  - Fee estimator with component breakdown, estimate/official and freshness labels.
  - Events: request rejected, slot availability collapses, rule pack missing, vehicle-type mismatch. Each recomputes the graph and dates; before/after diff.
  - Seeded random-number generator passed in as an argument (no `Math.random`).
- [ ] **Step 6: Planner UI**
  - Dependency graph with every edge explained, per-task latest safe date, fee breakdown, options table, degraded-mode banner, `SIMULATED` badges, source link and last-checked date on every rule and fee.
- [ ] **Step 7: Simulator UI**
  - Demo controls for each curveball, before/after diff view.
- [ ] **Step 8: Household and privacy**
  - Consent model (grant, revoke, expiry, per-field scope) as pure, tested logic; masking by default; reveal requires a stated purpose and writes an audit log.
  - Add-vehicle flow for a family member.
- [ ] **Step 9: Voice and plate entry, multilingual read-back**
  - Letter/digit confusion (O/0, B/8, S/5), Indic number words, "double"/"triple", read-back in `en`, `hi`, `kn`, `mr`, with tap-based alternatives for every key task.
- [ ] **Step 10 (optional, after Step 14): 3D infrastructure and hero scene**
- [ ] **Step 11 (optional, after Step 14): 3D plan view**
- [ ] **Step 12 (optional, after Step 14): Story page and scroll choreography**
- [ ] **Step 13: Metrics harness**
  - Dependency-ordering correctness against the gold plans (at least 8).
  - Voice-entry accuracy after read-back, on a corpus with letter/digit confusions and regional patterns.
  - Share of simulated renewals completed before the latest safe date under appointment scarcity (seeded runs).
- [ ] **Step 14: Quality pass: accessibility, responsive, e2e, performance, docs**

## Curveball Traceability

| Curveball                          | Built in    | Tested in                                |
| :--------------------------------- | :---------- | :--------------------------------------- |
| Pending request rejected mid-demo  | Step 5      | Step 4c gold plan, Step 7 e2e            |
| Jurisdiction has no rule pack      | Steps 4c, 6 | Step 4c unit tests, Step 7 e2e           |
| Plate does not match vehicle type  | Steps 4c, 9 | Step 4c unit tests, Step 13 voice corpus |
| Appointment availability collapses | Steps 5, 7  | Step 13 scarcity simulation, Step 7 e2e  |
