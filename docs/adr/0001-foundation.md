# ADR 0001: Architecture Foundation and Module Boundaries

## Status

Accepted

## Context

Pravaah is a hackathon web app for IMPACTX 2026, Challenge 09 ("Vehicle & Driving Services Made Simple"). It acts as a single intelligent assistant for citizen driving licences and multi-vehicle household fleets, constructing an ordered plan with explicit dependency reasons, computing latest safe dates, comparing options for blocked workflows, and protecting family privacy with masking and audit logging.

The system runs on simulated data without a backend. To ensure reliability, testability, and clean parallel development over 14 discrete steps, the foundation requires strict architectural guardrails.

## Decisions

### 1. Technology Stack

- **Vite + React 19 + TypeScript**: React 19 was selected because the current stable `@react-three/fiber` (v9.0.0+) and `@react-three/drei` explicitly declare peer dependencies requiring React 19 (`>=19 <19.4`), while `@xyflow/react` supports React 19 (`>=17`). Pinned React to 19 ensures seamless integration in future 3D and graph visualizer steps without peer dependency clashes.
- **Strict TypeScript**: Configured with `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, and `exactOptionalPropertyTypes: true` to prevent undefined access and implicit coercion in planning computations.
- **Pure CSS Tokens without Frameworks at Foundation**: CSS custom properties defined in `styles/tokens.css` establish the warm architectural palette (`--paper`, `--offwhite`, `--graphite`, `--charcoal`, `--olive`, `--stone`, `--iron`, `--ink`) and fluid scales early, preventing ad-hoc hardcoded colors.

### 2. Pure Planning Engine Boundary

The core scheduling and compliance logic in `src/engine/` is completely decoupled from UI frameworks and browser APIs:

- No React, ReactDOM, Three.js, or DOM manipulation.
- No network requests (`fetch`, `axios`).
- Pure deterministic execution: no non-deterministic `Date.now()` or `Math.random()`. Time is represented as integer days where "Today" is Day 0.
- All data is passed as immutable arguments.

### 3. Feature and Presentational Isolation

- `features/` slices are strictly prohibited from importing sibling features to eliminate spaghetti coupling. Shared code is hoisted to `components/`, `hooks/`, or `utils/`.
- `components/` cannot import `features/`, `state/`, or `three/scenes/`, guaranteeing presentational reusability.
- `three/` visualizations cannot import `features/` or `state/`, receiving scene data strictly through props.
- All boundary constraints are enforced mechanically via ESLint flat configuration (`eslint.config.js`) using `no-restricted-imports`.

## Consequences

- Engine algorithms are 100% unit-testable in isolation with instant test feedback.
- Refactoring UI views cannot corrupt core planning invariants.
- Strict ESLint checks catch architectural violations at compile/lint time.
