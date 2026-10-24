# Pravaah Implementation Roadmap

Phased implementation roadmap for Pravaah (IMPACTX 2026, Challenge 09). Build one step at a time; step numbers are referenced from folder READMEs and stay fixed.

**Execution order:** 1 → 2 → 3 → 4 → 5 → 6. Steps 1–5 are built; Step 6 is open and holds the work that is scored.

**Canonical scenario:** a fictional two-wheeler owner moving Telangana (TS-09) → Karnataka (KA-03), licence expiring on day 21, first in-person slot 18 days away, owner away days 12–25, one open Form 35, one unpaid e-challan, a family member's vehicle. No real names or PII.

**Status rule:** a step is ticked when its code is merged and `npm run check` and `npm run build` pass. "Built" never means rules are verified; see `docs/verification.md`.

- [x] **Step 1: Foundation and directory structure**
- [x] **Step 2: Planning Engine (Data layer, pure scheduler, compliance checks, options & gold tests)**
  - Open: recompute the gold-plan days independently (early Aadhaar "+17 days" vs plan 31→40; trip +7 should end day 38 with a 5-day task; 28-day collapse ending day 32 implies a 4-day task) and reconcile the official fee total with the project document (₹900 vs the engine's ₹1,100 for two smart-card fees).
  - Rules and regulations: `docs/verification.md`, section 5. All entries stay `verified: false` until the official source is read.
- [x] **Step 3: Design system, app shell & Simulator UI**
  - Built: tokens, layout shell, planner (graph, timeline, fees, stages, options), simulator, sources page.
  - Reviewed and fixed: UI wording now says "modelled" and "unverified"; hard-coded recommendation removed; test-environment `AbortSignal` error fixed; dependency graph now carries basis and sources on every link, a permanent invalidation warning, cycle validation, two-way relations and link reasons in the graph view.
  - Open: ESLint bans on `Date.now`, `Math.random`, `new Date()` in `engine/` and on colour literals outside `tokens.css` (not in `eslint.config.js` yet); a tracked `docs/conventions.md` holding the honesty, privacy and workflow rules (they currently live only in an untracked `CLAUDE.md`); UI translation dictionaries for `en`, `hi`, `te`, `kn` (only read-back words exist).
- [x] **Step 4: Plate parser, household consent, privacy & voice read-back**
  - Built: plate parser, read-back, consent, masking, reveal with audit log, household and voice pages.
  - Open, not yet reviewed: consent end dates and withdrawal; add-vehicle flow for a family member; tap-based alternatives for every key task; whether live speech capture works (state "planned, not tested" until it is tested); browser speech sends audio to a cloud service, so disclose it.
- [x] **Step 5: 3D scenes & story page**
  - Built: hero plate, plan landscape, architecture stack, story page.
  - Reviewed and fixed: story page copy no longer states unverified rules as law, invents rule ids, lead times or consequences, or falls back to hard-coded stats; its trap section now matches the engine's modelled rule.
  - Open: the build warns of chunks over 500 kB, so check that the 3D code loads lazily; critical planning and legal information must never exist only inside a 3D canvas.
- [ ] **Step 6: Metrics harness, rules verification & final quality pass**
  - Metrics, reported only as measured with the method: dependency-ordering correctness against the 10 gold plans; voice-entry accuracy after read-back on a corpus with letter/digit confusions and regional patterns; share of simulated renewals completed before the latest safe date under scarcity (seeded runs, queues 4–40 days, random trips). A seeded random-number generator is passed in as an argument (no `Math.random`).
  - Rules verification pass: read each official source in `docs/verification.md`, then flip `verified` per entry with the checker and date. Replace secondary sources with official ones. Then re-tag the NOC fee and the loan-termination fee from the official schedule.
  - Close the open items listed under Steps 2–5.
  - Accessibility, responsive, e2e (including running the Playwright suite), performance, docs.

## Curveball Traceability

| Curveball                          | Built in   | Tested in                              |
| :--------------------------------- | :--------- | :------------------------------------- |
| Pending request rejected mid-demo  | Step 2     | Step 2 gold plan, Step 3 e2e           |
| Jurisdiction has no rule pack      | Steps 2, 3 | Step 2 unit tests, Step 3 e2e          |
| Plate does not match vehicle type  | Step 4     | Step 4 unit tests, Step 6 voice corpus |
| Appointment availability collapses | Steps 2, 3 | Step 6 scarcity simulation, Step 3 e2e |
