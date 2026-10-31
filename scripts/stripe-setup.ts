/**
 * Creates Vaultio's products and prices in Stripe from scripts/stripe-prices.json (safe to re-run:
 * existing lookup keys are left alone). To change a price later, create a new price in the Stripe
 * dashboard and move the lookup key to it ("Transfer lookup key"); existing subscribers keep theirs.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/stripe-setup.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { stripe } from "@/server/billing/stripe";

type PriceSpec = { lookupKey: string; amount: number | null; interval: "month" | "year"; credits?: number | null };
type Config = { currency: string; products: { name: string; prices: PriceSpec[] }[] };

async function main() {
  const config = JSON.parse(readFileSync(new URL("./stripe-prices.json", import.meta.url), "utf8")) as Config;
  const keys = config.products.flatMap((product) => product.prices.map((price) => price.lookupKey));
  const existing = await stripe().prices.list({ lookup_keys: keys, limit: 100 });
  const have = new Set(existing.data.map((price) => price.lookup_key));

  for (const product of config.products) {
    const todo = product.prices.filter((price) => !have.has(price.lookupKey));
    const skipped = todo.filter((price) => price.amount === null || (price.lookupKey.includes("backlink_credits") && !price.credits));
    for (const price of skipped) console.log(`skip   ${price.lookupKey}: no amount${price.lookupKey.includes("credits") ? " or credits" : ""} set in stripe-prices.json`);
    const create = todo.filter((price) => !skipped.includes(price));
    if (!create.length) {
      for (const price of product.prices.filter((p) => have.has(p.lookupKey))) console.log(`exists ${price.lookupKey}`);
      continue;
    }
    // Reuse the product when some of its prices already exist.
    const sibling = existing.data.find((price) => product.prices.some((spec) => spec.lookupKey === price.lookup_key));
    const productId = sibling ? (typeof sibling.product === "string" ? sibling.product : sibling.product.id) : (await stripe().products.create({ name: product.name, metadata: { app: "vaultio" } })).id;
    for (const price of create) {
      await stripe().prices.create({
        product: productId,
        currency: config.currency,
        unit_amount: price.amount!,
        recurring: { interval: price.interval },
        lookup_key: price.lookupKey,
        ...(price.credits ? { metadata: { credits: String(price.credits) } } : {}),
      });
      console.log(`create ${price.lookupKey}: ${(price.amount! / 100).toFixed(2)} ${config.currency}/${price.interval}`);
    }
  }
  console.log("\nNext: add a webhook endpoint in Stripe for https://<app domain>/api/stripe/webhook with the checkout.session.completed,");
  console.log("customer.subscription.* and invoice.* events, and put its signing secret in STRIPE_WEBHOOK_SECRET.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
