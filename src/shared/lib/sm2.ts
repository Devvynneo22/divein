/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo 2 algorithm by Piotr Woźniak.
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */
import { addDays, format, startOfDay } from 'date-fns';

export interface SM2Result {
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string; // ISO date string YYYY-MM-DD
}

/**
 * Compute the next review schedule for a card using the SM-2 algorithm.
 *
 * @param quality    Response quality 0–5 (0=complete blackout, 5=perfect)
 * @param repetitions  Number of successful reviews so far
 * @param easeFactor   Current ease factor (default 2.5, min 1.3)
 * @param intervalDays Current interval in days
 */
export function sm2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  intervalDays: number,
): SM2Result {
  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response — reset
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  newEaseFactor = Math.max(1.3, easeFactor + delta);

  const today = startOfDay(new Date());
  const nextReviewDate = addDays(today, newInterval);
  const nextReview = format(nextReviewDate, 'yyyy-MM-dd');

  return {
    intervalDays: newInterval,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    nextReview,
  };
}

/**
 * Preview the interval that would result from a given quality,
 * without modifying any state. Used to show button labels in the UI.
 */
export function previewInterval(
  quality: number,
  repetitions: number,
  easeFactor: number,
  intervalDays: number,
): number {
  return sm2(quality, repetitions, easeFactor, intervalDays).intervalDays;
}
