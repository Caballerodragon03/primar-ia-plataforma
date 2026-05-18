/**
 * Business-time helpers.
 *
 * Used for the "48 horas hábiles" countdown between when a vendedor signs
 * the contract and when the comprador must pay the commission + sign.
 *
 * Definition (Spanish marketplaces standard):
 *   - Hour is "hábil" if it falls on Monday-Friday, any hour of the day.
 *   - Weekends (Saturday + Sunday) do NOT count.
 *   - Public holidays are NOT considered (intentional simplification —
 *     adding a national/regional calendar adds complexity and corner cases
 *     that the user explicitly did not request).
 *
 * Implementation is deterministic and works in any timezone — we treat
 * dates as opaque Date objects and just walk hour by hour.
 */

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Returns true if the given Date is a business hour (Mon-Fri).
 */
export function isBusinessHour(date: Date): boolean {
  const day = date.getUTCDay(); // 0=Sun, 6=Sat
  return day !== 0 && day !== 6;
}

/**
 * Adds N business hours to `from`. Walks hour by hour skipping weekends.
 * For small N (we use 48) this is plenty efficient (~48 iterations).
 *
 * Example: Friday 18:00 + 48h hábiles = Tuesday 18:00 (Sat+Sun skipped).
 */
export function addBusinessHours(from: Date, hours: number): Date {
  if (hours <= 0) return new Date(from.getTime());
  const cursor = new Date(from.getTime());
  let remaining = hours;
  while (remaining > 0) {
    cursor.setTime(cursor.getTime() + MS_PER_HOUR);
    if (isBusinessHour(cursor)) remaining -= 1;
  }
  return cursor;
}

/**
 * Counts how many business hours remain between now (or `now` arg) and the
 * given deadline. Returns 0 if the deadline has passed. Useful for the UI
 * countdown.
 */
export function businessHoursUntil(deadline: Date, now: Date = new Date()): number {
  if (deadline.getTime() <= now.getTime()) return 0;
  let count = 0;
  const cursor = new Date(now.getTime());
  while (cursor.getTime() < deadline.getTime()) {
    cursor.setTime(cursor.getTime() + MS_PER_HOUR);
    if (cursor.getTime() <= deadline.getTime() && isBusinessHour(cursor)) {
      count += 1;
    }
  }
  return count;
}
