/**
 * Translates the dashboard's text (src/messages/en.json) into the other interface languages with
 * Claude, and checks every translation keeps the message's placeholders and tags.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/translate-messages.ts            # every language, new and changed text only
 *   npx tsx --tsconfig tsconfig.json scripts/translate-messages.ts fr de      # some languages
 *   npx tsx --tsconfig tsconfig.json scripts/translate-messages.ts --check    # only check the existing files (no Claude)
 *   npx tsx --tsconfig tsconfig.json scripts/translate-messages.ts --pseudo --out /tmp/messages   # test run without Claude
 *
 * Needs ANTHROPIC_API_KEY (except --check and --pseudo). Only text that is new or changed since the
 * last run is sent (src/messages/translation-state.json remembers what each translation was made
 * from); text that fails the checks twice stays in English, which the app shows for missing keys.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { z } from "zod/v4";
import { locales } from "@/i18n/routing";
import { ai } from "@/server/ai/claude";

const DIR = join(process.cwd(), "src/messages");
const STATE = join(DIR, "translation-state.json");
const BATCH = 60;
const NAMES: Record<string, string> = { fr: "French", nl: "Dutch", de: "German", es: "Spanish", pt: "Portuguese", it: "Italian" };

type Tree = { [key: string]: Tree | Tree[] | string | string[] } | Tree[];

/** Every string with its path ("content.how.steps.0.1"). */
function flatten(value: unknown, prefix = "", out = new Map<string, string>()) {
  if (typeof value === "string") out.set(prefix, value);
  else if (Array.isArray(value)) value.forEach((item, index) => flatten(item, prefix ? `${prefix}.${index}` : String(index), out));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) flatten(item, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

/** A tree shaped like the English file with the given strings (keys missing from `strings` are left out). */
function rebuild(shape: unknown, strings: Map<string, string>, prefix = ""): unknown {
  if (typeof shape === "string") return strings.get(prefix);
  if (Array.isArray(shape)) {
    const items = shape.map((item, index) => rebuild(item, strings, prefix ? `${prefix}.${index}` : String(index)));
    return items.some((item) => item === undefined) ? undefined : items;
  }
  if (shape && typeof shape === "object") {
    const entries = Object.entries(shape)
      .map(([key, item]) => [key, rebuild(item, strings, prefix ? `${prefix}.${key}` : key)] as const)
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return undefined;
}

/** The placeholders, select options and tags of a message; a translation must have the same. */
function signature(message: string) {
  const parts: string[] = [];
  const walk = (elements: MessageFormatElement[]) => {
    for (const element of elements) {
      if (element.type === TYPE.argument || element.type === TYPE.number || element.type === TYPE.date || element.type === TYPE.time) parts.push(`arg:${element.value}`);
      if (element.type === TYPE.select) {
        parts.push(`select:${element.value}:${Object.keys(element.options).sort().join("|")}`);
        for (const option of Object.values(element.options)) walk(option.value);
      }
      if (element.type === TYPE.plural) {
        // Plural categories differ between languages (Polish has "few"); the argument must stay.
        parts.push(`plural:${element.value}`);
        for (const option of Object.values(element.options)) walk(option.value);
      }
      if (element.type === TYPE.tag) {
        parts.push(`tag:${element.value}`);
        walk(element.children);
      }
    }
  };
  walk(parse(message));
  return [...new Set(parts)].sort().join(",");
}

export function checkTranslation(source: string, translation: string): string | null {
  let expected: string;
  try {
    expected = signature(source);
  } catch {
    return null; // The English text isn't ICU (plain text with braces); nothing to compare.
  }
  try {
    const actual = signature(translation);
    return actual === expected ? null : `placeholders or tags differ (expected ${expected || "none"}, got ${actual || "none"})`;
  } catch (error) {
    return `not a valid message: ${(error as Error).message}`;
  }
}

const hash = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 12);

const ResultSchema = z.object({ translations: z.array(z.object({ key: z.string(), text: z.string() })) });

async function translateBatch(locale: string, batch: [string, string][], feedback?: Map<string, string>) {
  const result = await ai.generateObject({
    schema: ResultSchema,
    effort: "low",
    maxTokens: 16000,
    system:
      `You translate the interface of a white-labelled SEO software dashboard from English into ${NAMES[locale] ?? locale}. ` +
      "Write natural, concise interface text as a native product team would, using the informal or formal address that is usual for software in that language, consistently. " +
      "Messages use ICU MessageFormat: keep every {placeholder} exactly as it is, keep the structure of {count, plural, ...} and {x, select, ...} (translate only the text inside the branches, and use the plural categories the language needs), " +
      "keep tags like <b>…</b> or <highlight>…</highlight> around the matching words, and keep # inside plurals. " +
      "Keep product and brand names as they are (Google Search Console, Google Analytics, WordPress, Shopify, WooCommerce, Webflow, Wix, Ghost, Stripe, Reddit, Quora, ChatGPT, Claude, Gemini, Perplexity). " +
      "Return one translation for every key, with the key unchanged.",
    prompt: batch.map(([key, text]) => `${key}: ${JSON.stringify(text)}${feedback?.get(key) ? `  (previous attempt was wrong: ${feedback.get(key)})` : ""}`).join("\n"),
  });
  return new Map(result.translations.map((entry) => [entry.key, entry.text]));
}

/** A visible stand-in "translation" for test runs: accented letters, placeholders and tags untouched. */
function pseudo(text: string) {
  const accents: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú", A: "Á", E: "É", O: "Ó" };
  let depth = 0;
  let inTag = false;
  let out = "";
  for (const char of text) {
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (char === "<") inTag = true;
    out += depth === 0 && !inTag ? (accents[char] ?? char) : char;
    if (char === ">") inTag = false;
  }
  return `⟦${out}⟧`;
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const usePseudo = args.includes("--pseudo");
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1]! : DIR;
  const chosen = args.filter((arg, index) => !arg.startsWith("--") && index !== outIndex + 1);
  const targets = (chosen.length ? chosen : locales.filter((locale) => locale !== "en")) as string[];
  if (!check && !usePseudo && !process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is needed to translate (or use --check / --pseudo)");

  const english = JSON.parse(readFileSync(join(DIR, "en.json"), "utf8")) as Tree;
  const source = flatten(english);
  const state = (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {}) as Record<string, Record<string, string>>;
  let problems = 0;

  for (const locale of targets) {
    const file = join(outDir, `${locale}.json`);
    const existing = flatten(existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});
    const made = state[locale] ?? {};

    if (check) {
      for (const [key, text] of existing) {
        const english = source.get(key);
        if (english === undefined) continue;
        const problem = checkTranslation(english, text);
        if (problem) {
          problems++;
          console.log(`${locale} ${key}: ${problem}`);
        }
      }
      const missing = [...source.keys()].filter((key) => !existing.has(key)).length;
      console.log(`${locale}: ${existing.size} translated, ${missing} missing (shown in English)`);
      continue;
    }

    // New text, and text whose English changed since it was translated.
    const todo = [...source].filter(([key, text]) => !existing.has(key) || made[key] !== hash(text));
    console.log(`${locale}: ${todo.length} of ${source.size} strings to translate`);
    const translated = new Map(existing);
    for (const key of translated.keys()) if (!source.has(key)) translated.delete(key);
    for (let index = 0; index < todo.length; index += BATCH) {
      const batch = todo.slice(index, index + BATCH);
      let results = usePseudo ? new Map(batch.map(([key, text]) => [key, pseudo(text)])) : await translateBatch(locale, batch);
      // One more try for the ones that broke a placeholder or tag, telling Claude what was wrong.
      const failed = new Map(batch.flatMap(([key, text]) => {
        const result = results.get(key);
        const problem = result === undefined ? "missing" : checkTranslation(text, result);
        return problem ? [[key, problem] as const] : [];
      }));
      if (failed.size && !usePseudo) {
        const retried = await translateBatch(locale, batch.filter(([key]) => failed.has(key)), failed);
        results = new Map([...results, ...retried]);
      }
      for (const [key, text] of batch) {
        const result = results.get(key);
        if (result === undefined || checkTranslation(text, result)) {
          problems++;
          translated.delete(key);
          console.log(`  kept in English: ${key}`);
          continue;
        }
        translated.set(key, result);
        made[key] = hash(text);
      }
      process.stdout.write(`  ${Math.min(index + BATCH, todo.length)}/${todo.length}\n`);
    }
    for (const key of Object.keys(made)) if (!source.has(key)) delete made[key];
    state[locale] = made;
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(file, `${JSON.stringify(rebuild(english, translated) ?? {}, null, 2)}\n`);
    if (outDir === DIR) writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
  }
  if (problems) {
    console.log(check ? `${problems} problem(s): fix those translations or delete them (the app then shows the English text).` : `${problems} problem(s); those strings show in English.`);
    if (check) process.exitCode = 1;
  }
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
