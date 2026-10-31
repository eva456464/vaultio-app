/** Renders a client report as a standalone, printable A4 HTML document. */
import { createTranslator } from "next-intl";
import type { ReportBlock } from "@/db/schema";
import { countryName } from "@/lib/countries";
import { ASSISTANT_NAMES } from "@/lib/visibility";
import en from "@/messages/en.json";
import type { ReportData } from "./data";

type Options = {
  data: ReportData;
  blocks: Set<ReportBlock>;
  kpiMetrics: ("clicks" | "impressions" | "position")[];
  brand: { name: string; accentColor: string; logoUrl: string | null };
  print?: boolean;
};

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const num = (value: number) => new Intl.NumberFormat("en-US", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, notation: value >= 10_000 ? "compact" : "standard" }).format(value);
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const humanize = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replaceAll("_", " ");
const bold = (chunks: string) => `<strong>${chunks}</strong>`;

/** Report text comes from the `report` namespace in en.json; the worker uses it outside a request. */
export const reportTranslator = () => createTranslator({ locale: "en", messages: en });
type Translator = ReturnType<typeof reportTranslator>;
type MessageKey = Parameters<Translator>[0];

/** Looks up a key built at runtime (issue types, milestone categories); null when the catalog has no entry. */
function lookup(t: Translator, key: string, values?: Record<string, string | number>) {
  return t.has(key as MessageKey) ? t(key as MessageKey, values) : null;
}

const CURRENCY_MILESTONES = new Set(["backlinks_value", "ad_spend_saved"]);

const milestoneLabel = (t: Translator, category: string, threshold: number) =>
  lookup(t, `milestones.${category}`, { value: CURRENCY_MILESTONES.has(category) ? usd(threshold) : threshold }) ?? `${humanize(category)}: ${num(threshold)}`;

/** Change badge: `value` decides direction and colour, `label` is the formatted amount. */
function change(value: number | null, label: string) {
  if (value === null) return "";
  const arrow = value === 0 ? "→" : value > 0 ? "▲" : "▼";
  return `<span class="delta ${value === 0 ? "" : value > 0 ? "good" : "bad"}">${arrow} ${esc(label)}</span>`;
}

function clicksChart(t: Translator, daily: ReportData["search"]["daily"]) {
  if (!daily.length) return "";
  const width = 640;
  const height = 150;
  const max = Math.max(1, ...daily.map((point) => point.clicks));
  const gap = 2;
  const barWidth = Math.max(2, width / daily.length - gap);
  const bars = daily
    .map((point, index) => {
      const h = Math.round((point.clicks / max) * (height - 20));
      return `<rect x="${(index * width) / daily.length}" y="${height - h}" width="${barWidth}" height="${h}" rx="2"><title>${esc(t("report.search.bar", { date: day(point.date), clicks: point.clicks }))}</title></rect>`;
    })
    .join("");
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(t("report.search.chart"))}"><line x1="0" x2="${width}" y1="${height}" y2="${height}" class="axis"/>${bars}</svg>
  <div class="chart-axis"><span>${esc(day(daily[0]!.date))}</span><span>${esc(t("report.search.chartMax", { max: num(max) }))}</span><span>${esc(day(daily.at(-1)!.date))}</span></div>`;
}

function table(headers: string[], rows: (string | number)[][]) {
  return `<table><thead><tr>${headers.map((h, i) => `<th${i ? ' class="num"' : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell, i) => `<td${i ? ' class="num"' : ""}>${typeof cell === "number" ? num(cell) : esc(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function renderReport({ data, blocks, kpiMetrics, brand, print }: Options) {
  const t = reportTranslator();
  const has = (block: ReportBlock) => blocks.has(block);
  const site = host(data.site.url);
  const siteName = data.site.brandName ?? site;
  const sections: string[] = [];
  const section = (title: string, body: string) => `<section><h2>${esc(title)}</h2>${body}</section>`;
  const kpi = (label: string, value: string, delta = "") => `<div class="kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong>${delta}</div>`;
  const pctChange = (value: number | null) => change(value, value === null ? "" : `${Math.abs(value)}%`);

  const tiles: [string, string][] = [];
  if (data.authority.valueSaved) tiles.push([t("report.tiles.backlinkValue"), usd(data.authority.valueSaved)]);
  if (data.search.impressions) tiles.push([t("report.tiles.impressions"), num(data.search.impressions)]);
  if (data.articles.length) tiles.push([t("report.tiles.articles"), num(data.articles.length)]);
  if (data.aiVisibility) tiles.push([t("report.tiles.aiVisibility"), `${Math.round((data.aiVisibility.mentions / data.aiVisibility.answers) * 100)}%`]);
  if (data.authority.domainRating !== null && data.authority.domainRating !== undefined) tiles.push([t("report.tiles.authority"), String(data.authority.domainRating)]);
  if (data.siteHealth) tiles.push([t("report.tiles.siteHealth"), `${data.siteHealth.score}/100`]);

  if (has("achievements") && data.achievements.length) {
    sections.push(
      section(
        t("report.achievements.title"),
        `<div class="badges">${data.achievements
          .map((m) => `<div class="badge"><strong>${esc(milestoneLabel(t, m.category, m.threshold))}</strong><span>${esc(t("report.achievements.reached", { date: day(m.achievedAt.toISOString()) }))}</span></div>`)
          .join("")}</div>`,
      ),
    );
  }

  if (has("summary") && data.search.daily.length) {
    const delta = data.search.clicksChange;
    sections.push(
      `<p class="summary">${t.markup("report.summary", {
        b: bold,
        clicks: num(data.search.clicks),
        impressions: num(data.search.impressions),
        site: esc(site),
        direction: delta === null || delta === 0 ? "none" : delta > 0 ? "up" : "down",
        change: String(Math.abs(delta ?? 0)),
      })}</p>`,
    );
  }

  if ((has("kpis") || has("clicksChart")) && data.search.daily.length) {
    const kpis: string[] = [];
    if (kpiMetrics.includes("clicks")) kpis.push(kpi(t("report.search.clicks"), num(data.search.clicks), pctChange(data.search.clicksChange)));
    if (kpiMetrics.includes("impressions")) kpis.push(kpi(t("report.search.impressions"), num(data.search.impressions), pctChange(data.search.impressionsChange)));
    if (kpiMetrics.includes("position") && data.search.position !== null) {
      const moved = data.search.positionChange;
      kpis.push(kpi(t("report.search.position"), data.search.position.toFixed(1), change(moved, moved === null ? "" : t("report.search.places", { count: Math.abs(moved) }))));
    }
    sections.push(section(t("report.search.title"), `${has("kpis") ? `<div class="kpis">${kpis.join("")}</div>` : ""}${has("clicksChart") ? clicksChart(t, data.search.daily) : ""}`));
  }

  const clicks = t("report.columns.clicks");
  const impressions = t("report.columns.impressions");
  if (has("countries") && data.countries.length)
    sections.push(section(t("report.countries.title"), table([t("report.countries.column"), clicks, impressions], data.countries.map((r) => [countryName(r.key, "en"), r.clicks, r.impressions]))));
  if (has("pages") && data.pages.length)
    sections.push(section(t("report.pages.title"), table([t("report.pages.column"), clicks, impressions], data.pages.map((r) => [host(r.key), r.clicks, r.impressions]))));
  if (has("keywords") && data.keywords.length)
    sections.push(section(t("report.keywords.title"), table([t("report.keywords.column"), clicks, t("report.columns.position")], data.keywords.map((r) => [r.key, r.clicks, Number(r.position).toFixed(1)]))));

  if (has("articles") && data.articles.length) {
    sections.push(
      section(
        t("report.articles.title"),
        `<ul class="list">${data.articles
          .map((a) => {
            const meta = [day(a.publishedAt!.toISOString()), a.words ? t("report.articles.words", { count: a.words }) : null, a.url ? host(a.url) : null].filter(Boolean).join(" · ");
            return `<li><strong>${esc(a.title)}</strong><span>${esc(meta)}</span></li>`;
          })
          .join("")}</ul>`,
      ),
    );
  }

  if (has("backlinks") && (data.authority.totalLinks || data.authority.domainRating !== null)) {
    const rating = data.authority.domainRating;
    sections.push(
      section(
        t("report.authority.title"),
        `<div class="kpis">${rating !== null && rating !== undefined ? kpi(t("report.authority.domainRating"), String(rating)) : ""}${kpi(t("report.authority.linking"), num(data.authority.totalLinks))}${kpi(t("report.authority.new"), num(data.authority.newLinks.length))}</div>
        ${data.authority.newLinks.length ? table([t("report.authority.newSite"), t("report.authority.domainRating")], data.authority.newLinks.map((l) => [l.domain, l.dr ?? "—"])) : ""}`,
      ),
    );
  }

  if (has("siteHealth") && data.siteHealth) {
    const health = data.siteHealth;
    const issues = health.top
      .map(
        (issue) =>
          `<li><strong>${esc(lookup(t, `siteHealth.issueNames.${issue.type}`) ?? humanize(issue.type))}</strong><span class="sev ${issue.severity}">${esc(t(`siteHealth.severity.${issue.severity}`))}</span><span>${esc(t("report.siteHealth.affected", { count: issue.pages }))}</span></li>`,
      )
      .join("");
    sections.push(
      section(
        t("report.siteHealth.title"),
        `<div class="kpis">${kpi(t("report.siteHealth.score"), `${health.score}/100`)}${kpi(t("report.siteHealth.pages"), num(health.pages))}${kpi(t("report.siteHealth.issues"), num(health.issues))}</div>${issues ? `<ul class="list">${issues}</ul>` : ""}`,
      ),
    );
  }

  if (has("community") && data.community.replies.length) {
    const community = data.community;
    const replies = community.replies
      .map((reply) => {
        const where = reply.platform === "reddit" && reply.subreddit ? `r/${reply.subreddit}` : t(`report.community.${reply.platform}`);
        return `<li><strong><a href="${esc(reply.url)}">${esc(reply.title)}</a></strong><span>${esc(`${where} · ${day(reply.date)}`)}</span></li>`;
      })
      .join("");
    sections.push(
      section(
        t("report.community.title"),
        `<div class="kpis">${kpi(t("report.community.redditReplies"), num(community.reddit))}${kpi(t("report.community.quoraAnswers"), num(community.quora))}${kpi(t("report.community.found"), num(community.found))}</div><ul class="list">${replies}</ul>`,
      ),
    );
  }

  if (has("aiVisibility") && data.aiVisibility) {
    const ai = data.aiVisibility;
    sections.push(
      section(
        t("report.aiVisibility.title"),
        `<p class="summary">${t.markup("report.aiVisibility.summary", {
          b: bold,
          assistants: esc(ai.assistants.map((a) => ASSISTANT_NAMES[a] ?? a).join(", ")),
          brand: esc(siteName),
          mentions: String(ai.mentions),
          answers: String(ai.answers),
          date: esc(day(ai.checkedAt)),
        })}</p>`,
      ),
    );
  }

  const empty = sections.length === 0 ? `<p class="empty">${esc(t("report.empty"))}</p>` : "";
  const period = { start: day(data.period.start), end: day(data.period.end) };

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t("report.documentTitle", { brand: brand.name, site, ...period }))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 13mm; }
  :root { --accent: ${esc(brand.accentColor)}; --ink: #15171c; --muted: #656c7a; --faint: #99a0ad; --line: #e4e6eb; --wash: #f3f4f7; --good: #1d6b4a; --good-bg: #eef4f0; --bad: #9a5340; --bad-bg: #fbeae6; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e9eaee; font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif; color: var(--ink); font-size: 12.5px; line-height: 1.55; }
  .page { width: 210mm; min-height: 297mm; margin: 24px auto; background: #fff; padding: 14mm 13mm; box-shadow: 0 8px 30px rgb(0 0 0 / .08); }
  /* Narrower than A4 on screen (preview pane, phones): the page fills the width instead of being cut off. */
  @media screen and (max-width: 860px) { body { background: #fff; } .page { width: auto; min-height: 0; margin: 0; box-shadow: none; padding: 28px 24px; } }
  @media screen and (max-width: 560px) { .tiles, .kpis { grid-template-columns: repeat(2, 1fr) !important; } .badges { grid-template-columns: 1fr !important; } header { flex-wrap: wrap; } header .when { text-align: left; width: 100%; } }
  @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; padding: 0; width: auto; min-height: 0; } }
  header { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 2px solid var(--accent); }
  header img { width: 34px; height: 34px; border-radius: 8px; object-fit: contain; }
  header .who { flex: 1; } header .who strong { display: block; font-size: 15px; } header .who span { color: var(--muted); }
  header .when { text-align: right; color: var(--muted); }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0 6px; }
  .tile { background: var(--wash); border-radius: 10px; padding: 10px 12px; } .tile span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); } .tile strong { font-size: 19px; }
  section { margin-top: 20px; break-inside: avoid; }
  h2 { font-size: 14px; margin: 0 0 8px; padding-left: 8px; border-left: 3px solid var(--accent); }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .kpi { border: 1px solid var(--line); border-radius: 10px; padding: 9px 11px; } .kpi span { display: block; color: var(--muted); font-size: 11px; } .kpi strong { font-size: 17px; margin-right: 6px; }
  .delta { font-size: 11px; color: var(--muted); } .delta.good { color: var(--good); } .delta.bad { color: var(--bad); }
  .chart { width: 100%; height: auto; } .chart rect { fill: var(--accent); } .chart .axis { stroke: var(--line); }
  .chart-axis { display: flex; justify-content: space-between; color: var(--faint); font-size: 10px; }
  table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; padding: 5px 6px; border-bottom: 1px solid var(--line); }
  td { padding: 6px; border-bottom: 1px solid var(--line); } .num { text-align: right; font-variant-numeric: tabular-nums; }
  .list { list-style: none; margin: 0; padding: 0; } .list li { padding: 7px 0; border-bottom: 1px solid var(--line); display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; } .list li span { color: var(--muted); }
  .sev { font-size: 10px; text-transform: uppercase; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: var(--wash); } .sev.high { color: var(--bad); background: var(--bad-bg); }
  .badges { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; } .badge { background: var(--good-bg); border-radius: 10px; padding: 9px 11px; } .badge strong { display: block; color: var(--good); } .badge span { color: var(--muted); font-size: 11px; }
  .summary { background: var(--wash); border-radius: 10px; padding: 10px 12px; margin: 14px 0 0; }
  .empty { color: var(--muted); margin-top: 24px; }
  footer { margin-top: 28px; color: var(--faint); font-size: 10px; text-align: center; }
</style></head>
<body><div class="page">
<header>${brand.logoUrl ? `<img src="${esc(brand.logoUrl)}" alt="">` : ""}<div class="who"><strong>${esc(siteName)}</strong><span>${esc(site)}</span></div>
<div class="when"><strong>${esc(t("report.monthly"))}</strong><br>${esc(period.start)} – ${esc(period.end)}</div></header>
${tiles.length ? `<div class="tiles">${tiles.slice(0, 6).map(([label, value]) => `<div class="tile"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div>` : ""}
${sections.join("\n")}
${empty}
<footer>${esc(t("report.preparedBy", { brand: brand.name }))}</footer>
</div>${print ? `<script>window.addEventListener("load", () => setTimeout(() => window.print(), 300));</script>` : ""}</body></html>`;
}
