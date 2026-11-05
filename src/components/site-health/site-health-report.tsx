"use client";

import { Check, ChevronDown, Copy, Gauge as GaugeIcon, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { categoryOf, scoreLabel, SEVERITY_ORDER } from "@/lib/site-health";
import { validateIssueFix } from "@/server/actions/site-health";
import type { AuditIssue, SiteHealthReport } from "@/server/queries/site-health";

/** "Validate fix" is offered in the dashboard, not on the public share page. */
const CanValidate = createContext(false);

const SEVERITY_STYLE = {
  high: "bg-[#FBEAE6] text-[#9A3412]",
  medium: "bg-[#FDF3E2] text-[#8A6320]",
  low: "bg-[#F3F4F6] text-ink-secondary",
} as const;

function Gauge({ score }: { score: number }) {
  const t = useTranslations("siteHealth");
  const status = scoreLabel(score);
  const color = status === "good" ? "#22A06B" : status === "fair" ? "#E5A00D" : "#E5484D";
  const circumference = 2 * Math.PI * 52;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r="52" fill="none" stroke="#EEF0F2" strokeWidth="10" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score / 100) * circumference} ${circumference}`} />
      </svg>
      <div>
        <p className="font-heading text-[44px] font-semibold leading-none tracking-tight text-ink tabular-nums">{score}</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
          <span className="size-2 rounded-full" style={{ background: color }} />
          {t(`status.${status}`)}
        </p>
        <p className="text-xs text-ink-secondary">{t("overall")}</p>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number | null }) {
  const status = scoreLabel(value ?? 0);
  const color = status === "good" ? "#22A06B" : status === "fair" ? "#E5A00D" : "#E5484D";
  return (
    <div className="rounded-2xl bg-canvas p-4">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink tabular-nums">
        {value ?? "—"}
        <span className="text-sm font-normal text-ink-subtle">/100</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: color }} />
      </div>
    </div>
  );
}

export function SiteHealthReportView({ report, nextCheck, siteUrl, canValidate = false }: { report: SiteHealthReport; nextCheck?: string; siteUrl: string; canValidate?: boolean }) {
  const t = useTranslations("siteHealth");
  const format = useFormatter();
  const [mode, setMode] = useState<"issue" | "page">("issue");
  const { audit, pages } = report;
  // Issues confirmed fixed with "Validate fix" leave the list (and the scores).
  const issues = report.issues.filter((issue) => !issue.fixed);
  const fixedCount = report.issues.length - issues.length;

  const byType = useMemo(() => {
    const groups = new Map<string, AuditIssue[]>();
    for (const issue of issues) groups.set(issue.issueType, [...(groups.get(issue.issueType) ?? []), issue]);
    return [...groups.entries()].sort((a, b) => SEVERITY_ORDER[a[1][0]!.severity] - SEVERITY_ORDER[b[1][0]!.severity] || b[1].length - a[1].length);
  }, [issues]);
  const affectedPages = new Set(issues.map((issue) => issue.pageUrl ?? "site")).size;

  return (
    <CanValidate.Provider value={canValidate}>
    <div className="space-y-8">
      <section className="card grid gap-6 p-5 md:p-7 lg:grid-cols-[auto_1fr]">
        <Gauge score={audit.overallScore} />
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label={t("pageSpeed")} value={audit.averagePageSpeed} />
            <MetricTile label={t("llmOptimization")} value={audit.llmOptimizationScore} />
            <MetricTile label={t("technicalSeo")} value={audit.technicalSeoScore} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium text-ink" title={t("crawlerFilesHint")}>{t("crawlerFiles")}</span>
            {(
              [
                ["sitemap.xml", audit.sitemap],
                ["robots.txt", audit.robotsTxt],
                ["llms.txt", audit.llmsTxt],
              ] as const
            ).map(([file, status]) => (
              <span
                key={file}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                  status === "ok" ? "border-success-border bg-success-bg text-success" : "border-[#F6CFC7] bg-[#FBEAE6] text-[#9A3412]",
                )}
              >
                {file}
                {status === "ok" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </span>
            ))}
            <span className="ml-auto text-xs text-ink-secondary">
              {t("lastChecked", { date: format.dateTime(new Date(audit.completedAt), { dateStyle: "medium" }) })}
            </span>
          </div>
        </div>
      </section>

      <section className="card p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.44px] text-ink">{t("issuesTitle")}</h2>
            <p className="mt-1 text-[15px] text-ink-secondary">
              {issues.length ? t("issuesSummary", { types: byType.length, pages: affectedPages }) : t("noIssues")}
              {fixedCount > 0 && <span className="ml-2 text-success">· {t("fixedCount", { count: fixedCount })}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {issues.length > 0 && <FixAllDialog issues={issues} siteUrl={siteUrl} />}
            {nextCheck && (
              <span className="flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-white">
                {t("nextCheck", { date: format.dateTime(new Date(`${nextCheck}T12:00:00Z`), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) })}
              </span>
            )}
          </div>
        </div>

        {issues.length > 0 && (
          <>
            <div className="mt-5 inline-flex rounded-full border border-control bg-canvas p-1">
              {(["issue", "page"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
                  className={cn("rounded-full px-4 py-1.5 text-sm font-medium", mode === option ? "bg-white text-ink shadow-sm" : "text-ink-secondary")}
                >
                  {option === "issue" ? t("byIssue") : t("byPage")}
                </button>
              ))}
            </div>

            {mode === "issue" ? (
              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
                {byType.map(([type, group]) => (
                  <IssueGroup key={type} type={type} group={group} />
                ))}
              </ul>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
                {[{ url: "site", geoScore: null as number | null }, ...pages].map((page) => {
                  const pageIssues = issues.filter((issue) => (issue.pageUrl ?? "site") === page.url);
                  if (page.url === "site" && pageIssues.length === 0) return null;
                  return <PageRow key={page.url} url={page.url} score={page.geoScore} issues={pageIssues} speed={"speed" in page ? page.speed : null} />;
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
    </CanValidate.Provider>
  );
}

function ValidateButton({ issueId }: { issueId: number }) {
  const t = useTranslations("siteHealth.validate");
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  if (!useContext(CanValidate)) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          startBusy(async () => {
            setMessage(null);
            const result = await validateIssueFix(issueId);
            if ("error" in result) return setMessage(t("failed"));
            if (result.fixed) router.refresh();
            else setMessage(t("stillThere", { description: result.description ?? "" }));
          })
        }
        className="inline-flex items-center gap-1 rounded-full border border-control bg-white px-2.5 py-0.5 text-xs font-medium text-ink hover:bg-canvas disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        {busy ? t("checking") : t("button")}
      </button>
      {message && <span className="text-xs text-[#9A3412]">{message}</span>}
    </span>
  );
}

function SpeedChip({ speed }: { speed: NonNullable<SiteHealthReport["pages"][number]["speed"]> }) {
  const t = useTranslations("siteHealth.speed");
  const tone = speed.performance >= 90 ? "bg-success-bg text-success" : speed.performance >= 50 ? "bg-[#FDF3E2] text-[#8A6320]" : "bg-[#FBEAE6] text-[#9A3412]";
  const details = [speed.lcpMs !== null ? t("lcp", { value: (speed.lcpMs / 1000).toFixed(1) }) : null, speed.cls !== null ? t("cls", { value: speed.cls }) : null, speed.tbtMs !== null ? t("tbt", { value: speed.tbtMs }) : null].filter(Boolean).join(" · ");
  return (
    <span title={`${t("title")}: ${details}`} className={cn("hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex", tone)}>
      <GaugeIcon className="size-3" />
      {t("score", { score: speed.performance })}
    </span>
  );
}

function SeverityPill({ severity }: { severity: AuditIssue["severity"] }) {
  const t = useTranslations("siteHealth.severity");
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", SEVERITY_STYLE[severity])}>{t(severity)}</span>;
}

function IssueGroup({ type, group }: { type: string; group: AuditIssue[] }) {
  const t = useTranslations("siteHealth");
  const [open, setOpen] = useState(false);
  const pages = group.map((issue) => issue.pageUrl);
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <SeverityPill severity={group[0]!.severity} />
        <span className="flex-1">
          <span className="block text-[15px] font-medium text-ink">{t(`issueNames.${type}` as "issueNames.missing_title")}</span>
          <span className="block text-xs text-ink-secondary">{t(`category.${categoryOf(type)}`)}</span>
        </span>
        <span className="text-sm text-ink-secondary">{pages[0] === null ? t("wholeSite") : t("pagesCount", { count: pages.length })}</span>
        <ChevronDown className={cn("size-4 text-ink-secondary transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          {group[0]!.action && (
            <p className="rounded-xl bg-canvas p-3 text-sm text-ink">
              <span className="font-semibold">{t("howToFix")}: </span>
              {group[0]!.action}
            </p>
          )}
          <ul className="space-y-1.5 text-sm">
            {group.map((issue) => (
              <li key={issue.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-secondary">
                {issue.pageUrl && <span className="font-medium text-ink">{issue.pageUrl}</span>}
                <span>{issue.description}</span>
                <ValidateButton issueId={issue.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function PageRow({ url, score, issues, speed }: { url: string; score: number | null; issues: AuditIssue[]; speed: SiteHealthReport["pages"][number]["speed"] | null }) {
  const t = useTranslations("siteHealth");
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        {score !== null ? (
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums", score >= 80 ? "bg-success-bg text-success" : score >= 50 ? "bg-[#FDF3E2] text-[#8A6320]" : "bg-[#FBEAE6] text-[#9A3412]")}>
            {score}
          </span>
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas text-xs text-ink-secondary">—</span>
        )}
        <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{url === "site" ? t("wholeSite") : url}</span>
        {speed && <SpeedChip speed={speed} />}
        <span className="text-sm text-ink-secondary">{t("issuesOnPage", { count: issues.length })}</span>
        <ChevronDown className={cn("size-4 text-ink-secondary transition-transform", open && "rotate-180")} />
      </button>
      {open && issues.length > 0 && (
        <ul className="space-y-2 px-4 pb-4">
          {issues.map((issue) => (
            <li key={issue.id} className="flex items-start gap-2 text-sm">
              <SeverityPill severity={issue.severity} />
              <span>
                <span className="font-medium text-ink">{t(`issueNames.${issue.issueType}` as "issueNames.missing_title")}</span>
                <span className="block text-ink-secondary">{issue.description} {issue.action}</span>
                <span className="mt-1 block"><ValidateButton issueId={issue.id} /></span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function FixAllDialog({ issues, siteUrl }: { issues: AuditIssue[]; siteUrl: string }) {
  const t = useTranslations("siteHealth");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => {
    const groups = new Map<string, AuditIssue[]>();
    for (const issue of issues) groups.set(issue.pageUrl ?? "Whole site", [...(groups.get(issue.pageUrl ?? "Whole site") ?? []), issue]);
    const lines = [`Technical SEO / AI search fixes for ${siteUrl}`, ""];
    let n = 1;
    for (const [page, list] of groups) {
      lines.push(`${n++}. ${page}`);
      for (const issue of list.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])) {
        lines.push(`   - ${issue.issueType.replaceAll("_", " ")} (${issue.severity.toUpperCase()} severity)`, `     Problem: ${issue.description}`, `     How to fix: ${issue.action ?? ""}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }, [issues, siteUrl]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Sparkles />
        {t("fixAll")}
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{t("fixAll")}</DialogTitle>
        <DialogDescription>{t("fixAllBody", { count: issues.length })}</DialogDescription>
        <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-xl bg-canvas p-4 font-mono text-xs leading-relaxed text-ink">{text}</pre>
        <Button
          className="mt-4 w-full"
          size="lg"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? t("copied") : t("copy")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
