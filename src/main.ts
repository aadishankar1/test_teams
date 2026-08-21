import { createEngine, toIsoDate, type RingsEngine } from './engine/index.js';

/**
 * App entry point. Track A owns the engine wiring; Track B owns rendering.
 *
 * The UI is resolved at runtime so the two tracks can land independently: once
 * `src/ui/index.ts` exports `mountRings`, it takes over automatically and the
 * dev harness below stops being used. The specifier is held in a variable so
 * this typechecks and builds before that file exists.
 */
interface RingsUiModule {
  mountRings?: (root: HTMLElement, engine: RingsEngine) => void;
}

const UI_ENTRY = './ui/index.js';

async function loadUi(): Promise<RingsUiModule | undefined> {
  try {
    return (await import(/* @vite-ignore */ UI_ENTRY)) as RingsUiModule;
  } catch {
    // Track B's UI has not landed yet.
    return undefined;
  }
}

async function main(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('Missing #app mount point');

  const engine = createEngine();
  engine.seedIfEmpty({ endDate: toIsoDate(new Date()), days: 30 });

  const ui = await loadUi();
  if (ui?.mountRings) {
    ui.mountRings(root, engine);
    return;
  }

  const { mountHarness } = await import('./dev/harness.js');
  mountHarness(root, engine);
}

void main();
