# Pravaah Regulatory Verification Register

In accordance with Pravaah Honesty Rules, **zero** unconfirmed statutory rules, deadlines, form fees, or deep links are marked as verified. Every entry below carries `verified: false` and requires human verification against the designated official portal before flipping to `verified: true`.

---

## 1. Official Sources Registry (15 items)

| Source ID             | Title & Legal Scope                | Site / Domain                                                        | What to Check                                                                               |
| :-------------------- | :--------------------------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `mva-1988-s14`        | Section 14 Motor Vehicles Act 1988 | [indiacode.nic.in](https://www.indiacode.nic.in)                     | Exact validity periods for non-transport vs transport driving licences.                     |
| `mva-1988-s15`        | Section 15 Motor Vehicles Act 1988 | [indiacode.nic.in](https://www.indiacode.nic.in)                     | Current renewal application window (1 yr before/after) and re-test requirement.             |
| `mva-1988-s47`        | Section 47 Motor Vehicles Act 1988 | [indiacode.nic.in](https://www.indiacode.nic.in)                     | 12-month statutory limit before mandatory re-registration in another state.                 |
| `mva-1988-s48`        | Section 48 Motor Vehicles Act 1988 | [indiacode.nic.in](https://www.indiacode.nic.in)                     | Form 28 No Objection Certificate grant, refusal, and consent conditions.                    |
| `mva-1988-s49`        | Section 49 Motor Vehicles Act 1988 | [indiacode.nic.in](https://www.indiacode.nic.in)                     | 30-day statutory deadline to intimate change of residence to registering authority.         |
| `cmvr-1989-r81`       | CMVR 1989 — Rule 81 Fee Schedule   | [morth.nic.in](https://morth.nic.in)                                 | Official fee table for licence renewal, Form 7 smart card, Form 27 mark, and hypothecation. |
| `cmvr-bh-series-2021` | MoRTH Notification G.S.R. 594(E)   | [egazette.gov.in](https://egazette.gov.in)                           | Bharat (BH) series eligibility and statutory exemption from state transfer NOC.             |
| `portal-parivahan`    | Parivahan Sewa National Portal     | [parivahan.gov.in](https://parivahan.gov.in)                         | Central portal URLs, national challan gateway, and grievance procedures.                    |
| `portal-sarathi`      | Sarathi DL Services Portal         | [sarathi.parivahan.gov.in](https://sarathi.parivahan.gov.in)         | Online Aadhaar e-KYC eligibility, slot booking mechanisms, and contactless services.        |
| `portal-vahan`        | Vahan Vehicle Services Portal      | [vahan.parivahan.gov.in](https://vahan.parivahan.gov.in)             | Online Form 28 NOC, Form 33 address intimation, and Form 35 hypothecation workflow.         |
| `state-portal-ts`     | Telangana Transport Portal         | [transport.telangana.gov.in](https://transport.telangana.gov.in)     | Telangana citizen services, local user charges, and e-challan clearing rules.               |
| `state-portal-ka`     | Karnataka Transport Portal         | [transport.karnataka.gov.in](https://transport.karnataka.gov.in)     | Karnataka RTO slot booking, Bangalore One service fees, and lifetime road tax slab.         |
| `state-portal-mh`     | Maharashtra Transport Portal       | [transport.maharashtra.gov.in](https://transport.maharashtra.gov.in) | Maharashtra RTO inspection slot rules, postal delivery fees, and address transfer forms.    |
| `state-portal-tn`     | Tamil Nadu Transport Portal        | [tnsta.gov.in](https://tnsta.gov.in)                                 | Tamil Nadu state portal fee structures and appointment booking timelines.                   |
| `state-portal-dl`     | Delhi Faceless Transport Portal    | [transport.delhi.gov.in](https://transport.delhi.gov.in)             | Delhi faceless online service list, mandatory e-KYC, and facilitation fees.                 |

---

## 2. Regulatory & Operational Rules (5 items)

| Rule Field                | Current Modelled Value                                                                                  | Statutory Basis      | Official Site                                                | What to Check                                                                                |
| :------------------------ | :------------------------------------------------------------------------------------------------------ | :------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| `licenceStages`           | Renewal window: 365d; Grace: 30d; Driving allowed in grace: true; Late fee: ₹300 + ₹1000/yr; Test: 365d | Statute (ss. 14, 15) | [indiacode.nic.in](https://www.indiacode.nic.in)             | Verify whether driving is permitted under Section 15 proviso during the 30-day grace period. |
| `reRegistrationLimitDays` | 365 days (12 months)                                                                                    | Statute (s. 47)      | [indiacode.nic.in](https://www.indiacode.nic.in)             | Confirm 12-month grace before assignment of new registration mark.                           |
| `rcAddressIntimationDays` | 30 days                                                                                                 | Statute (s. 49)      | [indiacode.nic.in](https://www.indiacode.nic.in)             | Confirm statutory 30-day requirement to intimate address change on Form 33.                  |
| `servicesOnline`          | Licence renewal & address change online with Aadhaar                                                    | Notification         | [sarathi.parivahan.gov.in](https://sarathi.parivahan.gov.in) | Confirm which states allow 100% contactless online renewal without visiting RTO.             |
| `licenceRenewalAtAnyRTO`  | `true`                                                                                                  | Statute (s. 15)      | [sarathi.parivahan.gov.in](https://sarathi.parivahan.gov.in) | Confirm whether an RTO outside the jurisdiction can process biometric renewal.               |

---

## 3. Statutory & Estimated Fees (18 items)

| Fee ID                          | Item Label                              | Amount          | Tag      | Basis / Source   | What to Check                                                                      |
| :------------------------------ | :-------------------------------------- | :-------------- | :------- | :--------------- | :--------------------------------------------------------------------------------- |
| `fee-licence-renewal`           | Driving Licence Renewal                 | ₹200            | Official | CMVR Rule 81     | Verify current CMVR Schedule item 9 fee.                                           |
| `fee-smart-card`                | Form 7 Smart Card Fee (per transaction) | ₹200            | Official | CMVR Rule 81     | Verify whether renewal followed by address change triggers two physical card fees. |
| `fee-late-renewal`              | Late Licence Renewal Penalty            | ₹300 + ₹1000/yr | Official | CMVR Rule 81     | Verify additional annual penalty formula.                                          |
| `fee-licence-address-change`    | Driving Licence Address Change          | ₹200            | Official | CMVR Rule 81     | Confirm record modification charge.                                                |
| `fee-noc-form28`                | No Objection Certificate (Form 28)      | ₹0 (Nil)        | Official | CMVR Rule 81     | Confirm statutory fee is nil under federal rules.                                  |
| `fee-new-reg-mark-motorcycle`   | New Registration Mark (Motor Cycle)     | ₹300            | Official | CMVR Rule 81     | Verify Rule 81 item 4(a) two-wheeler fee.                                          |
| `fee-new-reg-mark-car`          | New Registration Mark (LMV Car)         | ₹600            | Official | CMVR Rule 81     | Verify Rule 81 item 4(b) four-wheeler fee.                                         |
| `fee-hypothecation-endorsement` | Hypothecation Endorsement               | ₹500            | Official | CMVR Rule 81     | Verify Rule 81 item 12 loan endorsement fee.                                       |
| `fee-hypothecation-termination` | Hypothecation Termination (Form 35)     | `null`          | Official | CMVR Rule 81     | Check CMVR Rule 81 table for Form 35 cancellation fee.                             |
| `fee-estimate-road-tax`         | Lifetime Road Tax (Destination State)   | `null`          | Estimate | State Acts       | Variable pro-rata lifetime motor vehicle tax formula.                              |
| `fee-estimate-postal-charges`   | Postal Dispatch Charges                 | `null`          | Estimate | State Portals    | Departmental speed post delivery charge.                                           |
| `fee-estimate-bank-noc`         | Bank NOC Processing Charge              | `null`          | Estimate | Commercial Banks | Bank fee for issuing Form 28 loan continuation consent.                            |
| `fee-estimate-aadhaar-update`   | UIDAI Aadhaar Address Update            | `null`          | Estimate | UIDAI Portal     | Standard UIDAI demographic update fee (₹50).                                       |
| `fee-ts-user-charge`            | Telangana User Charge                   | `null`          | Estimate | TS Transport     | e-Seva transaction fee.                                                            |
| `fee-ka-user-charge`            | Karnataka Service Charge                | `null`          | Estimate | KA Transport     | Bangalore One counter service charge.                                              |
| `fee-mh-postal-charge`          | Maharashtra Postal Charge               | `null`          | Estimate | MH Transport     | Speed post delivery fee.                                                           |
| `fee-tn-service-charge`         | Tamil Nadu Service Fee                  | `null`          | Estimate | TN Transport     | e-Governance portal facilitation fee.                                              |
| `fee-dl-faceless-charge`        | Delhi Faceless Service Fee              | `null`          | Estimate | DL Transport     | Faceless online counter facilitation charge.                                       |

---

## 4. Verification Summary

- **Total Unverified Items**: 38 items
  - Official Sources: 15
  - Regulatory Rules: 5
  - Statutory & Estimated Fees: 18

---

## 5. Review Findings (24 Oct 2026)

Reviewed against the project document and the state-department fee page (`aptransport.org/html/fees-registration.html`, a state mirror, not the official schedule). Nothing here is marked `verified: true`.

| Item                                                           | Finding                                                                                                                                                                     | Action taken or needed                                                                                                  |
| :------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `drivingAllowedDuringGrace`                                    | Was `true`, which made the engine say driving is allowed for 30 days after expiry. No source supports that, and s.181 treats driving without a valid licence as an offence. | Set to `false`. The 30-day grace is assumed for the late-fee start only. Flip only if the official text says otherwise. |
| `fee-noc-form28`                                               | Was ₹0, `Official`. The state fee page lists no Form 28 fee (only a ₹300 per month late charge for motorcycles). Not listed is not nil.                                     | Now `null`, `Estimate`. Re-tag `Official` only after the official schedule is read.                                     |
| `fee-hypothecation-termination`                                | That page shows "No Fee" for termination (rule 61(1)).                                                                                                                      | Note added; amount stays `null` until the official Rule 81 table is read.                                               |
| `fee-hypothecation-endorsement`, `fee-new-reg-mark-motorcycle` | ₹500 (rule 60) and ₹300 (Serial 5) match that page.                                                                                                                         | Still `verified: false`.                                                                                                |
| RC change of residence                                         | That page gives half of the Serial 5 fee (rule 59), about ₹150 for a motorcycle (calculated, not printed).                                                                  | Not in the data yet. Add as `Estimate` if the flow needs it.                                                            |
| `lastChecked`                                                  | Set to 24 Oct on unverified entries.                                                                                                                                        | Read it as "source last reviewed", not "confirmed".                                                                     |
| Secondary sources                                              | The project document cites Taxmann, CourtBook, LiveLaw, Autocar India, Autocar Pro.                                                                                         | Not used as a basis. The registry above lists the official targets to read instead.                                     |
| Removed claims                                                 | Section 48(3), "Rule 59" as an NOC citation, G.S.R. 575(E), "insurance void", "₹200 lost on withdrawal".                                                                    | Do not reintroduce without an official source.                                                                          |
| Interstate route                                               | Form 28 NOC, then Form 27 new mark. Form 33 is for address intimation (s.49), not the interstate route.                                                                     | Engine already uses Form 28 then Form 27; confirm the CMVR rules for both.                                              |
| Modelled rules                                                 | Pending request or unpaid challan blocks the NOC; early Aadhaar update breaks the old RTO's address check.                                                                  | Keep `basis: modelled`, say so in the reason shown to the user.                                                         |
| Series letters                                                 | Delhi S (two-wheeler) and C (car) have no cited source.                                                                                                                     | Cite a Delhi source or ask the user on mismatch.                                                                        |
| BH series                                                      | Eligibility conditions are not modelled.                                                                                                                                    | Add an eligibility check before skipping the NOC.                                                                       |

### Update (after the review fixes)

- `fee-noc-form28` and `drivingAllowedDuringGrace` changes above are in place and covered by tests.
- Smart-card fee count: the engine charges two (renewal and address change), giving an official total of ₹1,100; the project document says ₹900. Unresolved, see `docs/roadmap.md` open item 4.
- `classLetters` now lives in `src/data/rulepacks/DL.json` with `basis: modelled`, `verified: false` and source `state-portal-dl`; it is no longer in the central pack.
- Gold-plan citations to "CMVR Rule 58" and "GSR 594(E)" were removed from the specs; the BH notification stays an unverified target in the registry.
