"use client";

import { ArrowRightLeft, Check, ChevronLeft, ChevronRight, GripVertical, LoaderCircle, MapPin, Package, Pause, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { setTopicProducts } from "@/server/actions/catalog";
import { useRouter } from "@/i18n/navigation";
import { addKeywords, changeTopic, deleteTopic, moveTopic, planTopicOn, setTopicInstructions } from "@/server/actions/content";
import type { AlternativeTopic, CalendarItem, TopicSource } from "@/server/queries/content";
import { ProductPicker } from "./product-picker";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const shiftMonth = (month: string, delta: number) => {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
};

type Calendar = {
  month: string;
  today: string;
  days: string[];
  items: CalendarItem[];
  counts: { published: number; ready: number; queued: number };
};

export function ContentToolbar({ calendar }: { calendar: Calendar }) {
  const t = useTranslations("content");
  const format = useFormatter();
  const monthLabel = format.dateTime(new Date(`${calendar.month}-01T12:00:00Z`), { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-canvas px-5 py-5 md:px-12">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="mr-2 text-[15px] text-ink-secondary">{t("toolbar")}</p>
        <span className="inline-flex items-center gap-1 rounded-md border border-success-border bg-success-bg px-2 py-1 text-[11px] font-semibold uppercase text-success">
          <Check className="size-3" />
          {t("counts.published", { count: calendar.counts.published })}
        </span>
        {calendar.counts.ready > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md border border-[#C9DBFB] bg-[#EEF4FF] px-2 py-1 text-[11px] font-semibold uppercase text-[#2A5BD7]">
            {t("counts.ready", { count: calendar.counts.ready })}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#F5DFA5] bg-[#FEFCE8] px-2 py-1 text-[11px] font-semibold uppercase text-[#8A6320]">
          <span className="size-1.5 rounded-full bg-[#E5A00D]" />
          {t("counts.queued", { count: calendar.counts.queued })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <AddKeywordsDialog />
        <div className="flex h-11 items-center rounded-control border border-control bg-white pl-4">
          <span className="min-w-20 text-sm font-medium text-ink">{monthLabel}</span>
          <Link
            href={{ pathname: "/dashboard/content-plan", query: { month: shiftMonth(calendar.month, -1) } }}
            aria-label={t("previousMonth")}
            className="grid size-10 place-items-center text-ink-secondary hover:text-ink"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={{ pathname: "/dashboard/content-plan", query: { month: shiftMonth(calendar.month, 1) } }}
            aria-label={t("nextMonth")}
            className="grid size-10 place-items-center text-ink-secondary hover:text-ink"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ContentCalendar({ calendar, alternatives, paused = false, canEdit = true }: { calendar: Calendar; alternatives: AlternativeTopic[]; paused?: boolean; canEdit?: boolean }) {
  const t = useTranslations("content");
  const router = useRouter();
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [moving, startMoving] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const drop = (day: string) => {
    const id = dragging;
    setDragging(null);
    setOver(null);
    if (id === null) return;
    if (day <= calendar.today) return setNotice({ ok: false, text: t("calendar.moveToFutureOnly") });
    startMoving(async () => {
      const result = await moveTopic(id, day).catch((error: Error) => ({ error: error.message }));
      setNotice("error" in result && result.error ? { ok: false, text: result.error } : { ok: true, text: t("calendar.rescheduled") });
      router.refresh();
    });
  };
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of calendar.items) map.set(item.day, [...(map.get(item.day) ?? []), item]);
    return map;
  }, [calendar.items]);

  return (
    <div className="overflow-x-auto">
      {(notice || moving) && (
        <p role="status" className={cn("mb-3 text-sm", moving ? "text-ink-secondary" : notice?.ok ? "text-success" : "text-[#9A3412]")}>
          {moving ? t("calendar.rescheduling") : notice?.text}
        </p>
      )}
      <div className="min-w-[980px]">
        <div className="grid grid-cols-7 pb-3">
          {WEEKDAYS.map((day) => (
            <p key={day} className="text-center text-lg font-medium uppercase text-ink">
              {t(`weekdays.${day}`)}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-line bg-white">
          {calendar.days.map((day) => {
            const inMonth = day.startsWith(calendar.month);
            const isToday = day === calendar.today;
            const past = day < calendar.today;
            return (
              <div
                key={day}
                onDragOver={(event) => {
                  if (dragging === null || day <= calendar.today) return;
                  event.preventDefault();
                  setOver(day);
                }}
                onDragLeave={() => setOver((current) => (current === day ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  drop(day);
                }}
                className={cn(
                  "group/day relative min-h-[300px] border-b border-r border-line p-5",
                  isToday && "outline outline-2 -outline-offset-2 outline-[#2A76F6]",
                  over === day && "bg-[#EEF4FF]",
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-[15px]",
                      isToday ? "bg-[#2A76F6] font-semibold text-white" : inMonth ? "text-ink" : "text-ink-subtle",
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                  {isToday && <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2A76F6]">{t("today")}</span>}
                </div>
                <div className={cn("space-y-3", past && !isToday && "opacity-55")}>
                  {(byDay.get(day) ?? []).map((item) => (
                    <CalendarCard
                      key={item.id}
                      item={item}
                      alternatives={alternatives}
                      paused={paused}
                      canEdit={canEdit}
                      onDragStart={() => setDragging(item.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                    />
                  ))}
                  {canEdit && !past && !isToday && !(byDay.get(day) ?? []).length && (
                    <button
                      type="button"
                      onClick={() => setChoosing(day)}
                      className="hidden w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-6 text-xs font-medium text-ink-secondary hover:border-ink/30 hover:text-ink group-hover/day:flex focus-visible:flex"
                    >
                      <Plus className="size-3.5" /> {t("calendar.chooseTopic")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {choosing && <ChangeTopicDialog day={choosing} alternatives={alternatives} onClose={() => setChoosing(null)} />}
    </div>
  );
}

const SOURCE_BADGE: Record<TopicSource, { letter: string; color: string } | null> = {
  google: { letter: "G", color: "#4285F4" },
  chatgpt: { letter: "C", color: "#10A37F" },
  claude: { letter: "A", color: "#D97757" },
  gemini: { letter: "G", color: "#8E75F0" },
  perplexity: { letter: "P", color: "#20808D" },
  user: null,
};

function SourceBadge({ source }: { source: TopicSource }) {
  const t = useTranslations("content.sources");
  const badge = SOURCE_BADGE[source];
  if (!badge) return null;
  return (
    <span title={t(source as "google")} aria-label={t(source as "google")} className="grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: badge.color }}>
      {badge.letter}
    </span>
  );
}

function StatusPill({ status }: { status: CalendarItem["status"] | "paused" }) {
  const t = useTranslations("content.status");
  const style = {
    published: "border-success-border bg-success-bg text-success",
    draft: "border-success-border bg-white text-success",
    ready: "border-[#C9DBFB] bg-[#EEF4FF] text-[#2A5BD7]",
    generating: "border-[#E4D7FB] bg-[#F5F0FF] text-[#6B3FD4]",
    queued: "border-[#F5DFA5] bg-[#FEFCE8] text-[#8A6320]",
    paused: "border-line bg-canvas text-ink-secondary",
  }[status];
  return (
    <span title={status === "generating" || status === "draft" ? t(`tooltips.${status}`) : undefined} className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase", style)}>
      {status === "published" || status === "draft" ? <Check className="size-3" /> : status === "generating" ? <LoaderCircle className="size-3 animate-spin" /> : status === "paused" ? <Pause className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
      {t(status)}
    </span>
  );
}

function CalendarCard({
  item,
  alternatives,
  paused,
  canEdit,
  onDragStart,
  onDragEnd,
}: {
  item: CalendarItem;
  alternatives: AlternativeTopic[];
  paused: boolean;
  canEdit: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const t = useTranslations("content");
  const [dialog, setDialog] = useState<"change" | "instructions" | "delete" | null>(null);
  const typeLabel = item.articleType ? t(`articleTypes.${item.articleType}` as "articleTypes.guide_explainer") : null;
  const status = item.status === "queued" && paused ? "paused" : item.status;
  const movable = canEdit && item.status === "queued";

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={status} />
        <SourceBadge source={item.source} />
      </div>
      <p className="mt-3 line-clamp-3 text-[15px] font-medium leading-snug text-ink">{item.title}</p>
      {item.status === "queued" && (
        <div className="mt-2 space-y-0.5 text-xs text-ink-secondary">
          {item.difficulty !== null && <p>{t("difficulty", { value: item.difficulty })}</p>}
          {item.searchVolume !== null && <p>{t("volume", { value: item.searchVolume })}</p>}
          {item.isLocal && (
            <p className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {t("local")}
            </p>
          )}
        </div>
      )}
      {item.products.length > 0 && (
        <p className="mt-3 inline-flex max-w-full items-center gap-1 rounded-full bg-brand/5 px-2 py-0.5 text-xs text-brand" title={item.products.map((product) => product.name).join(", ")}>
          <Package className="size-3 shrink-0" />
          <span className="truncate">{item.products.length === 1 ? item.products[0]!.name : t("productsChip", { count: item.products.length })}</span>
        </p>
      )}
      {typeLabel && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-secondary underline decoration-ink-subtle underline-offset-2">{typeLabel}</p>
      )}
    </>
  );

  if (item.articleId) {
    return (
      <Link
        href={`/dashboard/articles/${item.articleId}`}
        title={item.status === "ready" ? t("readyHint") : undefined}
        className="block rounded-lg border border-line bg-white p-3 transition-shadow hover:shadow-[0_6px_18px_-10px_rgba(16,24,40,0.25)]"
      >
        {body}
      </Link>
    );
  }

  if (item.status === "generating" || !canEdit) {
    return (
      <div title={item.status === "generating" ? t("calendar.editLocked") : undefined} className="rounded-lg border border-line bg-white p-3">
        {body}
      </div>
    );
  }

  return (
    <div
      draggable={movable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      title={movable ? t("calendar.dragToReschedule") : undefined}
      className={cn("group relative rounded-lg border border-line bg-white p-3", movable && "cursor-grab active:cursor-grabbing")}
    >
      {movable && <GripVertical aria-hidden className="absolute left-0.5 top-1/2 hidden size-3.5 -translate-y-1/2 text-ink-subtle group-hover:block" />}
      {body}
      <div className="absolute right-2 top-2 hidden items-center gap-0.5 rounded-lg border border-line bg-white p-0.5 shadow-sm group-hover:flex group-focus-within:flex">
        <IconButton label={t("actions.changeTopic")} onClick={() => setDialog("change")}>
          <ArrowRightLeft />
        </IconButton>
        <IconButton label={t("actions.addInstructions")} onClick={() => setDialog("instructions")}>
          <Pencil />
        </IconButton>
        <IconButton label={t("actions.delete")} onClick={() => setDialog("delete")}>
          <Trash2 />
        </IconButton>
      </div>
      {dialog === "change" && <ChangeTopicDialog item={item} alternatives={alternatives} onClose={() => setDialog(null)} />}
      {dialog === "instructions" && <InstructionsDialog item={item} onClose={() => setDialog(null)} />}
      {dialog === "delete" && <DeleteDialog item={item} onClose={() => setDialog(null)} />}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-7 place-items-center rounded-md text-ink-secondary hover:bg-canvas hover:text-ink [&_svg]:size-3.5">
      {children}
    </button>
  );
}

/** "Change topic" for a planned day, or "Choose topic" for an empty one: an unused topic or the user's own. */
function ChangeTopicDialog({ item, day, alternatives, onClose }: { item?: CalendarItem; day?: string; alternatives: AlternativeTopic[]; onClose: () => void }) {
  const t = useTranslations("content");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const filtered = alternatives.filter((topic) => topic.keyword.includes(query.trim().toLowerCase()));
  const own = query.trim().length >= 3 && !alternatives.some((topic) => topic.keyword === query.trim().toLowerCase());
  const submit = (choice: number | { topic: string }) =>
    startTransition(async () => {
      const result = await (item ? changeTopic(item.id, choice).then(() => ({ ok: true })) : planTopicOn(day!, choice)).catch((failure: Error) => ({ error: failure.message }));
      if ("error" in result && result.error) return setError(result.error);
      router.refresh();
      onClose();
    });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{item ? t("changeTopic.title") : t("changeTopic.titleCreate")}</DialogTitle>
        <DialogDescription>{item ? t("changeTopic.subtitle") : t("changeTopic.subtitleCreate")}</DialogDescription>
        <label className="mt-5 flex h-11 items-center gap-2 rounded-control border border-control px-3">
          <Search className="size-4 text-ink-subtle" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("changeTopic.search")} className="flex-1 bg-transparent text-sm outline-none" />
        </label>
        <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-line">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-secondary">{t("changeTopic.empty")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-canvas text-xs text-ink-secondary">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("changeTopic.columns.keyword")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("changeTopic.columns.volume")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("changeTopic.columns.difficulty")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((topic) => (
                  <tr
                    key={topic.clusterId}
                    onClick={() => setSelected(topic.clusterId)}
                    className={cn("cursor-pointer", selected === topic.clusterId ? "bg-[#FFF1EE]" : "hover:bg-canvas")}
                  >
                    <td className="px-4 py-2.5 text-ink">{topic.keyword}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-secondary">{topic.searchVolume ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-secondary">{topic.difficulty ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-[#9A3412]">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">{tCommon("cancel")}</Button>
          </DialogClose>
          {own && selected === null && (
            <Button variant="outline" size="lg" disabled={pending} onClick={() => submit({ topic: query })}>
              {t("changeTopic.useOwn", { topic: query.trim() })}
            </Button>
          )}
          <Button size="lg" disabled={selected === null || pending} onClick={() => submit(selected!)}>
            {t("changeTopic.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstructionsDialog({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  const t = useTranslations("content.instructions");
  const tCommon = useTranslations("common");
  const [instruction, setInstruction] = useState(item.instruction ?? "");
  const [supportUrl, setSupportUrl] = useState(item.supportUrl ?? "");
  const [products, setProducts] = useState({ selected: item.products, custom: item.productsCustomized });
  const [productsTouched, setProductsTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("subtitle")}</DialogDescription>
        <label className="mt-5 block text-sm font-medium text-ink">
          {t("instruction")}
          <textarea
            value={instruction}
            maxLength={1000}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={t("instructionPlaceholder")}
            className="mt-1.5 h-32 w-full resize-none rounded-control border border-control p-3 text-sm outline-none focus:border-ink/40"
          />
          <span className="block text-right text-xs font-normal text-ink-subtle">{t("counter", { count: instruction.length })}</span>
        </label>
        <label className="mt-3 block text-sm font-medium text-ink">
          {t("supportUrl")}
          <input
            value={supportUrl}
            onChange={(e) => setSupportUrl(e.target.value)}
            placeholder="https://"
            className="mt-1.5 h-11 w-full rounded-control border border-control px-3 text-sm outline-none focus:border-ink/40"
          />
        </label>
        <ProductPicker
          selected={products.selected}
          custom={products.custom}
          proposedIds={item.proposedProductIds}
          onChange={(value) => {
            setProducts(value);
            setProductsTouched(true);
          }}
        />
        {error && <p className="mt-3 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]" role="alert">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">{tCommon("cancel")}</Button>
          </DialogClose>
          <Button size="lg" disabled={pending} onClick={() => startTransition(async () => {
            await setTopicInstructions(item.id, { instruction, supportUrl: supportUrl.trim() });
            if (productsTouched) {
              const result = await setTopicProducts(item.id, products.custom ? products.selected.map((product) => product.id) : null);
              if ("error" in result && result.error) return setError(result.error);
            }
            onClose();
          })}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  const t = useTranslations("content.deleteDialog");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("body", { title: item.title })}</DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">{tCommon("cancel")}</Button>
          </DialogClose>
          <Button variant="brand" size="lg" disabled={pending} onClick={() => startTransition(async () => {
            await deleteTopic(item.id);
            onClose();
          })}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddKeywordsDialog() {
  const t = useTranslations("content");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setText(""); setResult(null); } }}>
      <Button variant="outline" className="h-11 rounded-control" onClick={() => setOpen(true)}>
        <Plus />
        {t("addKeywords")}
      </Button>
      <DialogContent>
        <DialogTitle>{t("addKeywordsDialog.title")}</DialogTitle>
        <DialogDescription>{t("addKeywordsDialog.subtitle")}</DialogDescription>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("addKeywordsDialog.placeholder")}
          className="mt-5 h-40 w-full resize-none rounded-control border border-control p-3 text-sm outline-none focus:border-ink/40"
        />
        {result !== null && <p className="mt-2 text-sm text-success">{t("addKeywordsDialog.added", { count: result })}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg">{tCommon("close")}</Button>
          </DialogClose>
          <Button size="lg" disabled={pending || !text.trim()} onClick={() => startTransition(async () => {
            const { added } = await addKeywords(text);
            setResult(added);
            setText("");
          })}>
            {t("addKeywordsDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
