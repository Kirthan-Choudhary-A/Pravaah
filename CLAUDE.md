# Pravaah (प्रवाह) — Core Development Rules

Single assistant for citizen driving licences and household vehicles (IMPACTX 2026, Challenge 09).
Builds one ordered plan with dependency reasons, latest safe dates, option comparisons, and privacy controls.
Client-side prototype running on simulated data without a backend.

## Commands

- Dev: `npm run dev` | Preview: `npm run preview`
- Typecheck: `npm run typecheck` | Lint: `npm run lint` (`npm run lint:fix`)
- Test: `npm run test` (`npm run test:watch`) | E2E: `npm run test:e2e`
- Full Verify: `npm run check` (typecheck + lint + test) | Build: `npm run build`

## Architecture & Import Rules (see [docs/architecture.md](docs/architecture.md))

- `engine/`: Pure TS only. No React, DOM, Three.js, network, or app folders. Data passed as args.
- `data/`: Engine types only. No other app folders.
- `components/`: No `features/`, `state/`, or `three/scenes/`.
- `features/`: Isolated slices. Never import sibling features; lift shared code to `components/`, `hooks/`, `utils/`.
- `three/`: No `features/` or `state/`. Receives all data via props. No circular dependencies.

## Honesty Rules

- Never invent laws, form numbers, fees, deadlines, or URLs. Use `verified: false` + `TODO_VERIFY`.
- Every rule must specify basis: `statute` | `notification` | `state-portal` | `modelled`.
- Only official government sources in rule packs.
- All live statuses are explicitly labelled `SIMULATED`.
- All operational timing assumptions must be labelled "assumed".
- Never present placeholder 3D assets as real vehicles or scans.
- Never claim tests or commands passed without actually running them.

## Privacy & Household Rules

- Fictional seed data only. Never use real citizen PII.
- Mask registration numbers and licence IDs by default. Reveal requires user action and creates an audit log.

## Engine & Time Model

- Pure and deterministic: no `Date.now()`, no `Math.random()`. "Today" is Day 0.
- Time in integer days. Tasks occupy half-open intervals `[start, end)` where `end = start + duration`.
- Plan finish is `max(end)`. Reports must explicitly name the critical task that sets it.

## Design & Accessibility Rules

- CSS tokens only (`styles/tokens.css`); zero hardcoded color literals.
- No blue, cyan, violet, purple, or neon values anywhere. Warm architectural palette.
- Status must always be conveyed with text, never color alone.
- Critical planning and legal information must never exist solely inside 3D canvases.

## Phased Workflow

- Build strictly one step at a time.
- Always run `npm run check` and `npm run build` before reporting. Stop at the end of each step.
