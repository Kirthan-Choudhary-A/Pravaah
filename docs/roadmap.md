# Pravaah Implementation Roadmap

Phased implementation roadmap for Pravaah (IMPACTX 2026, Challenge 09). Build one step at a time; step numbers are referenced from folder READMEs and stay fixed.

**Execution order:** 1 → 2 → 3 → 4a → 4b → 4c → 5 → 6 → 7 → 8 → 9 → 13 → 14. Steps 10–12 (3D and story) are optional and start only after Step 14.

- [x] **Step 1: Foundation and directory structure**
- [x] **Step 2: Planning Engine (Data layer, pure scheduler, compliance checks, options & gold tests)**
- [ ] **Step 3: Design system, app shell & Simulator UI**
- [ ] **Step 4: Plate parser, household consent, privacy & voice read-back**
- [ ] **Step 5: 3D vehicle inspection & spatial plan view**
- [ ] **Step 6: Story page, metrics harness, performance & final quality pass**

## Curveball Traceability

| Curveball                          | Built in    | Tested in                                |
| :--------------------------------- | :---------- | :--------------------------------------- |
| Pending request rejected mid-demo  | Step 5      | Step 4c gold plan, Step 7 e2e            |
| Jurisdiction has no rule pack      | Steps 4c, 6 | Step 4c unit tests, Step 7 e2e           |
| Plate does not match vehicle type  | Steps 4c, 9 | Step 4c unit tests, Step 13 voice corpus |
| Appointment availability collapses | Steps 5, 7  | Step 13 scarcity simulation, Step 7 e2e  |
