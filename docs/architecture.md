# Pravaah Architecture & Directory Structure

Pravaah (प्रवाह) is an intelligent planning assistant for driving licences, citizen vehicles, and household fleets (IMPACTX 2026, Challenge 09: _Vehicle & Driving Services Made Simple_). It operates completely on simulated data with no backend.

---

## Directory Tree

```
pravaah/
  public/
    assets/
      models/        3D models (GLB/glTF) and their licence info
      textures/      Texture maps for 3D vehicle models
      environments/  HDR lighting environment maps
      posters/       Fallback images for 3D views
      images/        UI illustrations and iconography
    fonts/           Self-hosted web fonts for regional scripts
    favicon.svg      Vector application favicon
  src/
    app/             App.tsx, main.tsx, routes.tsx, providers/
    components/
      ui/            Buttons, tags, tables, loaders
      layout/        Header, footer, navigation, mobile menu
      feedback/      Loading, empty and error states
    features/
      story/         Interactive landing page and narrative
      planner/       Dashboard, timeline, graph, task detail, fees
      simulator/     Scenario, event and parameter controls, before/after diff
      household/     Consent, masking, audit log
      voice/         Plate entry, parser, read-back
      sources/       Rule packs, sources, degraded mode
    engine/          Pure TypeScript planning logic (no React, no DOM, no network)
      model/         Domain entities (vehicles, licences, tasks)
      graph/         Directed acyclic dependency graphs (DAG)
      schedule/      Topological sorting, critical path, latest safe date
      checks/        Eligibility, prerequisites, validity windows
      options/       Alternative path comparisons, Tatkal vs Normal
      fees/          Fee breakdowns, penalties, user charges
      parse/         Pure plate and rule parsers
    data/
      rulepacks/     Versioned state rule packs (JSON)
      sources/       Official source registry (acts, rules, portals)
      scenarios/     Fictional test scenarios (seed data)
      assumptions/   Timing assumptions (all labelled "assumed")
    state/           App reducer, demo controls, before/after diff
    three/
      scenes/        3D composite scenes (hero, inspection, plan)
      models/        R3F 3D model loaders and meshes
      materials/     Earth-tone PBR materials and shaders
      lighting/      Lighting rigs and environment configurations
      cameras/       Perspective and orthographic camera rigs
      controls/      Interactive camera controls and accessibility
      utils/         WebGL detection and math utilities
    animations/      GSAP timelines and scroll choreography
    hooks/           Custom React hooks
    styles/          tokens.css, reset.css, globals.css, typography.css
    config/          site.config.ts (model.config.ts, animation.config.ts)
    i18n/            en, hi, te, kn localization dictionaries
    types/           Shared app-level types (domain types live in engine/)
    utils/           Shared utility functions
  tests/
    engine/          Pure engine unit and invariant tests
    gold/            Golden master plan fixtures for regression testing
    components/      Component rendering and route navigation tests
    e2e/             Playwright browser tests (viewports, overflow, console)
  docs/
    architecture.md  Directory tree, folder responsibilities, and import rules
    roadmap.md       Phased implementation roadmap (14 steps)
    adr/             Architecture Decision Records
```

---

## Folder Responsibilities

| Directory         | Responsibility                                                                                                |
| :---------------- | :------------------------------------------------------------------------------------------------------------ |
| `src/engine/`     | Pure planning engine. Zero UI, zero DOM, zero network, zero side effects. Deterministic day-based time model. |
| `src/data/`       | Structured datasets: state rule packs, source registers, scenarios, and documented assumptions.               |
| `src/components/` | Reusable presentational components (buttons, tags, tables, layout shell, feedback states).                    |
| `src/features/`   | Screen-level vertical feature slices (story, planner, simulator, household, voice, sources).                  |
| `src/three/`      | Three.js and React Three Fiber 3D visualization layer. Strictly isolated from state and features.             |
| `src/state/`      | Client-side reactive state management, scenario switching, and before/after diff snapshots.                   |
| `src/styles/`     | Design tokens, typography, CSS reset, and global styles adhering to the warm earth-tone palette.              |
| `src/config/`     | Application configuration and metadata.                                                                       |
| `src/i18n/`       | Localization copy dictionaries for English, Hindi, Telugu, and Kannada.                                       |
| `src/types/`      | Shared application-level interfaces and contracts.                                                            |
| `src/utils/`      | Shared pure helper functions.                                                                                 |

---

## Architectural Boundaries & Import Rules

Enforced mechanically via ESLint flat configuration (`eslint.config.js`):

1. **`engine/` isolation**:
   - May import **only** other files within `src/engine/` and its own types.
   - **Must never** import `react`, `react-dom`, `three`, the DOM, or any app folder (`@app`, `@components`, `@features`, `@state`, `@data`, etc.).
   - Data is passed into engine functions strictly as runtime arguments.
2. **`data/` isolation**:
   - May import **only** types from `@engine`. No runtime code or other app folders.
3. **`components/` isolation**:
   - Must not import `@features`, `@state`, or `@three/scenes`. Reusable UI must remain decoupled from specific domain features.
4. **`features/` isolation**:
   - Feature slices must **never** import other feature slices.
   - Any logic or component shared between features must be lifted to `@components`, `@hooks`, or `@utils`.
5. **`three/` isolation**:
   - Must not import `@features` or `@state`. Receives visual data and configuration strictly through props.
6. **No circular dependencies**:
   - Dependencies must flow hierarchically: UI/Features → State/Data → Engine.
