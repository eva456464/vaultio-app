"use client";

import { ExternalLink, Globe, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  checkHostedBlog,
  connectBigCommerce,
  connectGhl,
  connectGhost,
  connectShopify,
  connectWebflow,
  connectWix,
  loadGhlBlogs,
  loadShopifyBlogs,
  loadWebflowSites,
  removeHostedBlog,
  setPublishMode,
  setupHostedBlog,
} from "@/server/actions/platforms";
import { disconnectIntegration } from "@/server/actions/publishing";
import { Records } from "./white-label/hosting-form";

export type PlatformConnection = { status: string; lastError: string | null; config: Record<string, unknown> } | null;
type Mode = "publish" | "draft";
export type Platform = "ghost" | "webflow" | "shopify" | "wix" | "bigcommerce" | "gohighlevel";

const field = "mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";
const BADGE: Record<Platform, { letter: string; color: string }> = {
  ghost: { letter: "G", color: "#15171A" },
  webflow: { letter: "W", color: "#146EF5" },
  shopify: { letter: "S", color: "#5E8E3E" },
  wix: { letter: "W", color: "#0C6EFC" },
  bigcommerce: { letter: "B", color: "#121118" },
  gohighlevel: { letter: "H", color: "#155EEF" },
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

function ModePicker({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  const t = useTranslations("settings.publishing");
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{t("modeLabel")}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {(["publish", "draft"] as const).map((mode) => (
          <label key={mode} className={cn("cursor-pointer rounded-xl border p-3", value === mode ? "border-ink bg-canvas" : "border-line hover:bg-canvas")}>
            <input type="radio" name="publish-mode" className="sr-only" checked={value === mode} onChange={() => onChange(mode)} />
            <span className="block text-sm font-semibold text-ink">{t(`modes.${mode}`)}</span>
            <span className="mt-0.5 block text-xs text-ink-secondary">{t(`modeHint.${mode}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = <T,>(action: () => Promise<T | { error: string }>, done?: (result: T) => void) =>
    startTransition(async () => {
      const result = await action();
      if (result && typeof result === "object" && "error" in result) setError((result as { error: string }).error);
      else {
        setError(null);
        done?.(result as T);
      }
    });
  return { error, pending, run, setError };
}

function Footer({ pending, onCancel, submit, disabled }: { pending: boolean; onCancel: () => void; submit: string; disabled?: boolean }) {
  const t = useTranslations("settings.publishing");
  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button>
      <Button type="submit" disabled={pending || disabled}>
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? t("connecting") : submit}
      </Button>
    </div>
  );
}

function GhostForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("settings.publishing");
  const [form, setForm] = useState({ siteUrl: "", adminKey: "", mode: "publish" as Mode });
  const { error, pending, run } = useAction();
  return (
    <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); run(() => connectGhost(form), onDone); }}>
      <Field label={t("ghost.siteUrl")} hint={t("ghost.siteUrlHint")}>
        <input className={field} value={form.siteUrl} onChange={(e) => setForm({ ...form, siteUrl: e.target.value })} placeholder="https://yourblog.ghost.io" required />
      </Field>
      <Field label={t("ghost.adminKey")} hint={t("ghost.adminKeyHint")}>
        <input className={field} type="password" autoComplete="off" value={form.adminKey} onChange={(e) => setForm({ ...form, adminKey: e.target.value })} required />
      </Field>
      <ModePicker value={form.mode} onChange={(mode) => setForm({ ...form, mode })} />
      {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      <Footer pending={pending} onCancel={onDone} submit={t("connect")} />
    </form>
  );
}

type WebflowSites = { id: string; name: string; baseUrl: string | null; collections: { id: string; name: string; slug: string }[] }[];

function WebflowForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("settings.publishing");
  const [token, setToken] = useState("");
  const [sites, setSites] = useState<WebflowSites | null>(null);
  const [choice, setChoice] = useState({ siteId: "", collectionId: "", mode: "publish" as Mode });
  const { error, pending, run } = useAction();
  const site = sites?.find((entry) => entry.id === choice.siteId);
  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!sites)
          run(() => loadWebflowSites(token), (result) => {
            setSites(result.choice.sites);
            const first = result.choice.sites[0];
            setChoice({ ...choice, siteId: first?.id ?? "", collectionId: first?.collections.find((c) => /blog|post|article/i.test(c.name))?.id ?? first?.collections[0]?.id ?? "" });
          });
        else run(() => connectWebflow({ token, ...choice }), onDone);
      }}
    >
      <Field label={t("webflow.token")} hint={t("webflow.tokenHint")}>
        <input className={field} type="password" autoComplete="off" value={token} disabled={Boolean(sites)} onChange={(e) => setToken(e.target.value)} required />
      </Field>
      {sites && (
        <>
          <Field label={t("webflow.site")}>
            <select className={field} value={choice.siteId} onChange={(e) => setChoice({ ...choice, siteId: e.target.value, collectionId: sites.find((s) => s.id === e.target.value)?.collections[0]?.id ?? "" })}>
              {sites.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </Field>
          <Field label={t("webflow.collection")}>
            <select className={field} value={choice.collectionId} onChange={(e) => setChoice({ ...choice, collectionId: e.target.value })}>
              {(site?.collections ?? []).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </Field>
          <ModePicker value={choice.mode} onChange={(mode) => setChoice({ ...choice, mode })} />
        </>
      )}
      {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      <Footer pending={pending} onCancel={onDone} submit={sites ? t("connect") : t("webflow.loadSites")} disabled={Boolean(sites) && !choice.collectionId} />
    </form>
  );
}

function ShopifyForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("settings.publishing");
  const [useToken, setUseToken] = useState(false);
  const [credentials, setCredentials] = useState({ shop: "", clientId: "", clientSecret: "", accessToken: "" });
  const [blogs, setBlogs] = useState<{ id: string; title: string }[] | null>(null);
  const [choice, setChoice] = useState({ blogId: "", author: "", mode: "publish" as Mode });
  const { error, pending, run } = useAction();
  const creds = useToken ? { shop: credentials.shop, accessToken: credentials.accessToken } : { shop: credentials.shop, clientId: credentials.clientId, clientSecret: credentials.clientSecret };
  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!blogs)
          run(() => loadShopifyBlogs(creds), (result) => {
            setBlogs(result.choice.blogs);
            setChoice({ ...choice, blogId: result.choice.blogs[0]?.id ?? "" });
          });
        else run(() => connectShopify({ credentials: creds, ...choice }), onDone);
      }}
    >
      <Field label={t("shopify.shop")} hint={t("shopify.shopHint")}>
        <input className={field} value={credentials.shop} disabled={Boolean(blogs)} onChange={(e) => setCredentials({ ...credentials, shop: e.target.value })} placeholder="your-store.myshopify.com" required />
      </Field>
      {useToken ? (
        <Field label={t("shopify.accessToken")}>
          <input className={field} type="password" autoComplete="off" disabled={Boolean(blogs)} value={credentials.accessToken} onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })} placeholder="shpat_…" required />
        </Field>
      ) : (
        <>
          <p className="text-xs text-ink-subtle">{t("shopify.credentialsHint")}</p>
          <Field label={t("shopify.clientId")}>
            <input className={field} autoComplete="off" disabled={Boolean(blogs)} value={credentials.clientId} onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })} required />
          </Field>
          <Field label={t("shopify.clientSecret")}>
            <input className={field} type="password" autoComplete="off" disabled={Boolean(blogs)} value={credentials.clientSecret} onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })} required />
          </Field>
        </>
      )}
      {!blogs && (
        <button type="button" onClick={() => setUseToken(!useToken)} className="text-sm font-medium text-ink underline-offset-4 hover:underline">
          {useToken ? t("shopify.useClient") : t("shopify.useToken")}
        </button>
      )}
      {blogs && (
        <>
          <Field label={t("shopify.blog")}>
            <select className={field} value={choice.blogId} onChange={(e) => setChoice({ ...choice, blogId: e.target.value })}>
              {blogs.map((blog) => <option key={blog.id} value={blog.id}>{blog.title}</option>)}
            </select>
          </Field>
          <Field label={t("shopify.author")} hint={t("shopify.authorHint")}>
            <input className={field} value={choice.author} maxLength={60} onChange={(e) => setChoice({ ...choice, author: e.target.value })} />
          </Field>
          <ModePicker value={choice.mode} onChange={(mode) => setChoice({ ...choice, mode })} />
        </>
      )}
      {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      <Footer pending={pending} onCancel={onDone} submit={blogs ? t("connect") : t("shopify.loadBlogs")} />
    </form>
  );
}

function WixForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("settings.publishing");
  const [form, setForm] = useState({ siteId: "", apiKey: "", mode: "publish" as Mode });
  const { error, pending, run } = useAction();
  return (
    <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); run(() => connectWix(form), onDone); }}>
      <Field label={t("wix.siteId")} hint={t("wix.siteIdHint")}>
        <input className={field} value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} placeholder="01c24d92-2ba6-48bd-90cd-87e33d2e9957" required />
      </Field>
      <Field label={t("wix.apiKey")} hint={t("wix.apiKeyHint")}>
        <input className={field} type="password" autoComplete="off" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} required />
      </Field>
      <ModePicker value={form.mode} onChange={(mode) => setForm({ ...form, mode })} />
      <p className="text-xs text-ink-subtle">{t("wix.note")}</p>
      {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      <Footer pending={pending} onCancel={onDone} submit={t("connect")} />
    </form>
  );
}

function BigCommerceForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("settings.publishing");
  const [form, setForm] = useState({ storeHash: "", accessToken: "", author: "", mode: "publish" as Mode });
  const [images, setImages] = useState(false);
  const [webdav, setWebdav] = useState({ url: "", username: "", password: "" });
  const { error, pending, run } = useAction();
  return (
    <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); run(() => connectBigCommerce({ ...form, webdav: images ? webdav : undefined }), onDone); }}>
      <Field label={t("bigcommerce.storeHash")} hint={t("bigcommerce.storeHashHint")}>
        <input className={field} value={form.storeHash} onChange={(e) => setForm({ ...form, storeHash: e.target.value })} placeholder="mh5fua96uw" required />
      </Field>
      <Field label={t("bigcommerce.accessToken")} hint={t("bigcommerce.accessTokenHint")}>
        <input className={field} type="password" autoComplete="off" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} required />
      </Field>
      <Field label={t("bigcommerce.author")} hint={t("bigcommerce.authorHint")}>
        <input className={field} value={form.author} maxLength={60} onChange={(e) => setForm({ ...form, author: e.target.value })} />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
        <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={images} onChange={(e) => setImages(e.target.checked)} />
        <span>
          <span className="block text-sm font-medium text-ink">{t("bigcommerce.coverImages")}</span>
          <span className="mt-0.5 block text-xs text-ink-subtle">{t("bigcommerce.coverImagesHint")}</span>
        </span>
      </label>
      {images && (
        <div className="space-y-3 rounded-xl bg-canvas p-3">
          <Field label={t("bigcommerce.webdavUrl")}>
            <input className={field} value={webdav.url} onChange={(e) => setWebdav({ ...webdav, url: e.target.value })} placeholder="https://store-mh5fua96uw.mybigcommerce.com/dav" required />
          </Field>
          <Field label={t("bigcommerce.webdavUser")}>
            <input className={field} autoComplete="off" value={webdav.username} onChange={(e) => setWebdav({ ...webdav, username: e.target.value })} required />
          </Field>
          <Field label={t("bigcommerce.webdavPassword")}>
            <input className={field} type="password" autoComplete="off" value={webdav.password} onChange={(e) => setWebdav({ ...webdav, password: e.target.value })} required />
          </Field>
        </div>
      )}
      <ModePicker value={form.mode} onChange={(mode) => setForm({ ...form, mode })} />
      {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      <Footer pending={pending} onCancel={onDone} submit={t("connect")} />
    </form>
  );
}

type GhlChoices = { blogs: { id: string; name: string }[]; authors: { id: string; name: string }[]; categories: { id: string; name: string }[] };

function GhlForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("settings.publishing");
  const [credentials, setCredentials] = useState({ locationId: "", token: "" });
  const [choices, setChoices] = useState<GhlChoices | null>(null);
  const [choice, setChoice] = useState({ blogId: "", authorId: "", categoryIds: [] as string[], mode: "publish" as Mode });
  const { error, pending, run } = useAction();
  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!choices)
          run(() => loadGhlBlogs(credentials), (result) => {
            setChoices(result.choice);
            setChoice({ ...choice, blogId: result.choice.blogs[0]?.id ?? "", authorId: result.choice.authors[0]?.id ?? "" });
          });
        else run(() => connectGhl({ credentials, ...choice, authorId: choice.authorId || undefined }), onDone);
      }}
    >
      {!choices && <p className="rounded-xl bg-canvas p-3 text-sm text-ink">{t("gohighlevel.before")}</p>}
      <Field label={t("gohighlevel.locationId")} hint={t("gohighlevel.locationIdHint")}>
        <input className={field} value={credentials.locationId} disabled={Boolean(choices)} onChange={(e) => setCredentials({ ...credentials, locationId: e.target.value })} placeholder="ve9EPM428h8vShlRW1KT" required />
      </Field>
      <Field label={t("gohighlevel.token")} hint={choices ? undefined : t("gohighlevel.tokenHint")}>
        <input className={field} type="password" autoComplete="off" value={credentials.token} disabled={Boolean(choices)} onChange={(e) => setCredentials({ ...credentials, token: e.target.value })} placeholder="pit-…" required />
      </Field>
      {!choices && (
        <details className="rounded-xl border border-line p-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink">{t("gohighlevel.scopesTitle")}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-secondary">
            {(t.raw("gohighlevel.scopes") as string[]).map((scope) => <li key={scope}>{scope}</li>)}
          </ul>
        </details>
      )}
      {choices && (
        <>
          <Field label={t("gohighlevel.blog")}>
            <select className={field} value={choice.blogId} onChange={(e) => setChoice({ ...choice, blogId: e.target.value })}>
              {choices.blogs.map((blog) => <option key={blog.id} value={blog.id}>{blog.name}</option>)}
            </select>
          </Field>
          <Field label={t("gohighlevel.author")}>
            <select className={field} value={choice.authorId} onChange={(e) => setChoice({ ...choice, authorId: e.target.value })}>
              <option value="">{t("gohighlevel.noAuthor")}</option>
              {choices.authors.map((author) => <option key={author.id} value={author.id}>{author.name}</option>)}
            </select>
          </Field>
          {choices.categories.length > 0 && (
            <fieldset>
              <legend className="text-sm font-medium text-ink">{t("gohighlevel.categories")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {choices.categories.map((category) => {
                  const on = choice.categoryIds.includes(category.id);
                  return (
                    <label key={category.id} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-sm", on ? "border-ink bg-canvas text-ink" : "border-line text-ink-secondary hover:bg-canvas")}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => setChoice({ ...choice, categoryIds: on ? choice.categoryIds.filter((id) => id !== category.id) : [...choice.categoryIds, category.id] })}
                      />
                      {category.name}
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-ink-subtle">{t("gohighlevel.categoriesHint")}</p>
            </fieldset>
          )}
          <ModePicker value={choice.mode} onChange={(mode) => setChoice({ ...choice, mode })} />
          <p className="text-xs text-ink-subtle">{t("gohighlevel.urlNote")}</p>
        </>
      )}
      {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      <Footer pending={pending} onCancel={onDone} submit={choices ? t("connect") : t("gohighlevel.loadBlogs")} disabled={Boolean(choices) && !choice.blogId} />
    </form>
  );
}

function summaryOf(platform: Platform, config: Record<string, unknown>, t: ReturnType<typeof useTranslations<"settings.publishing">>) {
  switch (platform) {
    case "ghost":
      return t("ghost.summary", { site: String(config.siteTitle ?? config.siteUrl ?? "") });
    case "webflow":
      return t("webflow.summary", { collection: String(config.collectionName ?? ""), site: String(config.siteName ?? "") });
    case "shopify":
      return t("shopify.summary", { blog: String(config.blogTitle ?? ""), shop: String(config.shop ?? "") });
    case "wix":
      return t("wix.summary", { site: String(config.siteId ?? "").slice(0, 8) });
    case "bigcommerce":
      return t(config.coverImages ? "bigcommerce.summaryImages" : "bigcommerce.summary", { store: String(config.storeName ?? config.storeHash ?? "") });
    case "gohighlevel":
      return t("gohighlevel.summary", { blog: String(config.blogName ?? "") });
  }
}

/** One website platform: status, Connect / Manage, and its connect dialog. */
export function PlatformCard({ platform, connection, canEdit, statusPill }: { platform: Platform; connection: PlatformConnection; canEdit: boolean; statusPill: ReactNode }) {
  const t = useTranslations("settings.publishing");
  const [open, setOpen] = useState(false);
  const [reconnect, setReconnect] = useState(false);
  const { error, pending, run } = useAction();
  const connected = Boolean(connection);
  const mode = (connection?.config.mode as Mode | undefined) ?? "publish";
  const close = () => {
    setOpen(false);
    setReconnect(false);
  };
  const form = {
    ghost: <GhostForm onDone={close} />,
    webflow: <WebflowForm onDone={close} />,
    shopify: <ShopifyForm onDone={close} />,
    wix: <WixForm onDone={close} />,
    bigcommerce: <BigCommerceForm onDone={close} />,
    gohighlevel: <GhlForm onDone={close} />,
  }[platform];

  return (
    <section className="card flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-white" style={{ background: BADGE[platform].color }}>
          {BADGE[platform].letter}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-sans text-[15px] font-semibold text-ink">{t(`${platform}.name`)}</h3>
            {statusPill}
          </div>
          <p className="mt-0.5 text-sm text-ink-secondary">{connection ? summaryOf(platform, connection.config, t) : t(`${platform}.description`)}</p>
        </div>
      </div>
      {connection?.lastError && <p className="mt-3 text-xs text-[#9A3412]">{t("lastError", { error: connection.lastError })}</p>}
      {canEdit && (
        <div className="mt-auto flex justify-end pt-4">
          <Button variant={connected ? "outline" : "primary"} size="sm" onClick={() => setOpen(true)}>
            {connected ? t("manage") : t("connect")}
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-xl">{t(`${platform}.name`)}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("verifyNote", { platform: t(`${platform}.name`) })}</DialogDescription>
          {connected && !reconnect ? (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-ink">{summaryOf(platform, connection!.config, t)}</p>
              <ModePicker value={mode} onChange={(next) => run(() => setPublishMode(platform, next))} />
              {error && <p className="text-sm text-[#9A3412]">{error}</p>}
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="outline" className="border-[#F3B4A9] text-[#C4320A] hover:bg-[#FDECEA]" disabled={pending} onClick={() => run(async () => { await disconnectIntegration(platform); return true; }, close)}>
                  {t("disconnect")}
                </Button>
                <Button variant="outline" onClick={() => setReconnect(true)}>{t("reconnect")}</Button>
              </div>
            </div>
          ) : (
            form
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export type HostedBlogState = { domain: string; displayName: string; verified: boolean; records: { type: string; name: string; value: string }[]; error: string | null } | null;

/** "Blog hosting": the blog Vaultio serves on the client's subdomain. */
export function HostedBlogCard({ blog, suggestion, defaultName, canEdit, onVercel }: { blog: HostedBlogState; suggestion: string; defaultName: string; canEdit: boolean; onVercel: boolean }) {
  const t = useTranslations("settings.publishing.hostedBlog");
  const [form, setForm] = useState({ domain: blog?.domain ?? suggestion, displayName: blog?.displayName ?? defaultName });
  const { error, pending, run } = useAction();
  const url = blog ? `https://${blog.domain}` : null;
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start gap-4 bg-gradient-to-br from-brand/[0.07] to-transparent p-5 md:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
          <Globe className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-[16px] font-semibold text-ink">{t("name")}</h3>
          <p className="mt-1 max-w-2xl text-sm text-ink-secondary">{t("description")}</p>
        </div>
        {blog?.verified && url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-control bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
            {t("view")} <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <div className="space-y-4 p-5 md:p-6">
        {blog?.verified && url && <p className="rounded-xl bg-success-bg p-3 text-sm text-success">{t("live", { url })}</p>}
        {blog && !blog.verified && blog.records.length > 0 && (
          <div>
            <p className="text-sm text-ink">{t("pending")}</p>
            <Records records={blog.records} intro={onVercel ? "" : t("manual")} />
            {blog.error && <p className="mt-2 text-xs text-ink-secondary">{blog.error}</p>}
          </div>
        )}
        {canEdit && (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); run(() => setupHostedBlog(form)); }}>
            <Field label={t("domain")} hint={t("domainHint")}>
              <input className={field} value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="blog.example.com" required />
            </Field>
            <Field label={t("displayName")} hint={t("displayNameHint")}>
              <input className={field} value={form.displayName} maxLength={60} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
              {blog && (
                <>
                  <Button type="button" variant="outline" className="mr-auto border-[#F3B4A9] text-[#C4320A] hover:bg-[#FDECEA]" disabled={pending} onClick={() => window.confirm(t("removeConfirm", { domain: blog.domain })) && run(removeHostedBlog)}>
                    {t("remove")}
                  </Button>
                  {!blog.verified && (
                    <Button type="button" variant="outline" disabled={pending} onClick={() => run(checkHostedBlog)}>
                      <RefreshCw /> {t("check")}
                    </Button>
                  )}
                </>
              )}
              <Button type="submit" disabled={pending}>
                {pending && <LoaderCircle className="animate-spin" />}
                {blog ? t("save") : t("setUp")}
              </Button>
            </div>
          </form>
        )}
        {error && <p className="text-sm text-[#9A3412]">{error}</p>}
      </div>
    </section>
  );
}
