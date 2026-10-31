/**
 * Checks language sites with a stand-in AI provider and the Stripe mock:
 *
 *   STRIPE_SECRET_KEY=sk_test_mock STRIPE_API_BASE=http://localhost:4600 \
 *     npx tsx --tsconfig tsconfig.json scripts/test-languages.ts <primarySiteId>
 *
 * Adds languages to a website, checks they start as copies of its settings with their own market,
 * that the brand-profile step only writes seed topics in the new language, that the catalog is
 * shared, and which languages each plan covers (Scale: 3, Grow: none, the language add-on). Billing
 * rows are written straight to the database and removed afterwards, like the languages it added.
 * Local development only.
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orgWebsites, subscriptions, targetLocations } from "@/db/schema";
import { availableRequirements } from "@/server/agents/capabilities";
import { buildBrandProfile, siteMarket } from "@/server/agents/jobs/strategy";
import { setAiProvider, type AiProvider } from "@/server/ai/claude";
import { siteEntitlements } from "@/server/billing/entitlements";
import { createLanguageSites, languageEligibility, languageFamily } from "@/server/languages";

process.env.ANTHROPIC_API_KEY ||= "stand-in";

const standInAi: AiProvider = {
  async generateObject(request) {
    if (request.system.includes("search phrases potential customers")) {
      const language = request.prompt.match(/Language: (\S+)/)?.[1];
      return { seedTopics: language === "es" ? ["reparación de techos", "costo de techo nuevo", "inspección de techo"] : ["Dachreparatur", "Kosten neues Dach"] } as never;
    }
    throw new Error(`Stand-in has no answer for: ${request.system.slice(0, 60)}`);
  },
  async generateText() {
    throw new Error("not used");
  },
  async research() {
    throw new Error("not used");
  },
  async answer() {
    throw new Error("not used");
  },
};

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

async function main() {
  const primaryId = Number(process.argv[2]);
  if (!primaryId) throw new Error("Usage: tsx scripts/test-languages.ts <primarySiteId>");
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Run with STRIPE_SECRET_KEY (and STRIPE_API_BASE pointing at the Stripe mock)");
  setAiProvider(standInAi);
  const [primary] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, primaryId));
  if (!primary || primary.primaryOrgWebsiteId) throw new Error("Pass a website's main-language site");
  const added: number[] = [];
  const rows: number[] = [];
  try {
    // Languages: copies of the website with their own language and market.
    const [country] = await db.select().from(targetLocations).where(and(eq(targetLocations.orgWebsiteId, primaryId), eq(targetLocations.kind, "country")));
    const created = await createLanguageSites(primary, { languages: ["es"], market: "site" });
    const createdDe = await createLanguageSites(primary, { languages: ["de"], market: "language" });
    added.push(...created.map((site) => site.id), ...createdDe.map((site) => site.id));
    const es = created[0]!;
    const de = createdDe[0]!;
    check(es.primaryOrgWebsiteId === primaryId && es.selectedLanguage === "es" && es.url === primary.url, "language site points to its website, in its language");
    check(es.positioning === primary.positioning && es.brandColor === primary.brandColor && JSON.stringify(es.ctaSettings) === JSON.stringify(primary.ctaSettings), "it starts with the website's settings");
    const esMarket = await siteMarket(es);
    const deMarket = await siteMarket(de);
    check(esMarket.languageCode === "es" && (!country || esMarket.locationCode === country.locationCode), "\"your website's market\" keeps the website's country");
    check(deMarket.languageCode === "de" && deMarket.locationCode === 2276, "\"each language's own country\" targets Germany for German");

    // The brand profile step only writes seed topics in the new language.
    await buildBrandProfile({ site: es, runDate: "2026-11-01" });
    const [esAfter] = await db.select().from(orgWebsites).where(eq(orgWebsites.id, es.id));
    check(esAfter!.seedTopics.includes("reparación de techos") && esAfter!.positioning === primary.positioning, "seed topics in Spanish, business details kept");

    // Shared catalog.
    const primaryHas = (await availableRequirements(primaryId)).has("products");
    check((await availableRequirements(es.id)).has("products") === primaryHas, "the language site sees its website's product catalog");

    // Billing: no plan, Grow, Scale (3 included), and the language add-on.
    await db.delete(subscriptions).where(eq(subscriptions.orgWebsiteId, primaryId));
    check((await languageEligibility(primary)).reason === "noPlan" && !(await siteEntitlements(es.id)).active, "without a plan: languages can't be added and are paused");
    const [main] = await db
      .insert(subscriptions)
      .values({ organizationId: primary.organizationId, orgWebsiteId: primaryId, type: "main", status: "active", plan: "grow", priceLookupKey: "vaultio_grow_monthly", interval: "month" })
      .returning({ id: subscriptions.id });
    rows.push(main!.id);
    const grow = await languageEligibility(primary);
    check(grow.mode === "blocked" && grow.reason === "needsScale", "Grow (no language price set): adding languages needs Scale");
    check((await siteEntitlements(es.id)).language?.coverage === "none" && !(await siteEntitlements(es.id)).active, "Grow: languages are paused");

    await db.update(subscriptions).set({ plan: "scale", priceLookupKey: "vaultio_scale_monthly" }).where(eq(subscriptions.id, main!.id));
    const scale = await languageEligibility(primary);
    const existing = (await languageFamily(primaryId)).length - 1;
    check(scale.mode === (existing < 3 ? "plan" : "blocked") && scale.includedLeft === Math.max(0, 3 - existing), `Scale: ${Math.max(0, 3 - existing)} of 3 included languages left`);
    const more = await createLanguageSites(primary, { languages: ["fr", "it"], market: "language" });
    added.push(...more.map((site) => site.id));
    const family = await languageFamily(primaryId);
    const coverage = await Promise.all(family.slice(1).map(async (site) => [site.selectedLanguage, (await siteEntitlements(site.id)).language?.coverage] as const));
    console.log("  coverage:", coverage.map(([code, value]) => `${code}=${value}`).join(" "));
    check(coverage.slice(0, 3).every(([, value]) => value === "included") && coverage.slice(3).every(([, value]) => value === "none"), "Scale: the 3 oldest languages are included, later ones aren't");

    const fourth = family[4]!;
    const [addon] = await db
      .insert(subscriptions)
      .values({ organizationId: primary.organizationId, orgWebsiteId: fourth.id, type: "language_addition", status: "active", priceLookupKey: "vaultio_language_monthly", interval: "month" })
      .returning({ id: subscriptions.id });
    rows.push(addon!.id);
    const paid = await siteEntitlements(fourth.id);
    check(paid.active && paid.language?.coverage === "addon", "a language with its own add-on runs");
  } finally {
    if (rows.length) await db.delete(subscriptions).where(inArray(subscriptions.id, rows));
    if (added.length) await db.delete(orgWebsites).where(inArray(orgWebsites.id, added));
  }
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
