import { addDays, addWeeks, addMonths, addYears, startOfDay, isBefore, isAfter, isEqual, parseISO, format } from 'date-fns';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // every N frequency units
  endDate?: string; // ISO date, optional
  count?: number; // max occurrences, optional
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
}

function advanceDate(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
  switch (frequency) {
    case 'daily': return addDays(date, interval);
    case 'weekly': return addWeeks(date, interval);
    case 'monthly': return addMonths(date, interval);
    case 'yearly': return addYears(date, interval);
  }
}

/**
 * Compute the next occurrence date after the given date, per the recurrence rule.
 * Returns null if the rule has ended (endDate or count exhausted — count not tracked here).
 */
export function getNextOccurrence(date: string, rule: RecurrenceRule): string | null {
  const current = parseISO(date);
  const next = advanceDate(current, rule.frequency, rule.interval);

  if (rule.endDate) {
    const end = parseISO(rule.endDate);
    if (isAfter(startOfDay(next), startOfDay(end))) return null;
  }

  return format(next, "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * Expand all occurrence dates within [rangeStart, rangeEnd].
 * Returns ISO date strings for each occurrence that falls within the range.
 * `startDate` is the base event start (ISO string).
 */
export function expandOccurrences(
  startDate: string,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const results: string[] = [];
  let current = parseISO(startDate);
  const endLimit = rule.endDate ? parseISO(rule.endDate) : null;
  const maxCount = rule.count ?? 1000; // safety limit
  let count = 0;

  while (count < maxCount) {
    const day = startOfDay(current);

    // Past the range? Done.
    if (isAfter(day, startOfDay(rangeEnd))) break;

    // Past the end date? Done.
    if (endLimit && isAfter(day, startOfDay(endLimit))) break;

    // Within range? Include.
    if (
      (isAfter(day, startOfDay(rangeStart)) || isEqual(day, startOfDay(rangeStart))) &&
      (isBefore(day, startOfDay(rangeEnd)) || isEqual(day, startOfDay(rangeEnd)))
    ) {
      // For weekly with daysOfWeek, check if current day matches
      if (rule.frequency === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (rule.daysOfWeek.includes(current.getDay())) {
          results.push(format(current, "yyyy-MM-dd'T'HH:mm:ss"));
        }
      } else {
        results.push(format(current, "yyyy-MM-dd'T'HH:mm:ss"));
      }
    }

    // Advance
    if (rule.frequency === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      // For weekly + daysOfWeek: advance day by day within the week, then jump by interval weeks
      const nextDay = addDays(current, 1);
      const currentWeekStart = startOfDay(addDays(current, -current.getDay()));
      const nextWeekStart = startOfDay(addDays(nextDay, -nextDay.getDay()));

      if (isEqual(currentWeekStart, nextWeekStart)) {
        // Same week — just advance a day
        current = nextDay;
      } else {
        // New week — jump by (interval - 1) more weeks, start from Sunday
        current = addWeeks(nextWeekStart, rule.interval - 1);
      }
    } else {
      current = advanceDate(current, rule.frequency, rule.interval);
    }

    count++;
  }

  return results;
}

export const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function describeRecurrence(rule: RecurrenceRule): string {
  const freq = rule.frequency;
  const interval = rule.interval;
  if (interval === 1) {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  }
  const unit = freq === 'daily' ? 'days' : freq === 'weekly' ? 'weeks' : freq === 'monthly' ? 'months' : 'years';
  return `Every ${interval} ${unit}`;
}
