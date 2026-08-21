/**
 * Rings — shared contract between Track A (engine) and Track B (presentation).
 *
 * OWNERSHIP: Track A owns this file. Track B may append new presentation-only
 * types at the bottom, but must not change or reorder anything above the
 * "TRACK B APPEND ZONE" marker. Propose contract changes on the ModelSync
 * project context rather than editing in place — both tracks build against it.
 */

/** The three canonical Apple activity rings, outermost first. */
export type RingId = 'move' | 'exercise' | 'stand';

/** Ordered outermost -> innermost, matching how the rings are drawn. */
export const RING_ORDER: readonly RingId[] = ['move', 'exercise', 'stand'] as const;

/**
 * A single ring resolved for one day.
 *
 * `progress` is the fraction of the CURRENT lap only, so a renderer can draw it
 * straight to a stroke-dashoffset without doing any math. Overflow beyond the
 * goal rolls into `laps`: 1.5x the goal is `{ laps: 1, progress: 0.5 }`.
 */
export interface RingState {
  id: RingId;
  /** Raw measured amount for the day (kcal, minutes, hours). Never negative. */
  value: number;
  /** The day's target. Always > 0. */
  goal: number;
  /** Fraction of the current lap, 0..1. Exactly 1 only when the lap is full. */
  progress: number;
  /** Completed full laps. 0 while under goal, 1 at goal, 2 at double goal. */
  laps: number;
  /** True once `value >= goal`. */
  closed: boolean;
  /** Display unit, e.g. "kcal". */
  unit: string;
  /** Human label, e.g. "Move". */
  label: string;
}

/** Everything the UI needs to render one day. */
export interface DayState {
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  /** Always length 3, in RING_ORDER. */
  rings: RingState[];
  /** Consecutive days ending at `date` where all three rings closed. */
  streak: number;
  /** True when all three rings closed on this date. */
  perfectDay: boolean;
}

/** Raw stored measurements for a day, before goals are applied. */
export interface DayEntry {
  date: string;
  move: number;
  exercise: number;
  stand: number;
}

/** Per-ring daily targets. */
export interface Goals {
  move: number;
  exercise: number;
  stand: number;
}

/** Minimal persistence surface. Track A supplies a localStorage-backed impl. */
export interface RingsStore {
  getGoals(): Goals;
  setGoals(goals: Partial<Goals>): Goals;
  getEntry(date: string): DayEntry | undefined;
  putEntry(entry: DayEntry): void;
  /** Entries in ascending date order. */
  listEntries(): DayEntry[];
  clear(): void;
}

/* ------------------------------------------------------------------ */
/* TRACK B APPEND ZONE — presentation-only types below this line.      */
/* ------------------------------------------------------------------ */
