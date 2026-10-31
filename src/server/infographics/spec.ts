/**
 * What an infographic shows, chosen by Claude from one section of the article, and the checks that
 * keep it honest: every number it shows must appear in that section, and bar lengths must match
 * the numbers they're labelled with.
 */
import { z } from "zod/v4";
import { ai } from "@/server/ai/claude";
import type { Site } from "../agents/jobs/types";
import { splitSections } from "../improvements/sections";

export const LAYOUTS = ["bars", "steps", "checklist", "comparison", "stats"] as const;
export type Layout = (typeof LAYOUTS)[number];

const SpecSchema = z.object({
  section: z.number().int().describe("Index of the chosen section from the list, or -1 if no section is worth charting"),
  layout: z.enum(LAYOUTS),
  title: z.string(),
  subtitle: z.string(),
  bars: z.array(z.object({ label: z.string(), value: z.number(), display: z.string() })),
  steps: z.array(z.object({ title: z.string(), detail: z.string() })),
  checklist: z.array(z.string()),
  comparison: z.object({ columns: z.array(z.string()), rows: z.array(z.object({ label: z.string(), cells: z.array(z.string()) })) }),
  stats: z.array(z.object({ value: z.string(), label: z.string() })),
  illustration: z.string().describe("A short description of a small illustration for the topic, without text"),
});
export type InfographicSpec = z.infer<typeof SpecSchema> & { heading: string };

const LIMITS: Record<Layout, [number, number]> = { bars: [2, 8], steps: [3, 7], checklist: [3, 8], comparison: [2, 7], stats: [2, 4] };

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value).trim();

/** Numbers as written ("1,200", "3.5", "40%") reduced to comparable digit strings. */
export function numbersIn(text: string) {
  return (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((raw) => {
    const value = raw.replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
    return String(Number.parseFloat(value));
  });
}

function allText(spec: Omit<InfographicSpec, "heading">) {
  switch (spec.layout) {
    case "bars":
      return spec.bars.map((bar) => `${bar.label} ${bar.display}`);
    case "steps":
      return spec.steps.map((step) => `${step.title} ${step.detail}`);
    case "checklist":
      return spec.checklist;
    case "comparison":
      return [...spec.comparison.columns, ...spec.comparison.rows.flatMap((row) => [row.label, ...row.cells])];
    case "stats":
      return spec.stats.map((stat) => `${stat.value} ${stat.label}`);
  }
}

/** Returns why a spec can't be used (or null when it is sound). */
export function checkSpec(spec: Omit<InfographicSpec, "heading">, sectionText: string): string | null {
  const [min, max] = LIMITS[spec.layout];
  const count = { bars: spec.bars.length, steps: spec.steps.length, checklist: spec.checklist.length, comparison: spec.comparison.rows.length, stats: spec.stats.length }[spec.layout];
  if (count < min || count > max) return `${spec.layout} needs ${min}–${max} items, got ${count}`;
  if (spec.layout === "comparison") {
    const columns = spec.comparison.columns.length;
    if (columns < 2 || columns > 3) return "comparison needs 2–3 columns";
    if (spec.comparison.rows.some((row) => row.cells.length !== columns)) return "comparison rows must fill every column";
  }
  // Every number shown must come from the section (titles included).
  const available = new Set(numbersIn(sectionText));
  const shown = [spec.title, spec.subtitle, ...allText(spec)].flatMap(numbersIn);
  const unknown = shown.filter((number) => !available.has(number));
  if (unknown.length) return `numbers not in the section: ${[...new Set(unknown)].join(", ")}`;
  if (spec.layout === "bars") {
    for (const bar of spec.bars) {
      const labelled = numbersIn(bar.display).map(Number);
      if (!labelled.length || bar.value <= 0) return `bar "${bar.label}" has no number`;
      // The bar's length must be one of its labelled numbers, or between them for a range ("1–2 days").
      if (bar.value < Math.min(...labelled) - 1e-9 || bar.value > Math.max(...labelled) + 1e-9) return `bar "${bar.label}" length doesn't match its label`;
    }
  }
  return null;
}

const SYSTEM =
  "You design one infographic for a blog article, from a single section of it. Pick the section whose content is best shown visually " +
  "(figures to compare, a process, a checklist, a comparison of options, or 2–4 key figures), or -1 if none is. Then choose the layout:\n" +
  "- bars: 2–8 items compared by one number in the same unit (value = that number; display = how it's written, e.g. \"1–2 days\"; for a range, value is its midpoint)\n" +
  "- steps: 3–7 steps of a process, in order (short title + one-line detail)\n" +
  "- checklist: 3–8 short items to check\n" +
  "- comparison: 2–3 options (columns) compared on 2–7 rows (label + one short cell per option)\n" +
  "- stats: 2–4 key figures (value + short label)\n" +
  "Rules: use only facts and numbers written in that section, exactly as written; never invent, estimate, convert or round numbers. " +
  "Keep text short: title up to 60 characters, subtitle up to 110, labels up to 40, cells up to 40. Write in the article's language. " +
  "Fill only the array for the chosen layout and leave the others empty.";

/** Asks Claude for the infographic; null when no section suits one or the answer fails the checks. */
export async function planInfographic(site: Site, input: { title: string; markdown: string }): Promise<InfographicSpec | null> {
  const sections = splitSections(input.markdown).sections
    .map((section, index) => ({ ...section, index }))
    .filter((section) => section.heading && !/^(faq|frequently asked|sources|references|conclusion)/i.test(section.heading));
  if (!sections.length) return null;
  const spec = await ai.generateObject({
    schema: SpecSchema,
    system: SYSTEM,
    prompt: [
      `Article: ${input.title}`,
      `Language: ${site.selectedLanguage}`,
      ...sections.map((section) => `[${section.index}] ## ${section.heading}\n${section.body.slice(0, 2500)}`),
    ].join("\n\n"),
    effort: "low",
    maxTokens: 4000,
  });
  const chosen = sections.find((section) => section.index === spec.section);
  if (spec.section < 0 || !chosen) return null;
  const problem = checkSpec(spec, `${chosen.heading}\n${chosen.body}`);
  if (problem) {
    console.warn(`[infographic] dropped (${problem})`);
    return null;
  }
  return {
    ...spec,
    heading: chosen.heading!,
    title: clip(spec.title, 70),
    subtitle: clip(spec.subtitle, 130),
    bars: spec.bars.map((bar) => ({ ...bar, label: clip(bar.label, 48), display: clip(bar.display, 24) })),
    steps: spec.steps.map((step) => ({ title: clip(step.title, 60), detail: clip(step.detail, 140) })),
    checklist: spec.checklist.map((item) => clip(item, 90)),
    comparison: { columns: spec.comparison.columns.map((column) => clip(column, 32)), rows: spec.comparison.rows.map((row) => ({ label: clip(row.label, 40), cells: row.cells.map((cell) => clip(cell, 60)) })) },
    stats: spec.stats.map((stat) => ({ value: clip(stat.value, 14), label: clip(stat.label, 60) })),
  };
}

/** A text description of the data, for the image's alt text (screen readers and search engines). */
export function describeSpec(spec: InfographicSpec) {
  const items = (() => {
    switch (spec.layout) {
      case "bars":
        return spec.bars.map((bar) => `${bar.label}: ${bar.display}`);
      case "steps":
        return spec.steps.map((step, index) => `${index + 1}. ${step.title}`);
      case "checklist":
        return spec.checklist;
      case "comparison":
        return spec.comparison.rows.map((row) => `${row.label}: ${row.cells.map((cell, index) => `${spec.comparison.columns[index]} ${cell}`).join(", ")}`);
      case "stats":
        return spec.stats.map((stat) => `${stat.value} ${stat.label}`);
    }
  })();
  return `${spec.title}. ${items.join("; ")}`.slice(0, 500);
}
