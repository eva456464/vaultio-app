/**
 * Fonts for scripts the bundled Inter / Source Serif files don't cover (Chinese, Japanese, Korean,
 * Thai, Devanagari, Bengali, Tamil…). Google Fonts makes a font file with just the characters an
 * infographic uses (the `text` parameter), so only a few kilobytes are downloaded per image and
 * nothing large is installed. Kept in memory for the life of the process.
 */

export type ExtraFont = { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" };

/** Names the infographic's font stacks list after the bundled fonts. */
export const EXTRA_FAMILIES = ["Extra-1", "Extra-2", "Extra-3"];

type Script = { pattern: RegExp; family: (language: string) => string };

const SCRIPTS: Script[] = [
  // Han characters are drawn the way the article's language writes them.
  { pattern: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}　-〿＀-￯]/u, family: (language) => (language === "ja" ? "Noto Sans JP" : language === "ko" ? "Noto Sans KR" : language === "zh-TW" ? "Noto Sans TC" : language === "zh-HK" ? "Noto Sans HK" : "Noto Sans SC") },
  { pattern: /\p{Script=Thai}/u, family: () => "Noto Sans Thai" },
  { pattern: /\p{Script=Devanagari}/u, family: () => "Noto Sans Devanagari" },
  { pattern: /\p{Script=Bengali}/u, family: () => "Noto Sans Bengali" },
  { pattern: /\p{Script=Tamil}/u, family: () => "Noto Sans Tamil" },
  { pattern: /\p{Script=Georgian}/u, family: () => "Noto Sans Georgian" },
  { pattern: /\p{Script=Armenian}/u, family: () => "Noto Sans Armenian" },
];

/** Text in Arabic or Hebrew script (satori doesn't lay out right-to-left text). */
export const hasRightToLeft = (text: string) => /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(text);

const cache = new Map<string, ExtraFont[]>();
const API = () => process.env.GOOGLE_FONTS_API ?? "https://fonts.googleapis.com";
// An older browser's user agent makes Google Fonts answer with WOFF, which satori reads (not WOFF2).
const USER_AGENT = "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";

async function download(family: string, text: string, name: string): Promise<ExtraFont[]> {
  const key = `${family}|${name}|${text}`;
  if (cache.has(key)) return cache.get(key)!;
  const query = `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;600;700&text=${encodeURIComponent(text)}`;
  const css = await fetch(`${API()}/css2?${query}`, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!css.ok) throw new Error(`Google Fonts returned HTTP ${css.status} for ${family}`);
  const faces = [...(await css.text()).matchAll(/@font-face\s*{([^}]*)}/g)].map((match) => ({
    weight: Number(match[1]!.match(/font-weight:\s*(\d+)/)?.[1] ?? 400),
    url: match[1]!.match(/url\((https?:[^)]+)\)/)?.[1],
  }));
  const fonts: ExtraFont[] = [];
  for (const face of faces) {
    if (!face.url || ![400, 600, 700].includes(face.weight)) continue;
    const response = await fetch(face.url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Couldn't download ${family} (HTTP ${response.status})`);
    fonts.push({ name, data: Buffer.from(await response.arrayBuffer()), weight: face.weight as 400 | 600 | 700, style: "normal" });
  }
  if (!fonts.length) throw new Error(`Google Fonts has no ${family} file for this text`);
  cache.set(key, fonts);
  return fonts;
}

/** Downloads fonts for every script in the text the bundled fonts don't cover (none for Latin, Cyrillic, Greek…). */
export async function fontsForText(text: string, language: string): Promise<ExtraFont[]> {
  const families = [...new Set(SCRIPTS.filter((script) => script.pattern.test(text)).map((script) => script.family(language)))];
  if (families.length > EXTRA_FAMILIES.length) throw new Error("Too many writing systems in one infographic");
  // Every character of the text goes in the request: Google returns the glyphs the family has.
  const characters = [...new Set([...text].filter((char) => !/\s/.test(char)))].join("");
  const loaded = await Promise.all(families.map((family, index) => download(family, characters, EXTRA_FAMILIES[index]!)));
  return loaded.flat();
}
