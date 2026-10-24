# Pravaah Implementation Roadmap

Phased implementation roadmap for Pravaah (IMPACTX 2026, Challenge 09). Build one step at a time; step numbers are referenced from folder READMEs and stay fixed.

**Execution order:** 1 → 2 → 3 → 4 → 5 → 6. All six steps are built. What remains is the open items below, led by the rules verification pass.

**Canonical scenario:** a fictional two-wheeler owner moving Telangana (TS-09) → Karnataka (KA-03), licence expiring on day 21, first in-person slot 18 days away, owner away days 12–25 inclusive (back on day 26), one open Form 35, one unpaid e-challan, a family member's vehicle. No real names or PII.

**Status rule:** a step is ticked when its code is merged and `npm run check`, `npm run build` and the e2e suite pass. "Built" never means rules are verified; see `docs/verification.md`. House rules are in `docs/conventions.md`.

- [x] **Step 1: Foundation and directory structure**
- [x] **Step 2: Planning Engine (data layer, pure scheduler, compliance checks, options & gold tests)**
  - Reviewed and fixed: option ranking now puts a lapsing licence last; owner-away days are inclusive in the seed (back on day 26), which makes the gold days match the project document (31, 40, 32 online / 36 in-person, 37, 12); every gold finish day has its hand arithmetic in `derivation`.
- [x] **Step 3: Design system, app shell & Simulator UI**
  - Reviewed and fixed: UI wording says "modelled" and "unverified"; hard-coded recommendation removed; dependency graph carries basis and sources on every link, a permanent invalidation warning, cycle validation, two-way relations and link reasons in the graph view; ESLint now bans `Date.now`, `new Date()` and `Math.random()` in `engine/` and colour literals in `components/`, `features/`, `state/`; `docs/conventions.md` added.
- [x] **Step 4: Plate parser, household consent, privacy & voice read-back**
  - Reviewed and fixed: parser scores every plate segmentation and offers the alternatives (the series-letter look-alike misparses are gone, with a test per case); one seconds clock for consent and reveals (reveals last 60 s); consent is per vehicle and honours its end date; a delegate never sees the owner's Aadhaar, licence or challans; the speech notice says the browser's speech service receives the audio; saving is blocked on an invalid plate or an unresolved class mismatch; class letters live in the Delhi pack with a basis and an unverified flag; read-back spells series letters with NATO words; no invented deadlines or random plates.
- [x] **Step 5: 3D scenes & story page**
  - Reviewed and fixed: story page and demo guide state only what the engine supports; the scenario tester and the guide's numbers are computed from the engine; "verified", "100% private" and "zero traps" claims removed.
- [x] **Step 6: Metrics harness, judge demo guide & polish**
  - Reviewed and fixed: metric 1 is labelled a regression check and reports how many scenarios test ordering; metric 2 reports the first reading and the "right plate offered" figure separately (the latter is an upper bound); metric 3 adds an online-route-only strategy and a no-online scenario so route choice is separated from scheduling quality, and lists its assumptions; the runner no longer prints "VERIFIED".

- [x] **Application shell, dashboard and plain look**
  - Simplified for citizens: plain official-style look, short copy, one primary action per page, detail behind "more" sections, reviewer pages (Metrics, About) under "For reviewers", route cards show the top three plans with plain wording and select both choices, source links point to the official site.
  - Sidebar and top bar replace the slide-style header and footer; every page uses one content width and `PageHeader`; home is a dashboard (summary, licence runway, needs attention, next up, recommended route, household) and the long introduction moved to `/overview`; nested `<main>` landmarks removed; mobile uses a drawer.

## Open items

1. **Rules verification pass (needs a person).** Read each official source in `docs/verification.md`, then flip `verified` per entry with the checker and date. Replace secondary sources with official ones. Then settle the NOC fee (currently unknown, `Estimate`) and the loan-termination fee (the state mirror shows "No Fee").
2. **Palette: decided.** Plain official-style (white, grey lines, one navy). See `docs/conventions.md`.
3. **Live speech.** Microphone capture is untested. Plate accuracy is measured on 87 typed transcripts only; test with real speakers before quoting a voice figure.
4. **Fee total.** The engine counts two smart-card fees (renewal plus address change), so the official total is ₹1,100; the project document says ₹900. Decide and record which is right.
5. **Gold plans.** Orderings still come from the engine's own links, and GS-05's finish day is not hand-derived. Have someone other than the author re-derive them from the sources.
6. **Plate checks.** RTO codes are not checked for existence (`KA-99-9999` reads as valid); only Delhi has class letters, and those are an unverified assumption.
7. **Add-vehicle flow.** Adding a vehicle stores it with no renewal dates; it does not build a dependency plan for a new registration.
8. **UI translations.** Only the plate read-back is translated (`en`, `hi`, `te`, `kn`); the rest of the interface is English. The Telugu and Kannada read-back still needs native-speaker review.
9. **Bundle size.** The build warns that some chunks exceed 500 kB.
10. **Port 5173.** The e2e suite reuses whatever server is on port 5173; confirm it is this app before trusting a run.

## Curveball Traceability

| Curveball                          | Built in   | Tested in                                                |
| :--------------------------------- | :--------- | :------------------------------------------------------- |
| Pending request rejected mid-demo  | Step 2     | Gold GS-04, Step 3 e2e                                   |
| Jurisdiction has no rule pack      | Steps 2, 3 | Gold GS-05, Step 3 e2e                                   |
| Plate does not match vehicle type  | Step 4     | Parser tests, voice UI tests, voice e2e                  |
| Appointment availability collapses | Steps 2, 3 | Gold GS-03 and GS-12, ranking test, metric 3, Step 3 e2e |
