# Pravaah Pure Planning Engine Specification

This document details the mathematical, topological, and legal domain logic implemented in the Pravaah planning engine.

---

## 1. Mathematical Time Model & Conventions

- **Pure & Deterministic**: The engine executes zero I/O, zero network requests, zero browser/DOM interaction, and zero non-deterministic operations (`Date.now()` or `Math.random()`).
- **Relative Time Origin**: "Today" is Day 0. All dates and deadlines are expressed as non-negative integer days relative to Day 0.
- **Half-Open Intervals**: Every task occupies a half-open temporal interval `[start, end)` where:
  $$\text{end} = \text{start} + \text{duration}$$
  A task ending on Day $X$ means its deliverables and statutory statuses are ready at the start of Day $X$.
- **Plan Finish**:
  $$\text{finish} = \max_{T \in \text{Tasks}} (\text{end}(T))$$
  The report explicitly names the critical task that sets this value.

---

## 2. Scheduling Formulas & Worked Example (Scenario A)

### Forward Pass (Earliest Start)

1. **Prerequisite Resolution**:
   For any task $T$, $T$ cannot start before all its preceding dependency tasks $P \in \text{Preds}(T)$ have completed:
   $$\text{earliestStart}(T) = \max_{P \in \text{Preds}(T)} (\text{end}(P))$$
2. **In-Person Appointments**:
   - In-person tasks start on their visit day.
   - An appointment cannot occur before the earliest available slot: $\text{visitDay} \ge \text{slotQueue}$.
   - An appointment cannot occur while the applicant is away on scheduled travel:
     $$\text{visitDay} \notin [\text{tripStart}, \text{tripEnd})$$
   - If an appointment falls within travel dates, it shifts to $\text{tripEnd}$ (the day the citizen returns).

### Backward Pass (Latest Safe Date — LSD)

1. **Latest Finish ($\text{LF}$)**:
   $$\text{LF}(T) = \min\left( \text{ownDeadline}(T), \min_{D \in \text{Dependants}(T)} (\text{LSD}(D)) \right)$$
   (Defaults to $\text{finish}$ if unconstrained by deadlines or dependants).
2. **Online Tasks**:
   $$\text{LSD}(T) = \text{LF}(T) - \text{duration}(T) - \text{onlineBuffer}$$
   _(where $\text{onlineBuffer} = 2$ days)_.
3. **In-Person Tasks**:
   - Safety buffer $\beta$:
     $$\beta = \max(2, \lceil 0.3 \times \text{slotQueue} \rceil)$$
   - Latest Visit ($\text{LV}$):
     $$\text{LV}(T) = \text{LF}(T) - \text{duration}(T) - \beta$$
     _If $\text{LV}$ falls inside an absence window $[\text{tripStart}, \text{tripEnd})$, it shifts to $\text{tripStart} - 1$ (the day before departure)._
   - Booking LSD:
     $$\text{bookingLSD}(T) = \text{LV}(T) - \text{slotQueue}$$
   - For in-person tasks, $\text{LSD}(T) = \text{bookingLSD}(T)$.
4. **Slack & Status Categorization**:
   - $\text{slack}(T) = \text{LSD}(T) - \text{start}(T)$ (or $\text{bookingLSD} - 0$ for appointments).
   - $\text{slack} \ge 3 \implies \mathbf{Safe}$
   - $0 \le \text{slack} < 3 \implies \mathbf{At\ risk}$
   - $\text{slack} < 0 \implies \mathbf{Missed}$

### Worked Example: Scenario A (Canonical)

- **Parameters**: Licence expires Day 21; slot queue = 18 days; owner away Days 12–25.
- **Trace**:
  1. `rental-agreement`: Days [0, 3).
  2. `pay-echallan`: Days [0, 1).
  3. `form35-action` (resolve): Days [0, 9).
  4. `noc-form28`: Depends on challan (1) and Form 35 (9) $\implies$ starts Day 9, duration 10 $\implies$ Days [9, 19).
  5. `re-registration-form27`: Needs NOC (Day 19) + slot queue (18). Falls into absence [12, 25) $\implies$ visit shifts to Day 25. Duration 4 $\implies$ Days [25, 29).
  6. `aadhaar-update`: Sequenced after NOC (Day 19), duration 7 $\implies$ Days [19, 26).
  7. `licence-renewal` (online): Days [0, 5). Well before Day 21 expiry.
  8. `licence-address-change`: Propagated by updated Aadhaar (Day 26), duration 5 $\implies$ Days [26, 31).
  9. **Plan Finish**: Day 31, driven by `licence-address-change`.

---

## 3. Decision Ranking Order

When evaluating candidate option pathways, `compareOptions` ranks combinations via strict hierarchical multi-criteria evaluation:

1. **Deadline Breaches**: Number of statutory deadline misses in expected case (fewer is better).
2. **Slow-Case Breaches**: Number of deadline misses under pessimistic turnaround (fewer is better).
3. **Unknown Steps**: Missing state regulatory requirements (fewer is better).
4. **Failed Compliance Checks**: Number of legal invariant failures (fewer is better).
5. **Expected Finish Day**: Calendar completion day (earlier is better).
6. **Slow-Case Finish Day**: Completion under delayed conditions (earlier is better).
7. **Extra Administrative Steps**: Additional paperwork such as re-filing loans or obtaining bank consent (fewer is better).
8. **Official Fees**: Statutory fees payable to government authorities (lower is better).
9. **Physical Visits**: Total number of required in-person visits to RTO counters (fewer is better).

---

## 4. Layered Rule Pack Architecture

```
┌────────────────────────────────────────────────────────┐
│                      Central Pack                      │
│        MV Act 1988 (ss. 14, 15, 47, 48, 49) & CMVR     │
│        Universal statutory baselines, fees & stages    │
└───────────────────────────┬────────────────────────────┘
                            │
               Overrides &  │ State Additions
                            ▼
┌────────────────────────────────────────────────────────┐
│                   State Rule Pack                      │
│     (TS.json, KA.json, MH.json, TN.json, DL.json)      │
│   e.g. Local user charges, postal fees, RTO portals    │
└────────────────────────────────────────────────────────┘
```

1. **Base**: Central rules apply universally across all Indian states and Union Territories.
2. **State Overrides**: A state file supplies overrides or supplemental fees (e.g. Karnataka user facilitation charges).
3. **Immutability**: Merging produces an immutable runtime `RulePack` object passed as pure arguments into engine calculations.

---

## 5. Degraded Mode (Unknown State Jurisdictions)

When a destination state has no authored rule pack (e.g. Sikkim `SK` in Scenario C):

- The engine marks `degradedMode = true`.
- Destination-specific tasks (e.g. Form 27 re-registration in Gangtok) are created with `unknown: true`, duration 0, and status `Unknown`.
- Fees for unmapped state procedures are tagged `Hidden` with `null` amounts and omitted from `officialTotal`.
- **Honesty Rule**: The engine never invents a deadline, turnaround duration, or fee amount for unknown jurisdictions. Known upstream tasks (e.g. Delhi NOC, challan payments) continue to receive precise deterministic dates.

---

## 6. Architectural Decision: Section 49 RC Address Intimation Task

### Context

Section 49 of the Motor Vehicles Act 1988 requires a registered owner who changes residence to report the new address within 30 days to the local registering authority. Simultaneously, Section 47 requires assignment of a new registration mark (re-registration on Form 27) if the vehicle is kept in another state for more than 12 months.

### Decision

We model **RC Change-of-Address Intimation (Form 33)** as an **independent, concurrent compliance task** with a statutory deadline of:
$$\text{deadline} = \text{movedOnDay} + \text{rcAddressIntimationDays} \quad (\text{Day 30 for } \text{movedOnDay} = 0)$$

### Rationale

1. **Legal Independence**: Section 49 is a mandatory statutory duty carrying penal consequences under Section 177 for non-compliance past 30 days. Re-registration under Section 47 requires parent-state NOC and financier clearance, which can extend beyond 30 days if blockers or travel occur.
2. **Citizen Visibility**: By exposing Form 33 as a standalone task with its own deadline and safe dates, the citizen can track whether their relocation timeline complies with Section 49, avoiding penalties even while the inter-state NOC and Form 27 re-registration proceed in parallel.
3. **Non-Duplication**: If the citizen completes Form 27 within 30 days, re-registration formally updates the registration records in the new jurisdiction. However, modeling Form 33 explicitly guarantees that if Form 27 is delayed by slot queues or loan clearance, the citizen is alerted to their 30-day Section 49 obligation.
