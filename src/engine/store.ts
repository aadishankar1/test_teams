import type { DayEntry, Goals, RingsStore } from '../types.js';
import { assertIsoDate } from './date.js';
import { DEFAULT_GOALS } from './rings.js';

const STORAGE_KEY = 'rings:v1';

interface Persisted {
  goals: Goals;
  entries: Record<string, DayEntry>;
}

/** The slice of the Storage API we actually use — keeps this testable in Node. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/**
 * Falls back to in-memory when localStorage is missing or throws — Safari in
 * private mode and SSR both do, and losing yesterday's step count is not worth
 * taking the whole board down for.
 */
export function defaultStorage(): StorageLike {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return memoryStorage();
    const probe = `${STORAGE_KEY}:probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStorage();
  }
}

function sanitizeGoals(raw: unknown): Goals {
  const goals = { ...DEFAULT_GOALS };
  if (typeof raw !== 'object' || raw === null) return goals;
  for (const key of ['move', 'exercise', 'stand'] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      goals[key] = value;
    }
  }
  return goals;
}

function sanitizeEntry(raw: unknown): DayEntry | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  const date = record['date'];
  if (typeof date !== 'string') return undefined;

  let iso: string;
  try {
    iso = assertIsoDate(date);
  } catch {
    return undefined;
  }

  const num = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

  return {
    date: iso,
    move: num(record['move']),
    exercise: num(record['exercise']),
    stand: num(record['stand']),
  };
}

/** Corrupt or partially-written state degrades to defaults rather than throwing. */
function read(storage: StorageLike): Persisted {
  const empty: Persisted = { goals: { ...DEFAULT_GOALS }, entries: {} };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return empty;
  }
  if (!raw) return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof parsed !== 'object' || parsed === null) return empty;

  const record = parsed as Record<string, unknown>;
  const entries: Record<string, DayEntry> = {};
  const rawEntries = record['entries'];
  if (typeof rawEntries === 'object' && rawEntries !== null) {
    for (const candidate of Object.values(rawEntries as Record<string, unknown>)) {
      const entry = sanitizeEntry(candidate);
      if (entry) entries[entry.date] = entry;
    }
  }

  return { goals: sanitizeGoals(record['goals']), entries };
}

function write(storage: StorageLike, state: Persisted): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or a locked-down browser: the in-session state is still
    // correct, so keep going rather than failing the interaction.
  }
}

export function createStore(storage: StorageLike = defaultStorage()): RingsStore {
  return {
    getGoals() {
      return read(storage).goals;
    },

    setGoals(partial) {
      const state = read(storage);
      const next = sanitizeGoals({ ...state.goals, ...partial });
      write(storage, { ...state, goals: next });
      return next;
    },

    getEntry(date) {
      return read(storage).entries[assertIsoDate(date)];
    },

    putEntry(entry) {
      const clean = sanitizeEntry(entry);
      if (!clean) throw new RangeError(`Invalid entry for date "${entry.date}"`);
      const state = read(storage);
      state.entries[clean.date] = clean;
      write(storage, state);
    },

    listEntries() {
      return Object.values(read(storage).entries).sort((a, b) => a.date.localeCompare(b.date));
    },

    clear() {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to recover from — the next read falls back to defaults.
      }
    },
  };
}
