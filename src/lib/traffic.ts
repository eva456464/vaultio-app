export const TRAFFIC_RANGES = ["1d", "7d", "30d", "90d", "12m", "all"] as const;
export type TrafficRange = (typeof TRAFFIC_RANGES)[number];
