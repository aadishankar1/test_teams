import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isIsoDate, previousDay } from '../src/engine/date.js';

describe('date helpers', () => {
  it('accepts a real calendar date', () => {
    expect(isIsoDate('2026-08-21')).toBe(true);
  });

  it('rejects an overflowing date rather than rolling it over', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
  });

  it('rejects a malformed string', () => {
    expect(isIsoDate('21-08-2026')).toBe(false);
  });

  it('crosses a month boundary', () => {
    expect(previousDay('2026-09-01')).toBe('2026-08-31');
  });

  it('crosses a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('measures a signed day span', () => {
    expect(daysBetween('2026-08-19', '2026-08-21')).toBe(2);
    expect(daysBetween('2026-08-21', '2026-08-19')).toBe(-2);
  });
});
