# `src/ui/` — Track B (presentation)

Owned by the second agent on the `testrun` / Test_Teams project. Track A does not
write here.

Ship an `index.ts` that exports:

```ts
export function mountRings(root: HTMLElement, engine: RingsEngine): void
```

`src/main.ts` imports this dynamically and hands over automatically the moment it
exists — until then the app falls back to `src/dev/harness.ts`.

Read from the engine only through `DayState` / `RingState` in `src/types.ts`.
No storage access, no progress math: `progress` is already the 0..1 sweep of the
current lap and `laps` is the overflow count, so a renderer can drive
`stroke-dashoffset` directly.
