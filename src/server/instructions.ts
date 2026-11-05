/**
 * Writing and image rules (Settings → Writing / Visuals). A request typed by the user, or taken from
 * their feedback on an article, is reviewed by Claude: split into one rule per line, conflicting rules
 * removed, matching settings switched (e.g. "no table of contents" turns that setting off), and
 * anything the agents can't do explained. Without the Claude key the text is kept as written.
 */
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/db";
import { orgWebsites, type InstructionField, type InstructionMeta, type InstructionRule, type InstructionSource } from "@/db/schema";
import { BODY_STYLES, COVER_STYLES, INFOGRAPHIC_STYLES } from "@/lib/visuals";
import { ARTICLE_LENGTHS, ENGLISH_TYPES } from "@/lib/writing";
import { ai } from "./ai/claude";
import type { Site } from "./agents/jobs/types";

export const MAX_RULE_LENGTH = 300;
export const MAX_RULES_TEXT = 4000;
const HISTORY = 20;

/** The rules would pass the length the writer reads; the user removes or shortens one first. */
export class InstructionsTooLongError extends Error {
  constructor() {
    super(`Rules are limited to ${MAX_RULES_TEXT} characters`);
  }
}
const totalLength = (rules: { text: string }[]) => rules.reduce((sum, rule) => sum + rule.text.length + 1, 0);

/** Settings a request may change, with their allowed values. */
const SETTINGS: Record<InstructionField, Record<string, readonly (string | boolean)[]>> = {
  writing: {
    includeTldr: [true, false],
    summaryStyle: ["tldr", "key_takeaways"],
    includeToc: [true, false],
    includePerspective: [true, false],
    includeRecommendedReads: [true, false],
    includeSourcesSection: [true, false],
    includeCitation: [true, false],
    includeInternalLinks: [true, false],
    mentionCompetitorsIfRelevant: [true, false],
    includeJsonLd: [true, false],
    includeFaqJsonLd: [true, false],
    articleLength: ARTICLE_LENGTHS,
    englishType: ENGLISH_TYPES,
    useWwwInLinks: [true, false],
    useTrailingSlashInLinks: [true, false],
  },
  images: {
    heroImageStyle: COVER_STYLES,
    bodyImageStyle: BODY_STYLES,
    infographicStyle: INFOGRAPHIC_STYLES,
    includeInfographic: [true, false],
    includeYoutube: [true, false],
  },
};

const ReviewSchema = z.object({
  rules: z.array(z.string()),
  otherRules: z.array(z.string()),
  removeRules: z.array(z.number().int()),
  settings: z.array(z.object({ key: z.string(), value: z.union([z.string(), z.boolean()]) })),
  unsupported: z.array(z.object({ request: z.string(), reason: z.string() })),
  summary: z.string(),
});

export type InstructionResult = {
  added: string[];
  removed: string[];
  settings: { key: string; from: string; to: string }[];
  unsupported: { request: string; reason: string }[];
  summary: string;
  pendingReview: boolean;
  /** Rules that belonged to the other list (e.g. an image remark in writing feedback). */
  other: { field: InstructionField; added: string[] };
};

const textField = (field: InstructionField) => (field === "writing" ? "articleInstructions" : "imageInstructions");
export const emptyMeta = (): InstructionMeta => ({ writing: [], images: [], history: [], unsupported: [] });

/** The current rules with where they came from (rules written before this feature count as edits). */
export function rulesOf(site: Site, field: InstructionField): InstructionRule[] {
  const text = (field === "writing" ? site.articleInstructions : site.imageInstructions) ?? "";
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const meta = site.instructionMeta?.[field] ?? [];
  return lines.map((line) => meta.find((rule) => rule.text === line) ?? { text: line, source: "edit", addedAt: site.updatedAt.toISOString() });
}

const joined = (rules: InstructionRule[]) => (rules.length ? rules.map((rule) => rule.text).join("\n") : null);

async function save(site: Site, field: InstructionField, rules: InstructionRule[], meta: InstructionMeta, settings: Record<string, string | boolean> = {}, other?: { field: InstructionField; rules: InstructionRule[] }) {
  await db
    .update(orgWebsites)
    .set({
      ...settings,
      [textField(field)]: joined(rules),
      ...(other ? { [textField(other.field)]: joined(other.rules) } : {}),
      instructionMeta: { ...meta, [field]: rules, ...(other ? { [other.field]: other.rules } : {}) },
      updatedAt: new Date(),
    })
    .where(eq(orgWebsites.id, site.id));
}

export async function reviseInstructions(site: Site, field: InstructionField, request: string, source: InstructionSource, article?: { id: number; title: string }): Promise<InstructionResult> {
  const text = request.trim();
  const current = rulesOf(site, field);
  if (source === "edit" && totalLength(current) + text.length > MAX_RULES_TEXT) throw new InstructionsTooLongError();
  const meta: InstructionMeta = { ...emptyMeta(), ...site.instructionMeta };
  const now = new Date().toISOString();
  const origin = { source, addedAt: now, ...(article ? { articleId: article.id, articleTitle: article.title } : {}) };

  const otherField: InstructionField = field === "writing" ? "images" : "writing";
  const otherCurrent = rulesOf(site, otherField);
  let added: string[] = [];
  let otherAdded: string[] = [];
  let removedIndexes: number[] = [];
  let settings: { key: string; from: string; to: string }[] = [];
  let unsupported: { request: string; reason: string }[] = [];
  let summary = "";
  let pendingReview = false;

  if (process.env.ANTHROPIC_API_KEY) {
    const allowed = SETTINGS[field];
    const review = await ai.generateObject({
      schema: ReviewSchema,
      effort: "low",
      maxTokens: 4000,
      system: [
        `You maintain the ${field === "writing" ? "writing" : "image"} rules a content agent follows for every future ${field === "writing" ? "article" : "generated image"} of ${site.brandName ?? site.url}.`,
        "Turn the user's request into short, clear rules (one instruction each, at most 300 characters, in the user's language) that apply to every future item.",
        source === "edit"
          ? "Keep the user's meaning exactly."
          : "The request is feedback on one article: keep only what should apply to future articles; ignore remarks about that article alone. If nothing general applies, return no rules.",
        `Parts of the request about ${field === "writing" ? "the generated images (what they show, style, people, text in images)" : "the article text"} go in otherRules instead, written the same way.`,
        "Don't repeat a rule that already exists. If a new rule contradicts an existing one, list the old rule's number in removeRules.",
        `When the request is really about one of these settings, change the setting instead of adding a rule: ${Object.entries(allowed)
          .map(([key, values]) => `${key} (${values.join(" | ")})`)
          .join("; ")}.`,
        "List in unsupported anything the agent can't do through rules (e.g. publishing times, prices, changing past articles, editing the website itself, guaranteeing rankings), each with a one-sentence reason.",
        "In summary, explain to the user in one or two plain sentences what you changed and why, only when you did more than copy their words (split a line, dropped or merged something, changed a setting). Otherwise leave it empty.",
      ].join("\n"),
      prompt: [
        `Existing rules:\n${current.map((rule, index) => `${index}. ${rule.text}`).join("\n") || "(none)"}`,
        `Existing ${otherField === "images" ? "image" : "writing"} rules (for otherRules; don't repeat these):\n${otherCurrent.map((rule) => `- ${rule.text}`).join("\n") || "(none)"}`,
        article ? `Article: ${article.title}` : null,
        `Request: ${text.slice(0, 2000)}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    added = review.rules.map((rule) => rule.trim().slice(0, MAX_RULE_LENGTH)).filter((rule) => rule && !current.some((existing) => existing.text === rule));
    otherAdded = review.otherRules.map((rule) => rule.trim().slice(0, MAX_RULE_LENGTH)).filter((rule) => rule && !otherCurrent.some((existing) => existing.text === rule));
    removedIndexes = [...new Set(review.removeRules)].filter((index) => current[index]);
    const siteValues = site as unknown as Record<string, unknown>;
    settings = review.settings
      .filter((change) => allowed[change.key]?.includes(change.value) && siteValues[change.key] !== change.value)
      .map((change) => ({ key: change.key, from: String(siteValues[change.key]), to: String(change.value) }));
    unsupported = review.unsupported.map((item) => ({ request: item.request.slice(0, 300), reason: item.reason.slice(0, 300) }));
    summary = review.summary.trim().slice(0, 600);
  } else {
    // No reviewer: the text is used as written, one rule per line.
    added = text.split("\n").map((line) => line.trim().slice(0, MAX_RULE_LENGTH)).filter(Boolean);
    pendingReview = true;
  }

  const kept = current.filter((_rule, index) => !removedIndexes.includes(index));
  const rules = [...kept, ...added.map((rule) => ({ text: rule, ...origin, ...(pendingReview ? { pendingReview: true } : {}) }))];
  if (totalLength(rules) > MAX_RULES_TEXT) {
    // Rules from feedback make room by dropping the oldest feedback rules; the user's own edits stay.
    if (source === "edit") throw new InstructionsTooLongError();
    let keptCount = kept.length;
    while (totalLength(rules) > MAX_RULES_TEXT) {
      const oldest = rules.findIndex((rule) => rule.source !== "edit");
      if (oldest < 0 || oldest >= keptCount) break;
      rules.splice(oldest, 1);
      keptCount -= 1;
    }
    if (totalLength(rules) > MAX_RULES_TEXT) throw new InstructionsTooLongError();
  }
  const otherRules = [...otherCurrent, ...otherAdded.map((rule) => ({ text: rule, ...origin }))];
  if (totalLength(otherRules) > MAX_RULES_TEXT) otherAdded = [];
  const result: InstructionResult = { added, removed: removedIndexes.map((index) => current[index]!.text), settings, unsupported, summary, pendingReview, other: { field: otherField, added: otherAdded } };
  const changed = added.length || removedIndexes.length || settings.length || unsupported.length || otherAdded.length;
  const nextMeta: InstructionMeta = {
    ...meta,
    history: changed
      ? [
          ...(otherAdded.length ? [{ at: now, field: otherField, source, request: text.slice(0, 500), added: otherAdded, removed: [], settings: [], unsupported: 0, summary: "" }] : []),
          { at: now, field, source, request: text.slice(0, 500), added: result.added, removed: result.removed, settings, unsupported: unsupported.length, summary },
          ...meta.history,
        ].slice(0, HISTORY)
      : meta.history,
    unsupported: [...unsupported.map((item) => ({ field, ...item, at: now })), ...meta.unsupported].slice(0, HISTORY),
  };
  const settingValues = Object.fromEntries(settings.map((change) => [change.key, change.to === "true" ? true : change.to === "false" ? false : change.to]));
  await save(site, field, rules, nextMeta, settingValues, otherAdded.length ? { field: otherField, rules: otherRules } : undefined);
  return result;
}

/** Edits one rule by hand (kept as typed). */
export async function editRule(site: Site, field: InstructionField, index: number, text: string) {
  const rules = rulesOf(site, field);
  if (!rules[index]) throw new Error("Rule not found");
  const meta: InstructionMeta = { ...emptyMeta(), ...site.instructionMeta };
  const next = text.trim().slice(0, MAX_RULE_LENGTH);
  if (!next) return removeRule(site, field, index);
  const previous = rules[index]!.text;
  rules[index] = { text: next, source: "edit", addedAt: new Date().toISOString() };
  if (totalLength(rules) > MAX_RULES_TEXT) throw new InstructionsTooLongError();
  const change = { at: new Date().toISOString(), field, source: "edit" as const, request: next, added: [next], removed: [previous], settings: [], unsupported: 0, summary: "" };
  await save(site, field, rules, { ...meta, history: [change, ...meta.history].slice(0, HISTORY) });
}

export async function removeRule(site: Site, field: InstructionField, index: number) {
  const rules = rulesOf(site, field);
  const removed = rules[index];
  if (!removed) throw new Error("Rule not found");
  const meta: InstructionMeta = { ...emptyMeta(), ...site.instructionMeta };
  const change = { at: new Date().toISOString(), field, source: "edit" as const, request: "", added: [], removed: [removed.text], settings: [], unsupported: 0, summary: "" };
  await save(site, field, rules.filter((_rule, i) => i !== index), { ...meta, history: [change, ...meta.history].slice(0, HISTORY) });
}

export async function dismissUnsupported(site: Site, index: number) {
  const meta: InstructionMeta = { ...emptyMeta(), ...site.instructionMeta };
  await db
    .update(orgWebsites)
    .set({ instructionMeta: { ...meta, unsupported: meta.unsupported.filter((_item, i) => i !== index) }, updatedAt: new Date() })
    .where(eq(orgWebsites.id, site.id));
}

/** What Settings → Writing / Visuals shows for one list. */
export function instructionsView(site: Site, field: InstructionField) {
  const meta: InstructionMeta = { ...emptyMeta(), ...site.instructionMeta };
  return {
    rules: rulesOf(site, field),
    history: meta.history.filter((change) => change.field === field),
    unsupported: meta.unsupported.flatMap((item, index) => (item.field === field ? [{ index, request: item.request, reason: item.reason, at: item.at }] : [])),
  };
}
