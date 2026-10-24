# Pravaah (प्रवाह)

> Vehicle & Driving Services Made Simple — IMPACTX 2026, Challenge 09.

Pravaah is a unified client-side planning assistant for citizen driving licences, personal vehicles, and family fleets. It computes an ordered, dependency-aware compliance plan, calculates the latest safe date for renewals and tests, compares alternative paths for blocked workflows, and protects household data with privacy masking and audit logs.

> **Disclaimer**: Prototype running entirely on simulated data without a backend. Not affiliated with MoRTH, Parivahan, or any state transport department.

---

## Requirements

- **Node.js**: v22.x (Active LTS recommended, see `.nvmrc`)
- **Package Manager**: `npm` (v10.x+)

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build

# 4. Run tests (unit, invariant, gold)
npm run test

# 5. Run terminal preview plan runner
npm run plan -- --scenario A
npm run plan -- --scenario A --compare

# 6. Run typecheck, lint, and tests
npm run check

# 7. Run end-to-end browser tests
npm run test:e2e
```

---

## Assistant and API keys

The assistant, translation and speech need server-side keys. Copy `.env.example` to `.env.local` and fill:

```
GROQ_API_KEYS=key1,key2,key3
SARVAM_API_KEYS=key1
```

`npm run dev` serves `/api/*` itself. On Vercel, set the same variables in the project settings; the `api/` folder deploys as a function. Keys are read only on the server. Groq limits apply per organisation, so keys from different accounts add capacity.

---

## Directory Overview

See [docs/architecture.md](docs/architecture.md) for full architectural specifications and ESLint boundary rules.

```
pravaah/
  public/       Static assets, 3D models, fonts, favicon
  src/
    app/        App entry, router configuration, providers
    components/ Reusable UI primitives, layout shell, feedback states
    features/   Vertical feature slices (story, planner, simulator, household, voice, sources)
    engine/     Pure TypeScript scheduling and compliance engine
    data/       Versioned state rule packs, source registry, scenarios, assumptions
    state/      App reducer, demo controls, diff snapshots
    three/      React Three Fiber 3D scene modules and shaders
    animations/ GSAP scroll choreography and animations
    hooks/      Custom React hooks
    styles/     Design tokens (CSS variables), typography, reset, globals
    config/     Site and module configurations
    i18n/       Multi-language dictionaries (en, hi, te, kn)
    types/      Shared application interfaces
    utils/      General utility functions
  tests/        Engine unit tests, route tests, gold fixtures, Playwright e2e
  docs/         Architecture diagrams, roadmap, ADRs
```

---

## Status

**Project status: Step 2 of 6 complete.**
