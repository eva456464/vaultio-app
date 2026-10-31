"use client";

import { Check, ExternalLink, FileUp, ImagePlus, LoaderCircle, Package, Pencil, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { CURRENCIES, formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { connectShopifyCatalog, connectWooCommerce, deleteManualProduct, disconnectCatalogSource, importFeed, saveManualProduct, setProductIncluded } from "@/server/actions/catalog";
import type { CatalogType } from "@/server/catalog/catalog";
import type { CatalogProduct } from "@/server/queries/catalog";
import type { CatalogView } from "./product-catalog";
import { SourceCards } from "./sources";

type Product = CatalogProduct & { priceLabel?: string | null };
type FeedFormat = "google_shopping" | "facebook";
export type DialogState =
  | { kind: "sources" }
  | { kind: "shopify" | "woocommerce"; update?: boolean; values?: { store?: string } }
  | { kind: "manual" }
  | { kind: "product"; product?: Product }
  | { kind: "import" }
  | { kind: "feed"; format: FeedFormat; url?: string }
  | { kind: "view"; product: Product }
  | { kind: "delete"; product: Product }
  | { kind: "disconnect"; type: CatalogType };

const field = "mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="mt-3 rounded-xl bg-[#FBEAE6] p-3 text-sm text-[#9A3412]" role="alert">{error}</p> : null;
}

/** Runs a server action; keeps its error, or calls `done` with the result. */
function useRun() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = <T,>(action: () => Promise<T>, done: (result: T) => void) =>
    startTransition(async () => {
      try {
        const result = await action();
        if (result && typeof result === "object" && "error" in result && (result as { error?: string }).error) setError((result as { error: string }).error);
        else {
          setError(null);
          done(result);
        }
      } catch (caught) {
        setError((caught as Error).message);
      }
    });
  return { error, setError, pending, run };
}

function Steps({ steps }: { steps: [string, string][] }) {
  return (
    <ol className="mt-5 space-y-4">
      {steps.map(([title, body], index) => (
        <li key={title} className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-brand">{index + 1}</span>
          <span>
            <span className="block text-sm font-semibold text-ink">{title}</span>
            <span className="block text-sm text-ink-secondary">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function StoreWizard({ platform, update, initialStore, onClose, onDone }: { platform: "shopify" | "woocommerce"; update?: boolean; initialStore?: string; onClose: () => void; onDone: (message: string) => void }) {
  const t = useTranslations(`settings.catalog.${platform}`);
  const tCatalog = useTranslations("settings.catalog");
  const [step, setStep] = useState(update ? 2 : 1);
  const [store, setStore] = useState(initialStore?.replace(/\.myshopify\.com$/, "") ?? "");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const { error, pending, run } = useRun();
  const shopify = platform === "shopify";
  return (
    <DialogContent className="max-w-xl">
      <DialogTitle>{update ? t("updateTitle") : t("title")}</DialogTitle>
      <DialogDescription>{t("intro")}</DialogDescription>
      {step === 1 ? (
        <>
          <Steps steps={t.raw("steps") as [string, string][]} />
          {shopify && (
            <a href="https://dev.shopify.com/dashboard" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">
              {t("openDashboard")}
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{tCatalog("cancel")}</Button>
            <Button onClick={() => setStep(2)}>{t("next")}</Button>
          </div>
        </>
      ) : (
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => (shopify ? connectShopifyCatalog({ store, clientId: key, clientSecret: secret }) : connectWooCommerce({ siteUrl: store, consumerKey: key, consumerSecret: secret })),
              () => onDone(t("connected")),
            );
          }}
        >
          <Field label={shopify ? t("store") : t("storeUrl")} hint={shopify ? t("storeHint") : t("storeUrlHint")}>
            <input value={store} onChange={(event) => setStore(event.target.value)} required placeholder={shopify ? "my-store" : t("storeUrlPlaceholder")} className={field} autoComplete="off" />
          </Field>
          <Field label={shopify ? t("clientId") : t("consumerKey")}>
            <input value={key} onChange={(event) => setKey(event.target.value)} required={!update} placeholder={shopify ? "" : "ck_…"} className={field} autoComplete="off" />
          </Field>
          <Field label={shopify ? t("clientSecret") : t("consumerSecret")} hint={update ? t("keepHint") : undefined}>
            <input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} required={!update} placeholder={shopify ? "" : "cs_…"} className={field} autoComplete="off" />
          </Field>
          {pending && (
            <p className="flex items-center gap-2 text-sm text-ink-secondary">
              <LoaderCircle className="size-4 animate-spin" />
              {t("connecting")}
            </p>
          )}
          <ErrorText error={error} />
          <div className="flex justify-end gap-2 pt-2">
            {!update && <Button type="button" variant="outline" onClick={() => setStep(1)}>{tCatalog("back")}</Button>}
            <Button type="submit" disabled={pending}>{t("connect")}</Button>
          </div>
        </form>
      )}
    </DialogContent>
  );
}

function ManualChooser({ onPick, onClose }: { onPick: (state: DialogState) => void; onClose: () => void }) {
  const t = useTranslations("settings.catalog");
  const methods: { key: "oneByOne" | "import" | FeedFormat; state: DialogState; icon: ReactNode }[] = [
    { key: "oneByOne", state: { kind: "product" }, icon: <Pencil className="size-5 text-[#7C3AED]" /> },
    { key: "import", state: { kind: "import" }, icon: <FileUp className="size-5 text-[#15803D]" /> },
    { key: "google_shopping", state: { kind: "feed", format: "google_shopping" }, icon: <span className="text-base font-bold text-[#4285F4]">G</span> },
    { key: "facebook", state: { kind: "feed", format: "facebook" }, icon: <span className="text-base font-bold text-[#1877F2]">f</span> },
  ];
  return (
    <DialogContent className="max-w-2xl">
      <DialogTitle>{t("manual.title")}</DialogTitle>
      <DialogDescription>{t("manual.subtitle")}</DialogDescription>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {methods.map((method) => (
          <button key={method.key} type="button" onClick={() => onPick(method.state)} className="flex gap-3 rounded-2xl border border-line p-4 text-left hover:border-ink/30 hover:bg-canvas">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas">{method.icon}</span>
            <span>
              <span className="block text-sm font-semibold text-ink">{t(`manual.methods.${method.key}.title`)}</span>
              <span className="block text-sm text-ink-secondary">{t(`manual.methods.${method.key}.description`)}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
      </div>
    </DialogContent>
  );
}

function ProductForm({ product, defaultCurrency, onClose, onDone }: { product?: Product; defaultCurrency: string; onClose: () => void; onDone: (message: string) => void }) {
  const t = useTranslations("settings.catalog.form");
  const tCatalog = useTranslations("settings.catalog");
  const locale = useLocale();
  const [values, setValues] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    url: product?.url ?? "",
    price: product?.price ?? "",
    currency: product?.currency ?? defaultCurrency,
    imageUrl: product?.imageUrl ?? "",
    includeInArticles: product ? product.includeInArticles : true,
  });
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { error, setError, pending, run } = useRun();
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((current) => ({ ...current, [key]: value }));
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/catalog/image", { method: "POST", body }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as { url?: string; error?: string } | null;
    setUploading(false);
    if (result?.url) set("imageUrl", result.url);
    else setError(result?.error ?? "Failed to upload image");
  };
  const price = values.price && !Number.isNaN(Number(values.price)) ? formatPrice(values.price, values.currency, locale) : null;
  return (
    <DialogContent className="max-w-3xl">
      <DialogTitle>{product ? t("editTitle") : t("addTitle")}</DialogTitle>
      <DialogDescription>{product?.externalId ? t("importedId", { id: product.externalId }) : t("subtitle")}</DialogDescription>
      <form
        className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_220px]"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => saveManualProduct({ ...(product ? { id: product.id } : {}), ...values }), () => onDone(product ? t("saved") : t("added")));
        }}
      >
        <div className="space-y-4">
          <Field label={t("name")}>
            <input value={values.name} onChange={(event) => set("name", event.target.value)} required maxLength={300} placeholder={t("namePlaceholder")} className={field} />
          </Field>
          <Field label={t("description")}>
            <textarea value={values.description} onChange={(event) => set("description", event.target.value)} maxLength={2000} rows={3} placeholder={t("descriptionPlaceholder")} className={cn(field, "h-auto py-2.5")} />
          </Field>
          <Field label={t("url")}>
            <input type="url" value={values.url} onChange={(event) => set("url", event.target.value)} placeholder={t("urlPlaceholder")} className={field} />
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
            <Field label={t("price")}>
              <input inputMode="decimal" value={values.price} onChange={(event) => set("price", event.target.value)} placeholder={t("pricePlaceholder")} className={field} />
            </Field>
            <Field label={t("currency")}>
              <select value={values.currency} onChange={(event) => set("currency", event.target.value)} className={field}>
                {[...new Set([values.currency, ...CURRENCIES])].filter(Boolean).map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </Field>
          </div>
          <div>
            <span className="text-sm font-medium text-ink">{t("image")}</span>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void upload(event.dataTransfer.files[0]);
              }}
              className={cn("mt-1.5 flex items-center gap-3 rounded-xl border border-dashed p-3", dragging ? "border-ink bg-canvas" : "border-control")}
            >
              <button type="button" onClick={() => input.current?.click()} className="flex flex-1 items-center gap-2 text-left text-sm text-ink-secondary hover:text-ink">
                {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? t("uploading") : values.imageUrl ? t("replaceImage") : t("uploadImage")}
                <span className="text-xs text-ink-subtle">· {t("imageHint")}</span>
              </button>
              {values.imageUrl && (
                <button type="button" onClick={() => set("imageUrl", "")} className="text-xs text-ink-secondary hover:text-[#9A3412]">
                  {t("removeImage")}
                </button>
              )}
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
            </div>
          </div>
          <label className="flex items-start justify-between gap-4 rounded-xl border border-line p-3">
            <span>
              <span className="block text-sm font-medium text-ink">{t("include")}</span>
              <span className="block text-xs text-ink-secondary">{t("includeHint")}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={values.includeInArticles}
              onChange={(event) => set("includeInArticles", event.target.checked)}
              className="mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-[#22A06B] checked:before:translate-x-[22px]"
            />
          </label>
          <ErrorText error={error} />
        </div>
        <aside>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{t("preview")}</p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-line">
            {values.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview of the uploaded product photo
              <img src={values.imageUrl} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <span className="grid aspect-square w-full place-items-center bg-canvas text-ink-subtle"><Package className="size-10" strokeWidth={1.25} /></span>
            )}
            <div className="p-3">
              <p className="text-sm font-semibold text-ink">{values.name || t("namePlaceholder")}</p>
              {price && <p className="text-sm font-medium text-brand">{price}</p>}
              {values.description && <p className="mt-1 line-clamp-3 text-xs text-ink-secondary">{values.description}</p>}
            </div>
          </div>
        </aside>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>{tCatalog("cancel")}</Button>
          <Button type="submit" disabled={pending || uploading}>{product ? t("save") : t("add")}</Button>
        </div>
      </form>
    </DialogContent>
  );
}

const EXAMPLES = {
  xml: `<products>\n  <product>\n    <id>SKU-001</id>\n    <title>Organic Cotton T-Shirt</title>\n    <link>https://example.com/products/tee</link>\n    <image_link>https://example.com/images/tee.jpg</image_link>\n    <price>29.99</price>\n    <currency_code>USD</currency_code>\n  </product>\n</products>`,
  csv: `id,title,description,link,image_link,price,currency_code,brand,product_type\nSKU-001,Organic Cotton T-Shirt,Soft everyday tee,https://example.com/products/tee,https://example.com/images/tee.jpg,29.99,USD,Example Co,Apparel > Shirts`,
  excel: "id | title | description | link | image_link | price | currency_code | brand | product_type",
};

function ImportFile({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const t = useTranslations("settings.catalog.import");
  const tCatalog = useTranslations("settings.catalog");
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<keyof typeof EXAMPLES>("csv");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const submit = async () => {
    if (!file) return;
    setPending(true);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/catalog/import", { method: "POST", body }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as { error?: string; count?: number; added?: number; updated?: number; skipped?: number } | null;
    setPending(false);
    if (!result || result.error) return setError(result?.error ?? "The file couldn't be imported");
    router.refresh();
    onDone([t("done", { count: result.count ?? 0, added: result.added ?? 0, updated: result.updated ?? 0 }), result.skipped ? t("skipped", { count: result.skipped }) : ""].filter(Boolean).join(" "));
  };
  return (
    <DialogContent className="max-w-2xl">
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogDescription>{t("subtitle")}</DialogDescription>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          setFile(event.dataTransfer.files[0] ?? null);
        }}
        className={cn("mt-5 rounded-2xl border border-dashed p-6 text-center", dragging ? "border-ink bg-canvas" : "border-control")}
      >
        <button type="button" onClick={() => input.current?.click()} className="mx-auto flex flex-col items-center gap-2 text-sm text-ink-secondary hover:text-ink">
          <FileUp className="size-6" />
          {file ? <span className="font-medium text-ink">{t("chosen", { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` })}</span> : t("choose")}
          <span className="text-xs text-ink-subtle">{t("hint")}</span>
        </button>
        <input ref={input} type="file" accept=".xml,.csv,.xlsx,.xls,text/csv,application/xml,text/xml" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </div>
      <p className="mt-4 text-xs text-ink-secondary">{t("required")}</p>
      <p className="text-xs text-ink-secondary">{t("optional")}</p>
      <div className="mt-3 flex gap-1.5">
        {(["xml", "csv", "excel"] as const).map((format) => (
          <button key={format} type="button" onClick={() => setTab(format)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", tab === format ? "border-ink bg-ink text-white" : "border-control text-ink-secondary")}>
            {format === "xml" ? "XML" : format === "csv" ? "CSV" : "Excel"}
          </button>
        ))}
      </div>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-canvas p-3 text-xs text-ink-secondary">{EXAMPLES[tab]}</pre>
      {tab !== "xml" && <p className="mt-1 text-xs text-ink-subtle">{tab === "csv" ? t("csvHint") : t("excelHint")}</p>}
      <ErrorText error={error} />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{tCatalog("cancel")}</Button>
        <Button disabled={!file || pending} onClick={() => void submit()}>
          {pending && <LoaderCircle className="animate-spin" />}
          {pending ? t("importing") : t("import")}
        </Button>
      </div>
    </DialogContent>
  );
}

function FeedImport({ initial, onClose, onDone }: { initial: { format: FeedFormat; url?: string }; onClose: () => void; onDone: (message: string) => void }) {
  const t = useTranslations("settings.catalog.feedImport");
  const tCatalog = useTranslations("settings.catalog");
  const [format, setFormat] = useState<FeedFormat>(initial.format);
  const [url, setUrl] = useState(initial.url ?? "");
  const { error, pending, run } = useRun();
  return (
    <DialogContent className="max-w-xl">
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogDescription>{t("subtitle")}</DialogDescription>
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => importFeed({ url, format }), (result) => onDone(t("done", { count: "count" in result ? (result.count ?? 0) : 0 })));
        }}
      >
        <fieldset>
          <legend className="text-sm font-medium text-ink">{t("format")}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["google_shopping", "facebook"] as const).map((option) => (
              <label key={option} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm", format === option ? "border-ink bg-canvas font-medium text-ink" : "border-line text-ink-secondary")}>
                <input type="radio" name="feed-format" className="sr-only" checked={format === option} onChange={() => setFormat(option)} />
                {format === option && <Check className="size-4" />}
                {t(`formats.${option}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t("url")} hint={t(`hint.${format}`)}>
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder={t("urlPlaceholder")} className={field} />
        </Field>
        {initial.url && <p className="text-xs text-ink-subtle">{t("replaces")}</p>}
        <ErrorText error={error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>{tCatalog("cancel")}</Button>
          <Button type="submit" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            {pending ? t("importing") : t("import")}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

function SyncedProduct({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useTranslations("settings.catalog");
  const platform = t(`platforms.${product.source}`);
  const [include, setInclude] = useState(product.includeInArticles);
  const { error, pending, run } = useRun();
  const rows: [string, ReactNode][] = [
    [t("synced.name"), product.name],
    [t("synced.brand"), product.brand ?? "—"],
    [t("synced.category"), product.category ?? "—"],
    [t("synced.price"), product.priceLabel ?? "—"],
    [t("synced.url"), product.url ? <a href={product.url} target="_blank" rel="noreferrer" className="break-all text-ink hover:underline">{product.url}</a> : "—"],
    [t("synced.id", { platform }), <span key="id" className="break-all">{product.externalId ?? "—"}</span>],
  ];
  return (
    <DialogContent className="max-w-xl">
      <div className="flex gap-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- product photo from the client's store
          <img src={product.imageUrl} alt="" className="size-20 shrink-0 rounded-xl border border-line object-cover" />
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-xl bg-canvas text-ink-subtle"><Package className="size-6" /></span>
        )}
        <div className="min-w-0">
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription>{t("synced.note", { platform })}</DialogDescription>
        </div>
      </div>
      <dl className="mt-5 divide-y divide-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-2">
            <dt className="text-ink-secondary">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-secondary">{product.description ?? t("synced.noDescription")}</p>
      <label className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-line p-3">
        <span>
          <span className="block text-sm font-medium text-ink">{t("form.include")}</span>
          <span className="block text-xs text-ink-secondary">{product.url ? t("form.includeHint") : t("table.includeNeedsUrl")}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={include}
          disabled={pending || (!product.url && !include)}
          onChange={(event) => {
            const next = event.target.checked;
            setInclude(next);
            run(() => setProductIncluded(product.id, next), () => undefined);
          }}
          className="mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-[#22A06B] checked:before:translate-x-[22px] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </label>
      <ErrorText error={error} />
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>{t("close")}</Button>
      </div>
    </DialogContent>
  );
}

function Confirm({ title, body, confirm, action, onClose, onDone }: { title: string; body: string; confirm: string; action: () => Promise<unknown>; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("settings.catalog");
  const { error, pending, run } = useRun();
  return (
    <DialogContent className="max-w-md">
      <DialogTitle className="text-xl">{title}</DialogTitle>
      <DialogDescription>{body}</DialogDescription>
      <ErrorText error={error} />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
        <Button className="bg-[#B42318] hover:bg-[#B42318]/90" disabled={pending} onClick={() => run(action, onDone)}>
          <X />
          {confirm}
        </Button>
      </div>
    </DialogContent>
  );
}

export function CatalogDialogs({ state, view, onClose, onChange, onDone }: { state: DialogState | null; view: CatalogView; onClose: () => void; onChange: (state: DialogState) => void; onDone: (message: string) => void }) {
  const t = useTranslations("settings.catalog");
  const finish = (message: string) => {
    onClose();
    onDone(message);
  };
  const platformOf = (type: CatalogType) => t(`platforms.${type === "shopify_catalog" ? "shopify" : type === "woocommerce" ? "woocommerce" : (view.feed?.format ?? "google_shopping")}`);
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      {state?.kind === "sources" && (
        <DialogContent className="max-w-2xl">
          <DialogTitle>{t("addProductsTitle")}</DialogTitle>
          <DialogDescription>{t("empty.body")}</DialogDescription>
          <div className="mt-5">
            <SourceCards view={view} open={onChange} compact />
          </div>
        </DialogContent>
      )}
      {(state?.kind === "shopify" || state?.kind === "woocommerce") && (
        <StoreWizard key={state.kind} platform={state.kind} update={state.update} initialStore={state.values?.store} onClose={onClose} onDone={finish} />
      )}
      {state?.kind === "manual" && <ManualChooser onPick={onChange} onClose={onClose} />}
      {state?.kind === "product" && <ProductForm product={state.product} defaultCurrency={view.store?.currency ?? "USD"} onClose={onClose} onDone={finish} />}
      {state?.kind === "import" && <ImportFile onClose={onClose} onDone={finish} />}
      {state?.kind === "feed" && <FeedImport initial={state} onClose={onClose} onDone={finish} />}
      {state?.kind === "view" && <SyncedProduct product={state.product} onClose={onClose} />}
      {state?.kind === "delete" && (
        <Confirm
          title={t("deleteProduct.title")}
          body={t("deleteProduct.body", { name: state.product.name })}
          confirm={t("deleteProduct.confirm")}
          action={() => deleteManualProduct(state.product.id)}
          onClose={onClose}
          onDone={onClose}
        />
      )}
      {state?.kind === "disconnect" && (
        <Confirm
          title={state.type === "product_feed" ? t("feed.removeTitle") : t("disconnectTitle", { platform: platformOf(state.type) })}
          body={state.type === "product_feed" ? t("feed.removeBody") : t("disconnectBody", { platform: platformOf(state.type) })}
          confirm={state.type === "product_feed" ? t("feed.removeConfirm") : t("disconnectConfirm")}
          action={() => disconnectCatalogSource(state.type)}
          onClose={onClose}
          onDone={onClose}
        />
      )}
    </Dialog>
  );
}
