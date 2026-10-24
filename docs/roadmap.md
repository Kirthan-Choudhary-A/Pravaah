# Pravaah Implementation Roadmap

Phased implementation roadmap for Pravaah (IMPACTX 2026, Challenge 09). Build one step at a time; step numbers are referenced from folder READMEs and stay fixed.

**Execution order:** 1 → 2 → 3 → 4 → 6 → 5. Step 5 (3D) is optional and starts only after Step 6.

**Canonical scenario:** a fictional two-wheeler owner moving Telangana (TS-09) → Karnataka (KA-03), licence expiring on day 21, first in-person slot 18 days away, owner away days 12–25, one open Form 35, one unpaid e-challan, a family member's vehicle. No real names or PII.

- [x] **Step 1: Foundation and directory structure**
- [x] **Step 2: Planning Engine (Data layer, pure scheduler, compliance checks, options & gold tests)**
  - Open items from review: recompute the gold-plan days independently (early Aadhaar "+17 days" vs plan 31→40; trip +7 should end day 38 with a 5-day task; 28-day collapse ending day 32 implies a 4-day task) and keep the official total consistent with the project document (₹900 vs the engine's ₹1,100 for two smart-card fees).
  - Rules and regulations: see `docs/verification.md`, section 5. All entries stay `verified: false` until the official source is read.
- [ ] **Step 3: Design system, app shell & Simulator UI**
  - Tokens, layout shell, accessible primitives (text-plus-colour status, keyboard focus).
  - i18n scaffold for `en`, `hi`, `te`, `kn`.
  - ESLint bans on `Date.now`, `Math.random`, `new Date()` in `engine/`, and on colour literals outside `tokens.css`.
  - Move the honesty, privacy and workflow rules into a tracked `docs/conventions.md`.
  - Planner: dependency graph with every edge explained (needs, unlocks, reuses, propagates, invalidates), per-task latest safe date, fee breakdown with official/estimate/scenario/hidden tags, wait/withdraw/resolve table, degraded-mode banner with official links, `SIMULATED` badges, source link and last-checked date on every rule and fee.
  - Simulator: a control for each curveball plus trip extended and early Aadhaar update, with before/after diff.
- [ ] **Step 4: Plate parser, household consent, privacy & voice read-back**
  - Plate parser: positional letter/digit fixes (O/0, B/8, S/5, Z/2, I/1), 1–3 letter series, 1–4 digit number, BH series with an eligibility check. Class mismatch flagged only where the pack defines a series map, otherwise ask.
  - Voice: Indic number words, "double"/"triple", read-back in `en`, `hi`, `te`, `kn`, tap-based alternatives for every key task. Scripted samples and typed input share one parser. Live speech capture is "planned, not tested" until tested. Browser speech sends audio to a cloud service (disclose it); a keyed speech API conflicts with the no-backend rule.
  - Household: consent (request, approval on the member's own device, scope, end date, withdrawal) as pure, tested logic; Aadhaar, licence, engine, chassis and plate masked by default; reveal needs a stated purpose, is time-limited and writes an audit log. Add-vehicle flow for a family member.
- [ ] **Step 5 (optional, after Step 6): 3D vehicle inspection & spatial plan view**
  - Critical planning and legal information must never exist only inside the 3D canvas.
- [ ] **Step 6: Metrics harness, rules verification, story page & final quality pass**
  - Metrics, reported only as measured with the method: dependency-ordering correctness against the 10 gold plans; voice-entry accuracy after read-back on a corpus with letter/digit confusions and regional patterns; share of simulated renewals completed before the latest safe date under scarcity (seeded runs, queues 4–40 days, random trips).
  - Rules verification pass: read each official source in `docs/verification.md`, then flip `verified` per entry with the checker and date. Replace secondary sources with official ones.
  - Accessibility, responsive, e2e, performance, docs. Story page.

## Curveball Traceability

| Curveball                          | Built in   | Tested in                              |
| :--------------------------------- | :--------- | :------------------------------------- |
| Pending request rejected mid-demo  | Step 2     | Step 2 gold plan, Step 3 e2e           |
| Jurisdiction has no rule pack      | Steps 2, 3 | Step 2 unit tests, Step 3 e2e          |
| Plate does not match vehicle type  | Step 4     | Step 4 unit tests, Step 6 voice corpus |
| Appointment availability collapses | Steps 2, 3 | Step 6 scarcity simulation, Step 3 e2e |
