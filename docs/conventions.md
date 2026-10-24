# Pravaah Conventions

Rules every change follows. Items marked "(lint)" are enforced by `eslint.config.js`; the rest are checked in review and by tests.

## Honesty

- Never invent laws, form numbers, fees, deadlines, or URLs. Use `verified: false` and `TODO_VERIFY`.
- Every rule states its basis: `statute` | `notification` | `state-portal` | `modelled`.
- Only official government sources are a rule's basis. News sites, law blogs and third-party pages may point to a source but are never the basis.
- A fee that is merely "not listed" is an `Estimate`, never an `Official` ₹0.
- All live statuses are labelled `SIMULATED`. All operational timings are labelled "assumed".
- Nothing is called "verified", "official" or "statutory" in the UI or docs until someone has read the official text and recorded who and when in `docs/verification.md`.
- Copy that mentions a number (days, fees, counts) takes it from the data or engine, not from typed-in text.
- Never claim tests, builds or metrics passed without running them. Report metric limits next to the metric.

## Privacy and household

- Fictional seed data only. Never use real citizen PII.
- Aadhaar, licence, engine, chassis and plate numbers are masked by default. Revealing one needs a stated purpose, expires, and is logged.
- A delegate never sees the owner's Aadhaar, licence or challans, not even masked. The UI must ask `canAccess`, not just add a label.
- Consent is per vehicle and has an end date. Access checks pass the vehicle (`vehicleKeys`) and the current time.
- The privacy layer uses one clock: epoch seconds (`src/utils/clock.ts`). The planner uses its own integer Day model. Do not mix them.
- The audit log and consents live in browser storage and are not tamper-evident. Say so.
- The microphone uses the browser's speech service, which receives the audio. Say so; never call it "local".

## Engine and time model

- `engine/` is pure TypeScript: no React, DOM, network or app folders (lint). No `Date.now()`, `new Date()` or `Math.random()` (lint). Randomness is passed in as a seeded generator.
- "Today" is Day 0. Time is integer days. Tasks occupy half-open intervals `[start, end)`.
- An owner-away window is half-open too: `{ start: 12, end: 26 }` means away on days 12 to 25 and back on day 26.
- Plan finish is `max(end)`; reports name the task that sets it.
- A plan that lets the licence lapse never outranks one that does not.
- Unknown jurisdictions return an explicit unknown result; nothing falls through to defaults.

## Architecture

- `engine/`: only engine files. `data/`: engine types only. `components/`: no `features/`, `state/`, `three/scenes/`. `features/`: never import a sibling feature. `three/`: no `features/` or `state/`. See `docs/architecture.md`.

## Design and accessibility

- CSS tokens only; no colour literals in `components/`, `features/` or `state/` (lint). `three/` may use literal colours for WebGL.
- The palette rule in `docs/adr/0001-foundation.md` (warm architectural, no blue/cyan/violet/purple/neon) is the project default. The current restyle departs from it and needs an explicit decision.
- Status is always shown in words, never by colour alone.
- Critical planning and legal information never exists only inside a 3D canvas.

## Workflow

- Build one roadmap step at a time.
- Before reporting a step done, run `npm run check`, `npm run build` and the e2e suite (`npx playwright test`; after a Playwright update run `npx playwright install chromium` first).
- The e2e suite reuses whatever server is on port 5173. Make sure that is this app.
- Gold plans are hand-derived from the assumed timings, with the arithmetic written in `derivation`; never copy engine output into a gold plan.
