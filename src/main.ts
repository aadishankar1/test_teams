import { createEngine, toIsoDate, type RingsEngine } from './engine/index.js';

/**
 * App entry point. Track A owns the engine wiring; Track B owns rendering.
 *
 * The UI is discovered with `import.meta.glob` rather than a plain dynamic
 * import: the glob is resolved at BUILD time, so Track B's `src/ui/index.ts`
 * gets bundled properly the moment it lands, and the map is simply empty while
 * it doesn't exist. A dynamic import of a variable specifier would look fine on
 * the dev server and then 404 in a production build, which is exactly the kind
 * of failure nobody notices until after a release.
 */
interface RingsUiModule {
  mountRings?: (root: HTMLElement, engine: RingsEngine) => void;
}

const UI_ENTRY = './ui/index.ts';

async function loadUi(): Promise<RingsUiModule | undefined> {
  const modules = import.meta.glob<RingsUiModule>('./ui/index.ts');
  const load = modules[UI_ENTRY];
  if (!load) return undefined;

  try {
    return await load();
  } catch (error) {
    console.error('Rings UI failed to load; falling back to the dev harness.', error);
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
