import type { DayEntry, Goals } from '../types.js';
import { addDays } from './date.js';
import { DEFAULT_GOALS } from './rings.js';

/**
 * mulberry32 — small deterministic PRNG. Seeded so the demo board and the tests
 * see identical data on every run.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedOptions {
  /** Last day generated, inclusive. ISO `YYYY-MM-DD`. */
  endDate: string;
  days?: number;
  goals?: Goals;
  seed?: number;
}

/**
 * A plausible history: mostly-closing weekdays, lighter weekends, and the
 * occasional big day that laps the Move ring — enough variety to exercise the
 * renderer's overflow path.
 *
 * Effort trends gently upward toward `endDate` so the most recent days carry a
 * live streak. Without that the demo board opens on a zero streak and a
 * half-empty set of rings, which shows the UI at its least interesting.
 */
export function generateHistory(options: SeedOptions): DayEntry[] {
  const { endDate, days = 30, goals = DEFAULT_GOALS, seed = 20260821 } = options;
  const random = mulberry32(seed);
  const entries: DayEntry[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(endDate, -offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;

    // 0 for the oldest day, 1 for `endDate`.
    const recency = days > 1 ? (days - 1 - offset) / (days - 1) : 1;
    const trend = 0.2 * recency;
    const effort = (isWeekend ? 0.72 : 0.95) + trend + random() * 0.4;
    const lapDay = random() < 0.12;

    entries.push({
      date,
      move: Math.round(goals.move * effort * (lapDay ? 2.1 : 1)),
      exercise: Math.round(goals.exercise * effort),
      stand: Math.min(24, Math.round(goals.stand * (0.82 + trend + random() * 0.45))),
    });
  }

  return entries;
}
