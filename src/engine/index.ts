/**
 * Track A public surface. Track B should import from here (or from
 * `../types.js`) and nowhere deeper.
 */
import type { DayEntry, DayState, Goals, RingsStore } from '../types.js';
import { buildDayState } from './rings.js';
import { createStore } from './store.js';
import { generateHistory, type SeedOptions } from './seed.js';
import { addDays, toIsoDate } from './date.js';

export * from './date.js';
export * from './rings.js';
export * from './seed.js';
export { createStore, memoryStorage, defaultStorage, type StorageLike } from './store.js';

export interface RingsEngine {
  /** Render-ready state for one day. Defaults to today (UTC). */
  getDayState(date?: string): DayState;
  /** Render-ready state for `days` days ending at `endDate`, ascending. */
  getRange(endDate: string, days: number): DayState[];
  getGoals(): Goals;
  setGoals(goals: Partial<Goals>): Goals;
  log(entry: DayEntry): DayState;
  /** Populate an empty store with demo history. Returns false if data exists. */
  seedIfEmpty(options: SeedOptions): boolean;
  store: RingsStore;
}

export function createEngine(store: RingsStore = createStore()): RingsEngine {
  const lookup = (date: string): DayEntry | undefined => store.getEntry(date);

  const engine: RingsEngine = {
    getDayState(date = toIsoDate(new Date())) {
      return buildDayState(date, store.getGoals(), lookup);
    },

    getRange(endDate, days) {
      if (!Number.isInteger(days) || days < 1) {
        throw new RangeError(`days must be a positive integer, got ${days}`);
      }
      const goals = store.getGoals();
      const out: DayState[] = [];
      for (let offset = days - 1; offset >= 0; offset -= 1) {
        const iso = addDays(endDate, -offset);
        out.push(buildDayState(iso, goals, lookup));
      }
      return out;
    },

    getGoals() {
      return store.getGoals();
    },

    setGoals(goals) {
      store.setGoals(goals);
      return store.getGoals();
    },

    log(entry) {
      store.putEntry(entry);
      return engine.getDayState(entry.date);
    },

    seedIfEmpty(options) {
      if (store.listEntries().length > 0) return false;
      for (const entry of generateHistory({ ...options, goals: store.getGoals() })) {
        store.putEntry(entry);
      }
      return true;
    },

    store,
  };

  return engine;
}
