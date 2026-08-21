import { describe, expect, it } from 'vitest';
import { buildDayState, computeRing, computeStreak, DEFAULT_GOALS } from '../src/engine/rings.js';
import type { DayEntry } from '../src/types.js';

const lookupFrom = (entries: DayEntry[]) => {
  const map = new Map(entries.map((entry) => [entry.date, entry]));
  return (date: string) => map.get(date);
};

describe('computeRing', () => {
  it('reports partial progress below the goal', () => {
    const ring = computeRing('move', 250, 500);
    expect(ring.progress).toBe(0.5);
    expect(ring.laps).toBe(0);
    expect(ring.closed).toBe(false);
  });

  it('shows a full ring when the value lands exactly on the goal', () => {
    const ring = computeRing('move', 500, 500);
    expect(ring.progress).toBe(1);
    expect(ring.laps).toBe(1);
    expect(ring.closed).toBe(true);
  });

  it('rolls overflow into laps instead of progress > 1', () => {
    const ring = computeRing('move', 750, 500);
    expect(ring.laps).toBe(1);
    expect(ring.progress).toBe(0.5);
    expect(ring.closed).toBe(true);
  });

  it('shows a full ring on an exact double lap', () => {
    const ring = computeRing('exercise', 60, 30);
    expect(ring.laps).toBe(2);
    expect(ring.progress).toBe(1);
  });

  it('treats an empty day as an empty ring, not a full lap', () => {
    const ring = computeRing('stand', 0, 12);
    expect(ring.progress).toBe(0);
    expect(ring.laps).toBe(0);
    expect(ring.closed).toBe(false);
  });

  it('clamps negative values to zero', () => {
    expect(computeRing('move', -100, 500).value).toBe(0);
  });

  it('carries display metadata for the renderer', () => {
    expect(computeRing('stand', 6, 12)).toMatchObject({ label: 'Stand', unit: 'hr' });
  });

  it('rejects a non-positive goal', () => {
    expect(() => computeRing('move', 100, 0)).toThrow(RangeError);
  });
});

describe('computeStreak', () => {
  const perfect = (date: string): DayEntry => ({ date, move: 500, exercise: 30, stand: 12 });

  it('counts consecutive perfect days ending at the given date', () => {
    const entries = [perfect('2026-08-19'), perfect('2026-08-20'), perfect('2026-08-21')];
    expect(computeStreak('2026-08-21', DEFAULT_GOALS, lookupFrom(entries))).toBe(3);
  });

  it('breaks on a missing day', () => {
    const entries = [perfect('2026-08-18'), perfect('2026-08-20'), perfect('2026-08-21')];
    expect(computeStreak('2026-08-21', DEFAULT_GOALS, lookupFrom(entries))).toBe(2);
  });

  it('breaks when a single ring falls short', () => {
    const entries = [
      { date: '2026-08-20', move: 500, exercise: 29, stand: 12 },
      perfect('2026-08-21'),
    ];
    expect(computeStreak('2026-08-21', DEFAULT_GOALS, lookupFrom(entries))).toBe(1);
  });

  it('is zero when the day itself is not perfect', () => {
    const entries = [perfect('2026-08-20')];
    expect(computeStreak('2026-08-21', DEFAULT_GOALS, lookupFrom(entries))).toBe(0);
  });
});

describe('buildDayState', () => {
  it('returns three rings in outermost-first order', () => {
    const state = buildDayState('2026-08-21', DEFAULT_GOALS, () => undefined);
    expect(state.rings.map((ring) => ring.id)).toEqual(['move', 'exercise', 'stand']);
  });

  it('marks a perfect day', () => {
    const entry: DayEntry = { date: '2026-08-21', move: 600, exercise: 45, stand: 14 };
    const state = buildDayState('2026-08-21', DEFAULT_GOALS, () => entry);
    expect(state.perfectDay).toBe(true);
  });

  it('falls back to an empty day when nothing was logged', () => {
    const state = buildDayState('2026-08-21', DEFAULT_GOALS, () => undefined);
    expect(state.perfectDay).toBe(false);
    expect(state.rings.every((ring) => ring.value === 0)).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(() => buildDayState('2026-02-30', DEFAULT_GOALS, () => undefined)).toThrow(RangeError);
  });
});
