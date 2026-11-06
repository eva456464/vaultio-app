"use client";

import { ChevronDown, Info, Plus, Settings2, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip as InfoTip } from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ASSISTANT_NAMES, PROMPT_INTENTS, scoreTier } from "@/lib/visibility";
import { addPrompt, deletePrompt, setPromptActive, updatePrompt } from "@/server/actions/visibility";
import type { BrandRow, getVisibility, SourceRow } from "@/server/queries/visibility";

type Data = Awaited<ReturnType<typeof getVisibility>>;

export function Favicon({ domain }: { domain: string }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-canvas text-[10px] font-semibold uppercase text-ink-secondary" aria-hidden>
      {domain.replace(/^www\./, "").slice(0, 1)}
    </span>
  );
}

export function SentimentBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-subtle">—</span>;
  const style = value >= 60 ? "bg-success-bg text-success" : value >= 40 ? "bg-[#F3F4F6] text-ink-secondary" : "bg-[#FBEAE6] text-[#9A3412]";
  return <span className={cn("inline-flex min-w-9 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", style)}>{value}</span>;
}

export function AssistantChips({ providers }: { providers: string[] }) {
  if (!providers.length) return <span className="text-ink-subtle">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {providers.map((provider) => (
        <span key={provider} className="rounded-md border border-line bg-white px-1.5 py-0.5 text-xs font-medium text-ink">
          {ASSISTANT_NAMES[provider] ?? provider}
        </span>
      ))}
    </span>
  );
}

export function SourcesTable({ rows, limit }: { rows: SourceRow[]; limit?: number }) {
  const t = useTranslations("aiVisibility");
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-secondary">—</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-secondary">
          <th className="w-8 py-2 font-medium">#</th>
          <th className="py-2 font-medium">{t("source")}</th>
          <th className="py-2 text-right font-medium">{t("citationShare")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {shown.map((row, index) => (
          <tr key={row.domain}>
            <td className="py-2.5 text-ink-subtle tabular-nums">{index + 1}</td>
            <td className="py-2.5">
              <a href={row.urls[0] ?? `https://${row.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-ink hover:underline">
                <Favicon domain={row.domain} />
                {row.domain}
              </a>
            </td>
            <td className="py-2.5 text-right tabular-nums text-ink-secondary">{row.share.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function BrandsTable({ rows, total, limit }: { rows: BrandRow[]; total: number; limit?: number }) {
  const t = useTranslations("aiVisibility");
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-secondary">—</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-secondary">
          <th className="w-8 py-2 font-medium">#</th>
          <th className="py-2 font-medium">{t("brand")}</th>
          <th className="py-2 text-right font-medium">{t("mentionedIn")}</th>
          <th className="py-2 text-right font-medium">{t("visibility")}</th>
          <th className="py-2 text-right font-medium">{t("sentiment")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {shown.map((row, index) => (
          <tr key={row.name} className={cn(row.isOwnBrand && "bg-[#FFF6F5]")}>
            <td className="py-2.5 text-ink-subtle tabular-nums">{index + 1}</td>
            <td className="py-2.5 text-ink">
              <span className="flex items-center gap-2">
                {row.name}
                {row.isOwnBrand && <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">{t("you")}</span>}
              </span>
            </td>
            <td className="py-2.5 text-right tabular-nums text-ink-secondary">{t("ofAnswers", { count: row.answers, total })}</td>
            <td className="py-2.5 text-right tabular-nums text-ink-secondary">{row.visibility}%</td>
            <td className="py-2.5 text-right"><SentimentBadge value={row.sentiment} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Card({ title, hint, info, children, className }: { title: string; hint?: string; info?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5 md:p-6", className)}>
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
        {title}
        {info && (
          <InfoTip content={info}>
            <Info className="size-3.5 text-ink-subtle" />
          </InfoTip>
        )}
      </p>
      {hint && <p className="text-xs text-ink-secondary">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function VisibilityOverview({ data }: { data: Data }) {
  const t = useTranslations("aiVisibility");
  const format = useFormatter();
  const tier = scoreTier(data.score);
  const topBrand = data.brands.find((row) => !row.isOwnBrand);
  const topSource = data.sources[0];

  return (
    <div className="space-y-6">
      <p className="rounded-2xl bg-[#F3F4F6] px-5 py-4 text-[15px] leading-relaxed text-ink">
        {t("explanation", { prompts: data.activePrompts, models: data.providers.length, mentions: data.mentions, answers: data.answers, score: data.score })}{" "}
        {topBrand && t("explanationBrand", { brand: topBrand.name, count: topBrand.answers })}{" "}
        {topSource && t("explanationSource", { source: topSource.domain, count: topSource.citations })}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("score")} info={t("scoreInfo")}>
          <p className="font-heading text-[40px] font-semibold leading-none text-ink tabular-nums">
            {data.score}
            <span className="text-lg text-ink-subtle">/100</span>
            <span className="ml-2 font-sans text-sm font-normal text-ink-secondary">{t("scoreFor", { count: data.activePrompts })}</span>
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EEF0F2]">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(data.score, 1)}%` }} />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">{t(`tiers.${tier}`)}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{t(`tierText.${tier}`)}</p>
        </Card>
        <Card title={t("mentions")} info={t("mentionsInfo")}>
          <p className="font-heading text-[40px] font-semibold leading-none text-ink tabular-nums">
            {data.mentions}
            <span className="text-lg text-ink-subtle"> /{data.answers}</span>
          </p>
          <p className="mt-2 text-sm text-ink-secondary">{t("answersCount", { mentions: data.mentions, answers: data.answers })}</p>
          <div className="mt-5">
            <AssistantChips providers={data.providers} />
          </div>
        </Card>
      </div>

      <Card title={t("overTime")}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.history} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="#EEF0F2" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6B7280", fontSize: 12 }}
                tickFormatter={(date: string) => format.dateTime(new Date(`${date}T12:00:00Z`), { month: "short", day: "numeric", timeZone: "UTC" })}
              />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickFormatter={(value: number) => `${value}%`} />
              <Tooltip
                formatter={(value) => [`${value}%`, t("score")]}
                labelFormatter={(date) => format.dateTime(new Date(`${date}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" })}
                contentStyle={{ borderRadius: 12, borderColor: "#EEEEEE", fontSize: 13 }}
              />
              <Line type="monotone" dataKey="score" stroke="var(--brand-accent)" strokeWidth={2} dot={{ r: 4, stroke: "#fff", strokeWidth: 2, fill: "var(--brand-accent)" }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card title={t("topSources")} hint={t("topSourcesHint")}>
          <SourcesTable rows={data.sources} limit={8} />
        </Card>
        <Card title={t("brands")} hint={t("brandsHint")}>
          <BrandsTable rows={data.brands} total={data.answers} limit={8} />
        </Card>
      </div>
    </div>
  );
}

export function PromptsView({ data, brand, allowance, canUpgrade = false }: { data: Data; brand: string; allowance: number; canUpgrade?: boolean }) {
  const t = useTranslations("aiVisibility");
  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.44px] text-ink">{t("prompts.title")}</h2>
          <p className="mt-1 text-[15px] text-ink-secondary">{t("prompts.subtitle")}</p>
        </div>
        <ManagePromptsDialog prompts={data.byPrompt.map((row) => row.prompt)} allowance={allowance} canUpgrade={canUpgrade} />
      </div>
      {data.byPrompt.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-secondary">{t("prompts.empty")}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-secondary">
                <th className="py-2.5 font-medium">{t("prompts.prompt")}</th>
                <th className="py-2.5 font-medium">{t("prompts.intent")}</th>
                <th className="py-2.5 font-medium">{t("prompts.mentioned", { brand })}</th>
                <th className="py-2.5 text-right font-medium">{t("sentiment")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.byPrompt.filter((row) => row.prompt.isActive).map((row) => (
                <tr key={row.prompt.id} className="hover:bg-canvas">
                  <td className="py-3 pr-4">
                    <Link href={`/dashboard/ai-visibility/${row.prompt.id}`} className="font-medium text-ink hover:underline">
                      {row.prompt.text}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-ink-secondary">{t(`intents.${row.prompt.intent}`)}</td>
                  <td className="py-3 pr-4">
                    {row.prompt.lastCheckedAt ? <AssistantChips providers={row.mentionedIn} /> : <span className="text-xs text-ink-subtle">{t("prompts.notChecked")}</span>}
                  </td>
                  <td className="py-3 text-right"><SentimentBadge value={row.sentiment} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ManagePromptsDialog({ prompts, allowance, canUpgrade }: { prompts: Data["byPrompt"][number]["prompt"][]; allowance: number; canUpgrade: boolean }) {
  const t = useTranslations("aiVisibility");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<(typeof PROMPT_INTENTS)[number]>("buying");
  const [editing, setEditing] = useState<{ id: number; text: string; intent: (typeof PROMPT_INTENTS)[number] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = prompts.filter((prompt) => prompt.isActive).length;
  const limitError = t("manage.limitError", { max: allowance });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings2 />
        {t("prompts.manage")}
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{t("manage.title")}</DialogTitle>
        <DialogDescription>{t("manage.subtitle")}</DialogDescription>
        <p className="mt-4 text-sm text-ink-secondary">
          {t("manage.active", { count: active, max: allowance })}
          {active >= allowance && <span className="ml-2 rounded bg-[#FDF3E2] px-1.5 py-0.5 text-xs font-medium text-[#8A6320]">{t("manage.limit")}</span>}
        </p>
        {canUpgrade && active >= allowance && (
          <p className="mt-2 text-sm text-ink-secondary">
            {t("manage.upgrade")}{" "}
            <Link href="/dashboard/settings/billing" className="font-medium text-brand hover:underline">
              {t("manage.upgradeAction")}
            </Link>
          </p>
        )}
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await addPrompt({ text, intent });
              if ("error" in result && result.error) setError(result.error === "limit" ? limitError : result.error);
              else {
                setError(null);
                setText("");
              }
            });
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("manage.placeholder")} className="h-10 min-w-0 flex-1 rounded-control border border-control px-3 text-sm outline-none focus:border-ink/40" />
          <select value={intent} onChange={(e) => setIntent(e.target.value as typeof intent)} className="h-10 rounded-control border border-control px-2 text-sm">
            {PROMPT_INTENTS.map((option) => <option key={option} value={option}>{t(`intents.${option}`)}</option>)}
          </select>
          <Button type="submit" disabled={pending || !text.trim()}>
            <Plus />
            {t("manage.add")}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-[#9A3412]">{error}</p>}
        <ul className="mt-4 max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {prompts.map((prompt) => (
            <li key={prompt.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                role="switch"
                aria-label={t("manage.activeLabel")}
                checked={prompt.isActive}
                onChange={(event) => startTransition(async () => {
                  const result = await setPromptActive(prompt.id, event.target.checked);
                  setError("error" in result && result.error === "limit" ? limitError : null);
                })}
                className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] before:block before:size-4 before:translate-x-0.5 before:rounded-full before:bg-white before:transition-transform checked:bg-[#22A06B] checked:before:translate-x-[18px]"
              />
              {editing?.id === prompt.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-wrap gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    startTransition(async () => {
                      const result = await updatePrompt(prompt.id, { text: editing.text, intent: editing.intent });
                      if ("error" in result && result.error) setError(result.error);
                      else {
                        setError(null);
                        setEditing(null);
                      }
                    });
                  }}
                >
                  <input autoFocus aria-label={t("manage.editLabel")} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} onKeyDown={(e) => e.key === "Escape" && setEditing(null)} className="h-9 min-w-0 flex-1 rounded-control border border-control px-2.5 text-sm outline-none focus:border-ink/40" />
                  <select aria-label={t("manage.intentLabel")} value={editing.intent} onChange={(e) => setEditing({ ...editing, intent: e.target.value as typeof intent })} className="h-9 rounded-control border border-control px-2 text-sm">
                    {PROMPT_INTENTS.map((option) => <option key={option} value={option}>{t(`intents.${option}`)}</option>)}
                  </select>
                  <Button type="submit" size="sm" disabled={pending}>{t("manage.save")}</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>{t("manage.cancel")}</Button>
                </form>
              ) : (
                <>
                  <button type="button" aria-label={t("manage.edit")} onClick={() => setEditing({ id: prompt.id, text: prompt.text, intent: prompt.intent as typeof intent })} className="min-w-0 flex-1 text-left text-sm text-ink hover:underline">
                    {prompt.text}
                  </button>
                  <span className="text-xs text-ink-secondary">{t(`intents.${prompt.intent}`)}</span>
                </>
              )}
              <button type="button" aria-label={t("manage.delete")} onClick={() => startTransition(() => deletePrompt(prompt.id))} className="grid size-8 place-items-center rounded-md text-ink-subtle hover:bg-canvas hover:text-ink">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function PromptAccordion({ rows, mode, total }: { rows: Data["byPrompt"]; mode: "brands" | "sources"; total: number }) {
  const t = useTranslations("aiVisibility");
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line">
      {rows.filter((row) => row.prompt.isActive).map((row, index) => (
        <li key={row.prompt.id}>
          <button type="button" aria-expanded={open === row.prompt.id} onClick={() => setOpen(open === row.prompt.id ? null : row.prompt.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm">
            <span className="w-6 text-ink-subtle tabular-nums">{index + 1}</span>
            <span className="flex-1 text-ink">{row.prompt.text}</span>
            <span className="text-ink-secondary">{mode === "brands" ? t("byPrompt.brandsCount", { count: row.brands.length }) : t("byPrompt.sourcesCount", { count: row.sources.length })}</span>
            <ChevronDown className={cn("size-4 text-ink-secondary transition-transform", open === row.prompt.id && "rotate-180")} />
          </button>
          {open === row.prompt.id && (
            <div className="px-4 pb-4">
              {mode === "brands" ? <BrandsTable rows={row.brands} total={Math.max(1, total)} /> : <SourcesTable rows={row.sources} />}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BrandsView({ data }: { data: Data }) {
  const t = useTranslations("aiVisibility");
  const perPrompt = Math.max(1, data.providers.length);
  return (
    <div className="space-y-6">
      <Card title={t("brands")} hint={t("brandsHint")}>
        <BrandsTable rows={data.brands} total={data.answers} />
      </Card>
      <Card title={t("byPrompt.brands")}>
        <PromptAccordion rows={data.byPrompt} mode="brands" total={perPrompt} />
      </Card>
    </div>
  );
}

export function SourcesView({ data }: { data: Data }) {
  const t = useTranslations("aiVisibility");
  return (
    <div className="space-y-6">
      <Card title={t("topSources")} hint={t("topSourcesHint")}>
        <SourcesTable rows={data.sources} />
      </Card>
      <Card title={t("byPrompt.sources")}>
        <PromptAccordion rows={data.byPrompt} mode="sources" total={data.answers} />
      </Card>
    </div>
  );
}
