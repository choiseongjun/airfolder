export function folderDates(start: unknown, end: unknown): [string | null, string | null] {
  if (!start && !end) return [null, null];
  function valid(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  if (!valid(start) || !valid(end) || end < start) throw new Error('INVALID_DATE_RANGE');
  return [start, end];
}
