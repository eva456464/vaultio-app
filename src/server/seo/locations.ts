/**
 * Regions and cities inside a country, for narrowing the target market (Settings → Business →
 * Target location). DataForSEO's Google Ads location list, fetched once per country and cached.
 */
const API = () => process.env.DATAFORSEO_API_BASE?.replace(/\/$/, "") ?? "https://api.dataforseo.com/v3";
const TYPES = new Set(["City", "State", "Region", "County", "Province", "DMA Region", "Municipality", "Neighborhood"]);

export type SubLocation = { locationCode: number; name: string; type: string };
type Raw = { location_code: number; location_name: string; location_type: string; country_iso_code: string };

const cache = new Map<string, Promise<SubLocation[]>>();

export const locationSearchAvailable = () => Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);

async function load(country: string): Promise<SubLocation[]> {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
  const response = await fetch(`${API()}/keywords_data/google_ads/locations/${country.toLowerCase()}`, { headers: { authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`DataForSEO locations returned HTTP ${response.status}`);
  const json = (await response.json()) as { tasks?: { status_code: number; result: Raw[] | null }[] };
  const rows = json.tasks?.[0]?.result ?? [];
  return rows.filter((row) => TYPES.has(row.location_type)).map((row) => ({ locationCode: row.location_code, name: row.location_name, type: row.location_type }));
}

/** Up to 10 regions or cities in the country whose name starts with (or contains) the query. */
export async function searchSubLocations(country: string, query: string): Promise<SubLocation[]> {
  if (!locationSearchAvailable() || query.trim().length < 2) return [];
  const key = country.toUpperCase();
  if (!cache.has(key)) cache.set(key, load(key).catch((error) => (cache.delete(key), Promise.reject(error))));
  const all = await cache.get(key)!;
  const needle = query.trim().toLowerCase();
  const first = (location: SubLocation) => location.name.split(",")[0]!.toLowerCase();
  return all
    .filter((location) => first(location).includes(needle))
    .sort((a, b) => Number(!first(a).startsWith(needle)) - Number(!first(b).startsWith(needle)) || a.name.length - b.name.length)
    .slice(0, 10);
}
