# Rings

An Apple-style Activity Rings board — three animated rings (Move / Exercise /
Stand) over a grid of widgets, in a dependency-light TypeScript web app.

## Two-track build

This repo is built by two agents in parallel on the `testrun` ModelSync project.
The split is by layer, so the tracks never touch the same files:

| Track | Owner | Files | Status |
| --- | --- | --- | --- |
| **A — engine** | Claude Code (aadi) | `src/engine/**`, `tests/**`, `src/types.ts`, root config | landed |
| **B — presentation** | open for Lisa's Claude agent | `src/ui/**`, `src/styles/**` | not started |

`src/types.ts` is the contract between them. Track A owns it; Track B appends
presentation-only types below the marked zone and proposes anything else on the
project context rather than editing in place.

## The contract

```ts
type RingId = 'move' | 'exercise' | 'stand'

interface RingState {
  id: RingId
  value: number     // raw amount logged, never negative
  goal: number      // always > 0
  progress: number  // 0..1 within the CURRENT lap
  laps: number      // completed full laps; overflow lives here, not in progress
  closed: boolean   // value >= goal
  unit: string
  label: string
}

interface DayState {
  date: string      // YYYY-MM-DD
  rings: RingState[]  // always 3, outermost first
  streak: number    // consecutive perfect days ending at `date`
  perfectDay: boolean
}
```

Overflow is the part worth knowing: 1.5× the Move goal is
`{ laps: 1, progress: 0.5 }`, never `progress: 1.5`. A renderer can drive
`stroke-dashoffset` straight from `progress` and draw `laps` extra sweeps behind
it, without doing any arithmetic of its own. Landing exactly on the goal reports
a full ring (`progress: 1`), not an empty next lap.

## Engine API

```ts
import { createEngine } from './src/engine/index.js'

const engine = createEngine()          // localStorage-backed, memory fallback
engine.seedIfEmpty({ endDate: '2026-08-21', days: 30 })
engine.getDayState()                   // DayState for today
engine.getRange('2026-08-21', 7)       // ascending DayState[]
engine.setGoals({ move: 700 })
engine.log({ date: '2026-08-21', move: 520, exercise: 31, stand: 12 })
```

Storage degrades rather than throws: a missing, locked-down, or corrupt
`localStorage` falls back to in-memory and to default goals, so a bad stored
blob can't take the board down.

## Mounting a UI

`src/main.ts` resolves `src/ui/index.ts` at runtime and hands over as soon as it
exports:

```ts
export function mountRings(root: HTMLElement, engine: RingsEngine): void
```

Until then it falls back to `src/dev/harness.ts` — a deliberately unstyled text
dump that proves the engine works. It is not the design; delete it when the real
renderer lands.

## Commands

```
npm install
npm run dev        # vite dev server
npm test           # vitest, 35 tests
npm run typecheck  # tsc --noEmit, strict
npm run build      # typecheck + vite build
```
