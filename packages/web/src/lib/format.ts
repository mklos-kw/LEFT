const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const DAY_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

const parse = (isoDay: string) => new Date(`${isoDay.slice(0, 10)}T12:00:00Z`);

/** "20 Oct – 2 Nov 2026" (or a single day). */
export function formatRange(from?: string, to?: string): string {
  if (!from) return '';
  if (!to || from.slice(0, 10) === to.slice(0, 10)) return DAY_YEAR.format(parse(from));
  return `${DAY.format(parse(from))} – ${DAY_YEAR.format(parse(to))}`;
}

export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}

/** `YYYY-MM-DD` of the user's local calendar day (not UTC, which can be a day off). */
export function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local date `days` days before `now` (calendar days, so DST changes don't shift it). */
export function daysAgo(days: number, now: Date = new Date()): string {
  return isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
