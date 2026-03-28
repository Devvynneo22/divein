import { addDays, addWeeks, addMonths, addYears, startOfDay, isBefore, isAfter, isEqual, parseISO, format } from 'date-fns';
import type { RecurrenceRule, RecurrenceFrequency } from '@/shared/types/recurrence';

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

  // Special handling for weekly + daysOfWeek to avoid skipping occurrences
  if (rule.frequency === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
    const baseTime = parseISO(startDate);
    const baseHours = baseTime.getHours();
    const baseMinutes = baseTime.getMinutes();
    const baseSeconds = baseTime.getSeconds();
    // Start from the beginning of the week containing startDate
    const startDayOfWeek = current.getDay();
    let weekStart = startOfDay(addDays(current, -startDayOfWeek));

    while (count < maxCount) {
      // Check each specified day in this week
      for (const dayOfWeek of sortedDays) {
        const candidate = addDays(weekStart, dayOfWeek);
        // Build candidate with original time preserved
        const candidateFull = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(),
          baseHours, baseMinutes, baseSeconds);

        const day = startOfDay(candidateFull);

        // Skip dates before the original start date
        if (isBefore(day, startOfDay(parseISO(startDate)))) continue;

        // Past the range? Done.
        if (isAfter(day, startOfDay(rangeEnd))) { count = maxCount; break; }

        // Past the end date? Done.
        if (endLimit && isAfter(day, startOfDay(endLimit))) { count = maxCount; break; }

        // Within range? Include.
        if (
          (isAfter(day, startOfDay(rangeStart)) || isEqual(day, startOfDay(rangeStart))) &&
          (isBefore(day, startOfDay(rangeEnd)) || isEqual(day, startOfDay(rangeEnd)))
        ) {
          results.push(format(candidateFull, "yyyy-MM-dd'T'HH:mm:ss"));
        }

        count++;
        if (count >= maxCount) break;
      }

      // Jump to the next target week
      weekStart = addWeeks(weekStart, rule.interval);
    }
  } else {
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
        results.push(format(current, "yyyy-MM-dd'T'HH:mm:ss"));
      }

      current = advanceDate(current, rule.frequency, rule.interval);
      count++;
    }
  }

  return results;
}

export function describeRecurrence(rule: RecurrenceRule): string {
  const freq = rule.frequency;
  const interval = rule.interval;
  if (interval === 1) {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  }
  const unit = freq === 'daily' ? 'days' : freq === 'weekly' ? 'weeks' : freq === 'monthly' ? 'months' : 'years';
  return `Every ${interval} ${unit}`;
}
