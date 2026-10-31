"use client";

import { ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** URL parameter names for one list (pages can hold two lists, e.g. pages and keywords). */
export type ListParamNames = { q: string; page: string; mine: string };

function useQuery() {
  const searchParams = useSearchParams();
  return (changes: Record<string, string | null>) => {
    const query: Record<string, string> = Object.fromEntries(searchParams.entries());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") delete query[key];
      else query[key] = value;
    }
    return query;
  };
}

/** Search box and "<brand> articles only" toggle above a table. */
export function ListToolbar({ names, q, mine, placeholder, mineLabel }: { names: ListParamNames; q: string; mine: boolean; placeholder: string; mineLabel: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const withChanges = useQuery();
  const [text, setText] = useState(q);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => router.replace({ pathname, query: withChanges({ [names.q]: text.trim(), [names.page]: null }) }, { scroll: false }), 300);
    return () => clearTimeout(timer);
    // Only the typed text should trigger a search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 w-full rounded-control border border-control bg-white pl-10 pr-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40"
        />
      </label>
      <Link
        href={{ pathname, query: withChanges({ [names.mine]: mine ? null : "1", [names.page]: null }) }}
        replace
        scroll={false}
        aria-pressed={mine}
        className={cn(
          "flex h-11 items-center gap-2 rounded-control border px-4 text-sm font-medium",
          mine ? "border-brand/40 bg-brand/5 text-brand" : "border-control bg-white text-ink hover:bg-canvas",
        )}
      >
        <Sparkles className="size-4" />
        {mineLabel}
      </Link>
    </div>
  );
}

/** "Showing 1–10 of 735 items" with Previous / Next. */
export function ListPager({ names, page, pageSize, total }: { names: ListParamNames; page: number; pageSize: number; total: number }) {
  const t = useTranslations("traffic");
  const pathname = usePathname();
  const withChanges = useQuery();
  if (total <= pageSize && page === 1) return null;
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const link = (target: number, enabled: boolean, children: React.ReactNode) =>
    enabled ? (
      <Link href={{ pathname, query: withChanges({ [names.page]: target > 1 ? String(target) : null }) }} replace scroll={false} className="flex h-10 items-center gap-1 rounded-control border border-control bg-white px-3.5 text-sm font-medium text-ink hover:bg-canvas">
        {children}
      </Link>
    ) : (
      <span aria-disabled className="flex h-10 items-center gap-1 rounded-control border border-line px-3.5 text-sm font-medium text-ink-subtle">
        {children}
      </span>
    );
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm text-ink-secondary">
      <span>{t("showing", { from, to, total })}</span>
      {link(page - 1, page > 1, <><ChevronLeft className="size-4" />{t("previous")}</>)}
      {link(page + 1, to < total, <>{t("next")}<ChevronRight className="size-4" /></>)}
    </div>
  );
}
