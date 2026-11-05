import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { integrations, organizations, orgWebsites } from "@/db/schema";
import { siteEntitlements } from "../billing/entitlements";
import { billingEnabled } from "../billing/stripe";
import { googleConfigured } from "../google/client";
import { nextWizardStep, WIZARD_STEPS, type WizardStep } from "../onboarding/wizard";

type Site = typeof orgWebsites.$inferSelect;
type Organization = typeof organizations.$inferSelect;

/** Wizard steps that don't apply to this website. */
export async function wizardSkips(site: Site, organization: Organization): Promise<Partial<Record<WizardStep, boolean>>> {
  return {
    // Connecting needs the Google app keys.
    "search-console": !googleConfigured(),
    // Asked once per workspace, not when an agency adds a client.
    survey: organization.isAgency || Boolean(organization.acquisitionChannel),
    // Without billing, or when the website already has a plan.
    plan: !billingEnabled() || organization.billingExempt || (await siteEntitlements(site.id)).active,
  };
}

/** Where each wizard step leads: the next and previous steps that apply ("finish" ends the wizard). */
export function wizardRoute(step: WizardStep, skips: Partial<Record<WizardStep, boolean>>) {
  const index = WIZARD_STEPS.indexOf(step);
  const next = WIZARD_STEPS.slice(index + 1).find((candidate) => !skips[candidate]);
  const previous = [...WIZARD_STEPS.slice(0, index)].reverse().find((candidate) => !skips[candidate]);
  return { next: next ? `/onboarding/${next}` : "finish", back: previous ? `/onboarding/${previous}` : null };
}

export function wizardPosition(site: Site, skips: Partial<Record<WizardStep, boolean>>) {
  return nextWizardStep(site, skips);
}

export async function searchConsoleConnected(siteId: number) {
  const [row] = await db.select({ id: integrations.id }).from(integrations).where(and(eq(integrations.orgWebsiteId, siteId), eq(integrations.type, "gsc")));
  return Boolean(row);
}
