export function now(): number {
  return Date.now() / 1000;
}

// Take a daystamp like "20210201" and return unixtime
export function parseDate(s: string): number {
  if (!s || s.length !== 8) {
    throw new Error(`Cannot parse date from string: ${JSON.stringify(s)}`);
  }
  const y = +s.slice(0, 4);
  const m = +s.slice(4, 6);
  const d = +s.slice(6, 8);
  return Date.UTC(y, m - 1, d, 12) / 1000;
}

/* Fixes the supplied unixtime to 00:00:00 UTC on the same day
 @param {Number} ut Unix time  */
export const daysnap = (ut: number): number => Math.floor(ut / 86400) * 86400;
