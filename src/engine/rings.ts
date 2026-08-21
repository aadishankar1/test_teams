import { RING_ORDER, type DayEntry, type DayState, type Goals, type RingId, type RingState } from '../types.js';
import { assertIsoDate, previousDay } from './date.js';

export const DEFAULT_GOALS: Goals = { move: 500, exercise: 30, stand: 12 };

interface RingMeta {
  label: string;
  unit: string;
}

const RING_META: Record<RingId, RingMeta> = {
  move: { label: 'Move', unit: 'kcal' },
  exercise: { label: 'Exercise', unit: 'min' },
  stand: { label: 'Stand', unit: 'hr' },
};

export function ringMeta(id: RingId): RingMeta {
  return RING_META[id];
}

/**
 * Resolve one ring.
 *
 * Overflow rolls into laps rather than a progress > 1, so a renderer can sweep
 * `progress` directly. A value landing exactly on a lap boundary reports a full
 * ring (`progress: 1`) rather than an empty next lap — closing your Move goal
 * dead-on should look closed, not look like you just started over.
 */
export function computeRing(id: RingId, rawValue: number, rawGoal: number): RingState {
  if (!Number.isFinite(rawGoal) || rawGoal <= 0) {
    throw new RangeError(`Goal for "${id}" must be a finite positive number, got ${rawGoal}`);
  }
  if (!Number.isFinite(rawValue)) {
    throw new RangeError(`Value for "${id}" must be a finite number, got ${rawValue}`);
  }

  const value = Math.max(0, rawValue);
  const goal = rawGoal;
  const ratio = value / goal;
  const completedLaps = Math.floor(ratio);
  const remainder = ratio - completedLaps;

  // On an exact boundary (and only when something was actually logged), show the
  // lap we just finished as full instead of the next one as empty.
  const onBoundary = remainder === 0 && completedLaps > 0;
  const progress = onBoundary ? 1 : remainder;

  const meta = RING_META[id];
  return {
    id,
    value,
    goal,
    progress,
    laps: completedLaps,
    closed: value >= goal,
    unit: meta.unit,
    label: meta.label,
  };
}

export function emptyEntry(date: string): DayEntry {
  return { date: assertIsoDate(date), move: 0, exercise: 0, stand: 0 };
}

export function entryIsPerfect(entry: DayEntry, goals: Goals): boolean {
  return RING_ORDER.every((id) => entry[id] >= goals[id]);
}

/**
 * Consecutive perfect days ending at (and including) `date`.
 * A missing entry breaks the streak, so gaps count as zeroes.
 */
export function computeStreak(
  date: string,
  goals: Goals,
  lookup: (date: string) => DayEntry | undefined,
): number {
  let cursor = assertIsoDate(date);
  let streak = 0;

  // Bounded so a pathological lookup can never spin forever.
  for (let guard = 0; guard < 3650; guard += 1) {
    const entry = lookup(cursor);
    if (!entry || !entryIsPerfect(entry, goals)) return streak;
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** Build the full render-ready state for one day. */
export function buildDayState(
  date: string,
  goals: Goals,
  lookup: (date: string) => DayEntry | undefined,
): DayState {
  const iso = assertIsoDate(date);
  const entry = lookup(iso) ?? emptyEntry(iso);
  const rings = RING_ORDER.map((id) => computeRing(id, entry[id], goals[id]));

  return {
    date: iso,
    rings,
    streak: computeStreak(iso, goals, lookup),
    perfectDay: rings.every((ring) => ring.closed),
  };
}
