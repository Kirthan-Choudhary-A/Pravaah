# Gold Standard Fixtures & Scenarios

Houses golden test scenarios asserting topological execution ordering, legal deadlines, latest safe dates (LSD), and named finishing tasks.

## Step 2 Verified Scenarios

- **GS-01**: Scenario A Canonical — Best plan (Resolve + online renewal). Licence renewed online before expiry; Aadhaar after NOC; re-registration visit after the trip; every check passes.
- **GS-02**: Scenario A + `aadhaarEarly` — Invalidates link fires, NOC is redone (+17 days), and the "Aadhaar after NOC" check fails.
- **GS-03**: Scenario A Slot Queue Sensitivity — Slot queue 4 vs `slotCollapse` to 28. At 28, the RTO licence route becomes Missed (booking LSD −19), changing recommendation to online/alternative.
- **GS-04**: Scenario A + `formRejected` — Bank consent added, loan closed on new RC, diff identifies added tasks and fee shifts.
- **GS-05**: Scenario C (Unknown Sikkim Jurisdiction) — Degraded mode; unknown destination tasks, Hidden fees, no invented dates; known steps scheduled deterministically.
- **GS-09**: Scenario B (BH-Series Relocation) — Address updates only; exempt from NOC and re-registration.
- **GS-10**: Scenario A + `tripExtended(7)` — Absence window extended; all in-person appointments occur only when owner is in town.
- **GS-11**: Scenario A Section 49 RC Address Intimation — Shows statutory deadline (Day 30), LSD (Day 25), and Safe status.

## Pending Scenarios (Step 4)

- **GS-06**: Plate Entry & Recognition parser suite (pending Step 4).
- **GS-07**: Multi-vehicle household consent and identity masking audit log (pending Step 4).
- **GS-08**: Multilingual voice read-back intent matching (pending Step 4).
