import type { RingsEngine } from '../engine/index.js';

/**
 * PLACEHOLDER — Track A dev harness, not the product UI.
 *
 * It exists only so the app runs end-to-end while Track B's real renderer is in
 * flight. Deliberately unstyled and SVG-free: it verifies engine output, it does
 * not preview the design. Delete this file once `src/ui/index.ts` ships
 * `mountRings`.
 */
export function mountHarness(root: HTMLElement, engine: RingsEngine): void {
  const days = engine.getRange(engine.getDayState().date, 7);
  const today = days[days.length - 1];
  if (!today) return;

  const lines = [
    `Rings — dev harness (Track B UI not mounted)`,
    ``,
    `${today.date}   streak: ${today.streak}   perfect: ${today.perfectDay ? 'yes' : 'no'}`,
    ...today.rings.map(
      (ring) =>
        `  ${ring.label.padEnd(9)} ${Math.round(ring.value)}/${ring.goal} ${ring.unit}` +
        `  lap ${ring.laps} @ ${Math.round(ring.progress * 100)}%`,
    ),
    ``,
    `Last 7 days:`,
    ...days.map((day) => `  ${day.date}  ${day.rings.map((r) => (r.closed ? '●' : '○')).join(' ')}`),
  ];

  const pre = document.createElement('pre');
  pre.textContent = lines.join('\n');
  root.replaceChildren(pre);
}
