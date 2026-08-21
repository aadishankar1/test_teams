/** Calendar-date helpers. All dates are ISO `YYYY-MM-DD` strings, UTC-anchored. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms)) return false;
  // Rejects overflow like 2026-02-30, which Date.parse would otherwise roll over.
  return new Date(ms).toISOString().slice(0, 10) === value;
}

export function assertIsoDate(value: string): string {
  if (!isIsoDate(value)) throw new RangeError(`Invalid ISO date: ${value}`);
  return value;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const ms = Date.parse(`${assertIsoDate(date)}T00:00:00Z`);
  return toIsoDate(new Date(ms + days * MS_PER_DAY));
}

export function previousDay(date: string): string {
  return addDays(date, -1);
}

/** Whole days from `from` to `to`; negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${assertIsoDate(from)}T00:00:00Z`);
  const b = Date.parse(`${assertIsoDate(to)}T00:00:00Z`);
  return Math.round((b - a) / MS_PER_DAY);
}
