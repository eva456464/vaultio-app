/** Stripe access. Billing is on when STRIPE_SECRET_KEY is set; without it nothing is billed. */
import Stripe from "stripe";
import { ALL_LOOKUP_KEYS } from "@/lib/billing";

export const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | null = null;

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Billing is not configured (STRIPE_SECRET_KEY)");
  if (!client) {
    // STRIPE_API_BASE points the SDK at a local mock in development (scripts/dev-fixtures/mock-stripe.py).
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      maxNetworkRetries: 2,
      appInfo: { name: "Vaultio" },
      ...(base ? { host: base.hostname, port: Number(base.port || (base.protocol === "https:" ? 443 : 80)), protocol: base.protocol.replace(":", "") as "http" | "https" } : {}),
    });
  }
  return client;
}

export type CatalogPrice = { id: string; lookupKey: string; amount: number; currency: string; interval: "month" | "year" | null; credits: number | null; productName: string };

let catalog: { at: number; prices: Map<string, CatalogPrice> } | null = null;

/** Active prices by lookup key, cached for ten minutes. Missing keys mean that option isn't on sale. */
export async function priceCatalog(): Promise<Map<string, CatalogPrice>> {
  if (catalog && Date.now() - catalog.at < 10 * 60_000) return catalog.prices;
  const prices = new Map<string, CatalogPrice>();
  const result = await stripe().prices.list({ lookup_keys: ALL_LOOKUP_KEYS, active: true, limit: 100, expand: ["data.product"] });
  for (const price of result.data) {
    if (!price.lookup_key) continue;
    const product = typeof price.product === "object" && price.product && !("deleted" in price.product && price.product.deleted) ? (price.product as Stripe.Product) : null;
    prices.set(price.lookup_key, {
      id: price.id,
      lookupKey: price.lookup_key,
      amount: price.unit_amount ?? 0,
      currency: price.currency,
      interval: (price.recurring?.interval as "month" | "year" | undefined) ?? null,
      credits: price.metadata?.credits ? Number(price.metadata.credits) : null,
      productName: product?.name ?? price.lookup_key,
    });
  }
  catalog = { at: Date.now(), prices };
  return prices;
}

/** Forgets cached prices (after the setup script or a price change). */
export const resetPriceCatalog = () => {
  catalog = null;
};
