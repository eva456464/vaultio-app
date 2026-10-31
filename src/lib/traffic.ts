export const TRAFFIC_RANGES = ["1d", "7d", "30d", "90d", "12m", "all"] as const;
export type TrafficRange = (typeof TRAFFIC_RANGES)[number];

/** Search Console has no same-day data, so its pages offer every range but "1d". */
export const SEARCH_RANGES = ["7d", "30d", "90d", "12m", "all"] as const satisfies readonly TrafficRange[];
export type SearchRange = (typeof SEARCH_RANGES)[number];

export const RANGE_DAYS: Record<TrafficRange, number | null> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90, "12m": 365, all: null };

/** Adds days to an ISO date (YYYY-MM-DD) without time-zone drift. */
export function shiftDay(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * First day of the last N days ending on (and including) `end`, or `earliest` for all time.
 * The one definition used for GA4 requests, stored rows and Search Console alike.
 */
export function rangeStart(end: string, range: TrafficRange, earliest: string) {
  const days = RANGE_DAYS[range];
  return days === null ? earliest : shiftDay(end, -(days - 1));
}

export const isTrafficRange = (value: unknown): value is TrafficRange => TRAFFIC_RANGES.includes(value as TrafficRange);
