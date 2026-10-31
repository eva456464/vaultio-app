"use client";

import { AlertTriangle, Check, Link2Off, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ImprovementChange, SafetyFlag } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { decideChanges, publishImprovementNow, rejectImprovement } from "@/server/actions/improvements";

export type ReviewChange = ImprovementChange & { originalHtml?: string; suggestedHtml?: string };

function Decision({ status }: { status: ImprovementChange["status"] }) {
  const t = useTranslations("content.improvements.detail");
  const style = { approved: "bg-success-bg text-success", rejected: "bg-[#FBEAE6] text-[#9A3412]", pending: "bg-[#F3F4F6] text-ink-secondary" }[status];
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", style)}>{t(`${status}State`)}</span>;
}

function Pane({ label, html, text, tone }: { label: string; html?: string; text?: string; tone: "before" | "after" }) {
  return (
    <div className={cn("min-w-0 rounded-xl border p-4", tone === "before" ? "border-line bg-canvas/60" : "border-success-border bg-success-bg/40")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">{label}</p>
      {html !== undefined ? <div className="article-body article-body-compact mt-2 text-sm" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-2 text-sm text-ink">{text}</p>}
    </div>
  );
}

export function ImprovementReview({ id, status, changes: initial, flags, canEdit }: { id: number; status: string; changes: ReviewChange[]; flags: SafetyFlag[]; canEdit: boolean }) {
  const t = useTranslations("content.improvements.detail");
  const router = useRouter();
  const [changes, setChanges] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const open = status === "pending_review" && canEdit;
  const reviewed = changes.filter((c) => c.status !== "pending").length;
  const approved = changes.filter((c) => c.status === "approved").length;
  const flagged = new Set(flags.map((flag) => flag.changeId).filter(Boolean));

  const decide = (changeId: string | null, decision: ImprovementChange["status"]) => {
    setChanges((current) => current.map((change) => (changeId === null || change.id === changeId ? { ...change, status: decision } : change)));
    startTransition(async () => {
      const result = await decideChanges(id, changeId, decision);
      if ("error" in result && result.error) setMessage({ ok: false, text: result.error });
    });
  };

  const label = (change: ReviewChange) => {
    switch (change.kind) {
      case "title":
        return t("changes.title");
      case "meta":
        return t("changes.meta");
      case "rewrite":
        return change.sectionIndex === 0 ? t("changes.intro") : t("changes.rewrite", { heading: change.heading ?? "" });
      case "add":
        return t("changes.add", { heading: change.heading ?? "" });
      case "removeLink":
        return t("changes.removeLink");
    }
  };

  return (
    <div className="space-y-4">
      {flags.length > 0 && (
        <section className="rounded-2xl border border-[#F3D9A4] bg-[#FDF8EC] p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-[#8A6320]">
            <AlertTriangle className="size-4" />
            {t("safety.title")}
          </p>
          <p className="mt-1 text-sm text-[#8A6320]">{t("safety.subtitle")}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {flags.map((flag, index) => (
              <li key={index}>
                <a href={flag.changeId ? `#change-${flag.changeId}` : undefined} className="font-medium text-ink hover:underline">
                  {t.has(`safety.checks.${flag.check}`) ? t(`safety.checks.${flag.check}` as "safety.checks.placeholders") : flag.check}
                </a>
                <span className="ml-2 break-all text-ink-secondary">{flag.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">{t("progress", { reviewed, total: changes.length })}</p>
        {open && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => decide(null, "approved")}>
              <Check />
              {t("approveAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await rejectImprovement(id);
                  setMessage("error" in result && result.error ? { ok: false, text: result.error } : { ok: true, text: t("rejected") });
                  router.refresh();
                })
              }
            >
              <X />
              {t("rejectAll")}
            </Button>
            <Button
              size="sm"
              disabled={pending || approved === 0}
              onClick={() =>
                startTransition(async () => {
                  const result = await publishImprovementNow(id);
                  if ("error" in result && result.error) setMessage({ ok: false, text: result.error });
                  else if ("errors" in result && result.errors?.length) setMessage({ ok: false, text: t("publishErrors", { errors: result.errors.join("; ") }) });
                  else setMessage({ ok: true, text: t("published") });
                  router.refresh();
                })
              }
            >
              {pending ? t("publishing") : t("publish")}
            </Button>
          </div>
        )}
      </div>
      {message && <p className={cn("rounded-xl p-3 text-sm", message.ok ? "bg-success-bg text-success" : "bg-[#FBEAE6] text-[#9A3412]")}>{message.text}</p>}

      <ol className="space-y-4">
        {changes.map((change) => (
          <li key={change.id} id={`change-${change.id}`} className={cn("card scroll-mt-40 p-5", flagged.has(change.id) && "ring-1 ring-[#F3D9A4]")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  {change.kind === "removeLink" && <Link2Off className="size-4 text-ink-secondary" />}
                  {label(change)}
                  {flagged.has(change.id) && <AlertTriangle className="size-4 text-[#B7791F]" aria-label={t("safety.title")} />}
                </p>
                {change.reason && <p className="mt-0.5 text-sm text-ink-secondary">{change.reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Decision status={change.status} />
                {open && (
                  <>
                    <Button variant={change.status === "approved" ? "primary" : "outline"} size="sm" disabled={pending} onClick={() => decide(change.id, change.status === "approved" ? "pending" : "approved")}>
                      <Check />
                      {t("approve")}
                    </Button>
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => decide(change.id, change.status === "rejected" ? "pending" : "rejected")}>
                      <X />
                      {t("reject")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4">
              {change.kind === "removeLink" ? (
                <p className="text-sm text-ink-secondary">
                  <span className="break-all font-medium text-ink">{change.linkUrl}</span>
                  <br />
                  {change.linkReason === "competitor" ? t("changes.linkCompetitor") : t("changes.linkBroken")}
                </p>
              ) : change.kind === "add" ? (
                <Pane label={t("suggested")} html={change.suggestedHtml} tone="after" />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  <Pane label={t("original")} html={change.originalHtml} text={change.original} tone="before" />
                  <Pane label={t("suggested")} html={change.suggestedHtml} text={change.suggested} tone="after" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
