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
 */
export function generateHistory(options: SeedOptions): DayEntry[] {
  const { endDate, days = 30, goals = DEFAULT_GOALS, seed = 20260821 } = options;
  const random = mulberry32(seed);
  const entries: DayEntry[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(endDate, -offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const effort = (isWeekend ? 0.55 : 0.85) + random() * 0.5;
    const lapDay = random() < 0.12;

    entries.push({
      date,
      move: Math.round(goals.move * effort * (lapDay ? 2.1 : 1)),
      exercise: Math.round(goals.exercise * effort),
      stand: Math.min(24, Math.round(goals.stand * (0.7 + random() * 0.5))),
    });
  }

  return entries;
}
