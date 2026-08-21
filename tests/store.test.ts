import { describe, expect, it } from 'vitest';
import { createStore, memoryStorage } from '../src/engine/store.js';
import { createEngine } from '../src/engine/index.js';
import { DEFAULT_GOALS } from '../src/engine/rings.js';

describe('createStore', () => {
  it('starts with the default goals', () => {
    expect(createStore(memoryStorage()).getGoals()).toEqual(DEFAULT_GOALS);
  });

  it('round-trips an entry', () => {
    const store = createStore(memoryStorage());
    store.putEntry({ date: '2026-08-21', move: 520, exercise: 31, stand: 12 });
    expect(store.getEntry('2026-08-21')?.move).toBe(520);
  });

  it('merges partial goal updates', () => {
    const store = createStore(memoryStorage());
    expect(store.setGoals({ move: 700 })).toEqual({ ...DEFAULT_GOALS, move: 700 });
  });

  it('ignores a non-positive goal', () => {
    const store = createStore(memoryStorage());
    expect(store.setGoals({ move: -1 }).move).toBe(DEFAULT_GOALS.move);
  });

  it('lists entries in ascending date order', () => {
    const store = createStore(memoryStorage());
    store.putEntry({ date: '2026-08-21', move: 1, exercise: 1, stand: 1 });
    store.putEntry({ date: '2026-08-19', move: 1, exercise: 1, stand: 1 });
    expect(store.listEntries().map((entry) => entry.date)).toEqual(['2026-08-19', '2026-08-21']);
  });

  it('degrades to defaults on corrupt stored JSON', () => {
    const storage = memoryStorage();
    storage.setItem('rings:v1', '{not json');
    const store = createStore(storage);
    expect(store.getGoals()).toEqual(DEFAULT_GOALS);
    expect(store.listEntries()).toEqual([]);
  });

  it('drops entries with an invalid date instead of throwing', () => {
    const storage = memoryStorage();
    storage.setItem(
      'rings:v1',
      JSON.stringify({ goals: DEFAULT_GOALS, entries: { bad: { date: '2026-02-30', move: 1 } } }),
    );
    expect(createStore(storage).listEntries()).toEqual([]);
  });

  it('clears everything', () => {
    const store = createStore(memoryStorage());
    store.putEntry({ date: '2026-08-21', move: 1, exercise: 1, stand: 1 });
    store.clear();
    expect(store.listEntries()).toEqual([]);
  });
});

describe('createEngine', () => {
  it('logs a day and returns its fresh state', () => {
    const engine = createEngine(createStore(memoryStorage()));
    const state = engine.log({ date: '2026-08-21', move: 500, exercise: 30, stand: 12 });
    expect(state.perfectDay).toBe(true);
    expect(state.streak).toBe(1);
  });

  it('returns a range in ascending date order', () => {
    const engine = createEngine(createStore(memoryStorage()));
    const range = engine.getRange('2026-08-21', 3);
    expect(range.map((day) => day.date)).toEqual(['2026-08-19', '2026-08-20', '2026-08-21']);
  });

  it('rejects a non-positive range length', () => {
    const engine = createEngine(createStore(memoryStorage()));
    expect(() => engine.getRange('2026-08-21', 0)).toThrow(RangeError);
  });

  it('seeds only an empty store', () => {
    const engine = createEngine(createStore(memoryStorage()));
    expect(engine.seedIfEmpty({ endDate: '2026-08-21', days: 10 })).toBe(true);
    expect(engine.seedIfEmpty({ endDate: '2026-08-21', days: 10 })).toBe(false);
    expect(engine.store.listEntries()).toHaveLength(10);
  });

  it('generates deterministic seed data', () => {
    const a = createEngine(createStore(memoryStorage()));
    const b = createEngine(createStore(memoryStorage()));
    a.seedIfEmpty({ endDate: '2026-08-21', days: 5 });
    b.seedIfEmpty({ endDate: '2026-08-21', days: 5 });
    expect(a.store.listEntries()).toEqual(b.store.listEntries());
  });
});
