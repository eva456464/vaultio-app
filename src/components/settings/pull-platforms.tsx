"use client";

import { Check, Copy, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { lovablePrompt, lovableSecretName } from "@/lib/lovable-prompt";
import { cn } from "@/lib/utils";
import { setupDudaFeed } from "@/server/actions/platforms";
import { disconnectIntegration, generateApiKey, revokeApiKey } from "@/server/actions/publishing";

/**
 * Platforms that fetch the articles themselves: Framer (plugin), Lovable (prompt + content API)
 * and Duda (RSS feed). Each has a short setup guide; nothing is pushed to them.
 */

export type PullKey = { prefix: string; lastUsedAt: string | null } | null;
type PullPlatform = "nextjs" | "framer" | "lovable" | "duda";
type T = ReturnType<typeof useTranslations<"settings.publishing">>;

const BADGE: Record<PullPlatform, { letter: string; color: string }> = {
  nextjs: { letter: "N", color: "#000000" },
  framer: { letter: "F", color: "#0A0A0A" },
  lovable: { letter: "L", color: "#E2456F" },
  duda: { letter: "D", color: "#4B3FD8" },
};

/** Raw message lists with simple {name} placeholders. */
const fill = (items: string[], values: Record<string, string> = {}) => items.map((item) => item.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole));

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(id);
    setTimeout(() => setCopied((current) => (current === id ? null : current)), 2000);
  };
  return { copied, copy };
}

function CopyRow({ value, id, copied, onCopy, secret }: { value: string; id: string; copied: string | null; onCopy: (value: string, id: string) => void; secret?: boolean }) {
  const t = useTranslations("settings.publishing.wizard");
  return (
    <div className="flex gap-2">
      <code className={cn("min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink", secret ? "truncate" : "break-all")}>{value}</code>
      <Button type="button" size="sm" variant="outline" onClick={() => onCopy(value, id)}>
        {copied === id ? <Check /> : <Copy />}
        {copied === id ? t("copied") : t("copy")}
      </Button>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm text-ink">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-canvas text-xs font-semibold text-ink-secondary">{index + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Checklist({ items, checked, onChange }: { items: string[]; checked: boolean[]; onChange: (index: number, value: boolean) => void }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <label key={item} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", checked[index] ? "border-ink/30 bg-canvas text-ink" : "border-line text-ink-secondary hover:bg-canvas")}>
          <input type="checkbox" className="size-4 accent-ink" checked={checked[index] ?? false} onChange={(event) => onChange(index, event.target.checked)} />
          {item}
        </label>
      ))}
    </div>
  );
}

function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <p className={cn("flex gap-2 rounded-xl p-3 text-sm", tone === "warning" ? "bg-[#FEF3E2] text-[#8A4B0F]" : "bg-canvas text-ink-secondary")}>
      {tone === "warning" && <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}

type Step = { title: string; body?: ReactNode; content: ReactNode; ready?: boolean };

/** The dialog: one step at a time with Back / Continue, Done on the last step. */
function Wizard({ title, steps, onClose, footer }: { title: string; steps: Step[]; onClose: () => void; footer?: ReactNode }) {
  const t = useTranslations("settings.publishing.wizard");
  const [index, setIndex] = useState(0);
  const step = steps[index]!;
  const last = index === steps.length - 1;
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[1.1px] text-section">
        {title} · {t("step", { step: index + 1, total: steps.length })}
      </p>
      <DialogTitle className="mt-2 text-xl">{step.title}</DialogTitle>
      <DialogDescription asChild>
        <div className="mt-1 text-sm text-ink-secondary">{step.body}</div>
      </DialogDescription>
      <div className="mt-5 space-y-4">{step.content}</div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div>{index === 0 ? footer : <Button type="button" variant="outline" onClick={() => setIndex(index - 1)}>{t("back")}</Button>}</div>
        <Button type="button" disabled={step.ready === false} onClick={() => (last ? onClose() : setIndex(index + 1))}>
          {last ? t("done") : t("continue")}
        </Button>
      </div>
    </>
  );
}

/** Creates (or replaces) the key a platform uses and shows it once. */
function KeyPanel({ source, current, newKey, setNewKey }: { source: "framer" | "lovable" | "nextjs"; current: PullKey; newKey: string | null; setNewKey: (key: string) => void }) {
  const t = useTranslations("settings.publishing.wizard");
  const format = useFormatter();
  const { copied, copy } = useCopy();
  const [pending, startTransition] = useTransition();
  const create = () => startTransition(async () => setNewKey((await generateApiKey(source)).key));
  if (newKey)
    return (
      <div className="space-y-2 rounded-xl border border-success-border bg-success-bg p-4">
        <p className="text-sm font-medium text-success">{t("keyNew")}</p>
        <CopyRow value={newKey} id="key" copied={copied} onCopy={copy} secret />
      </div>
    );
  return (
    <div className="space-y-3">
      {current ? (
        <>
          <p className="text-sm text-ink">
            {t("keyActive", { prefix: current.prefix, lastUsed: current.lastUsedAt ? format.dateTime(new Date(current.lastUsedAt), { dateStyle: "medium", timeStyle: "short" }) : t("keyNeverUsed") })}
          </p>
          <p className="text-xs text-ink-subtle">{t("keyLost")}</p>
        </>
      ) : (
        <p className="text-sm text-ink-secondary">{t("keyNeeded")}</p>
      )}
      <Button type="button" variant={current ? "outline" : "primary"} disabled={pending} onClick={create}>
        {pending && <LoaderCircle className="animate-spin" />}
        {current ? t("keyReplace") : t("keyCreate")}
      </Button>
    </div>
  );
}

function RemoveButton({ platform, name, onDone }: { platform: PullPlatform; name: string; onDone: () => void }) {
  const t = useTranslations("settings.publishing.wizard");
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className="border-[#F3B4A9] text-[#C4320A] hover:bg-[#FDECEA]"
      disabled={pending}
      onClick={() =>
        window.confirm(t("removeConfirm", { platform: name })) &&
        startTransition(async () => {
          if (platform === "duda") await disconnectIntegration("duda");
          else await revokeApiKey(platform);
          onDone();
        })
      }
    >
      {t("remove")}
    </Button>
  );
}

function useChecklist(size: number, initial: boolean) {
  const [checked, setChecked] = useState<boolean[]>(Array.from({ length: size }, () => initial));
  return { checked, all: checked.every(Boolean), set: (index: number, value: boolean) => setChecked((current) => current.map((item, i) => (i === index ? value : item))) };
}

function FramerWizard({ current, apiBaseUrl, brandName, pluginUrl, onClose }: { current: PullKey; apiBaseUrl: string; brandName: string; pluginUrl: string | null; onClose: () => void }) {
  const t = useTranslations("settings.publishing");
  const list = (key: string) => fill(t.raw(`framer.steps.${key}.items` as "framer.steps.install.items") as string[], { brand: brandName });
  const checks = useChecklist(2, Boolean(current));
  const [newKey, setNewKey] = useState<string | null>(null);
  const { copied, copy } = useCopy();
  const steps: Step[] = [
    {
      title: t("framer.steps.before.title"),
      body: t("framer.steps.before.body", { brand: brandName }),
      ready: checks.all,
      content: (
        <>
          <Checklist items={[t("framer.steps.before.check1"), t("framer.steps.before.check2")]} checked={checks.checked} onChange={checks.set} />
          <Note>{t("framer.steps.before.note")}</Note>
        </>
      ),
    },
    {
      title: t("framer.steps.install.title"),
      body: t("framer.steps.install.body", { brand: brandName }),
      content: (
        <>
          {pluginUrl && (
            <a href={pluginUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-control bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
              {t("framer.steps.install.open", { brand: brandName })} <ExternalLink className="size-3.5" />
            </a>
          )}
          <Steps items={list("install")} />
        </>
      ),
    },
    {
      title: t("framer.steps.key.title"),
      body: t("framer.steps.key.body"),
      ready: Boolean(current || newKey),
      content: (
        <>
          <KeyPanel source="framer" current={current} newKey={newKey} setNewKey={setNewKey} />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-ink-secondary">{t("framer.steps.key.address")}</p>
            <CopyRow value={apiBaseUrl} id="address" copied={copied} onCopy={copy} />
          </div>
        </>
      ),
    },
    { title: t("framer.steps.import.title"), body: t("framer.steps.import.body"), content: <Steps items={list("import")} /> },
    { title: t("framer.steps.pages.title"), body: t("framer.steps.pages.body"), content: <Steps items={list("pages")} /> },
    { title: t("framer.steps.done.title"), body: t("framer.steps.done.body"), content: <Steps items={list("done")} /> },
  ];
  return <Wizard title={t("framer.name")} steps={steps} onClose={onClose} footer={current ? <RemoveButton platform="framer" name={t("framer.name")} onDone={onClose} /> : null} />;
}

function CodeBlock({ value, id, copied, onCopy, label }: { value: string; id: string; copied: string | null; onCopy: (value: string, id: string) => void; label: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-line bg-canvas p-3 pr-12 font-mono text-[12px] leading-relaxed text-ink">{value}</pre>
      <button type="button" aria-label={label} onClick={() => onCopy(value, id)} className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-white text-ink-secondary ring-1 ring-line hover:text-ink">
        {copied === id ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

function NextjsWizard({ current, apiBaseUrl, siteUrl, packageName, onClose }: { current: PullKey; apiBaseUrl: string; siteUrl: string; packageName: string; onClose: () => void }) {
  const t = useTranslations("settings.publishing");
  const checks = useChecklist(2, Boolean(current));
  const [newKey, setNewKey] = useState<string | null>(null);
  const { copied, copy } = useCopy();
  const env = [`BLOG_API_KEY=${newKey ?? t("nextjs.keyPlaceholder")}`, `BLOG_API_URL=${apiBaseUrl}/v1`, `NEXT_PUBLIC_SITE_URL=${siteUrl}`].join("\n");
  const config = `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {\n  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },\n};\n\nexport default nextConfig;`;
  const steps: Step[] = [
    {
      title: t("nextjs.steps.before.title"),
      body: t("nextjs.steps.before.body"),
      ready: checks.all,
      content: (
        <>
          <Checklist items={[t("nextjs.steps.before.check1"), t("nextjs.steps.before.check2")]} checked={checks.checked} onChange={checks.set} />
          <Note>{t("nextjs.steps.before.alternative")}</Note>
        </>
      ),
    },
    { title: t("nextjs.steps.install.title"), body: t("nextjs.steps.install.body"), content: <CodeBlock value={`npm install ${packageName}`} id="install" copied={copied} onCopy={copy} label={t("wizard.copy")} /> },
    {
      title: t("nextjs.steps.key.title"),
      body: t("nextjs.steps.key.body"),
      ready: Boolean(current || newKey),
      content: (
        <>
          <KeyPanel source="nextjs" current={current} newKey={newKey} setNewKey={setNewKey} />
          <p className="text-xs font-medium text-ink-secondary">.env.local</p>
          <CodeBlock value={env} id="env" copied={copied} onCopy={copy} label={t("wizard.copy")} />
          <Note tone="warning">{t("nextjs.steps.key.serverOnly")}</Note>
        </>
      ),
    },
    { title: t("nextjs.steps.images.title"), body: t("nextjs.steps.images.body"), content: <CodeBlock value={config} id="config" copied={copied} onCopy={copy} label={t("wizard.copy")} /> },
    {
      title: t("nextjs.steps.scaffold.title"),
      body: t("nextjs.steps.scaffold.body"),
      content: (
        <>
          <CodeBlock value={`npx ${packageName} init`} id="init" copied={copied} onCopy={copy} label={t("wizard.copy")} />
          <Steps items={t.raw("nextjs.steps.scaffold.items") as string[]} />
        </>
      ),
    },
    {
      title: t("nextjs.steps.done.title"),
      body: t("nextjs.steps.done.body", { url: `${siteUrl}/blog` }),
      content: (
        <>
          {current?.lastUsedAt ? <Note>{t("nextjs.steps.done.connected")}</Note> : <Note tone="warning">{t("nextjs.steps.done.waiting")}</Note>}
          <Note>{t("nextjs.steps.done.cache")}</Note>
        </>
      ),
    },
  ];
  return <Wizard title={t("nextjs.name")} steps={steps} onClose={onClose} footer={current ? <RemoveButton platform="nextjs" name={t("nextjs.name")} onDone={onClose} /> : null} />;
}

function LovableWizard({ current, apiBaseUrl, brandName, settingsUrl, onClose }: { current: PullKey; apiBaseUrl: string; brandName: string; settingsUrl: string; onClose: () => void }) {
  const t = useTranslations("settings.publishing");
  const secret = lovableSecretName(brandName);
  const list = (key: string) => fill(t.raw(`lovable.steps.${key}.items` as "lovable.steps.prompt.items") as string[], { secret });
  const checks = useChecklist(2, Boolean(current));
  const [newKey, setNewKey] = useState<string | null>(null);
  const { copied, copy } = useCopy();
  const prompt = lovablePrompt({ apiBaseUrl, brandName, settingsUrl });
  const steps: Step[] = [
    {
      title: t("lovable.steps.before.title"),
      body: t("lovable.steps.before.body"),
      ready: checks.all,
      content: (
        <>
          <Checklist items={[t("lovable.steps.before.check1"), t("lovable.steps.before.check2")]} checked={checks.checked} onChange={checks.set} />
          <Note>{t("lovable.steps.before.alternative")}</Note>
        </>
      ),
    },
    {
      title: t("lovable.steps.key.title"),
      body: t("lovable.steps.key.body"),
      ready: Boolean(current || newKey),
      content: <KeyPanel source="lovable" current={current} newKey={newKey} setNewKey={setNewKey} />,
    },
    {
      title: t("lovable.steps.prompt.title"),
      body: t("lovable.steps.prompt.body"),
      content: (
        <>
          <div className="relative">
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-canvas p-3 font-mono text-[11px] leading-relaxed text-ink-secondary">{prompt}</pre>
          </div>
          <Button type="button" onClick={() => copy(prompt, "prompt")}>
            {copied === "prompt" ? <Check /> : <Copy />}
            {copied === "prompt" ? t("wizard.copied") : t("lovable.steps.prompt.copy")}
          </Button>
          <Steps items={list("prompt")} />
        </>
      ),
    },
    {
      title: t("lovable.steps.secret.title"),
      body: t("lovable.steps.secret.body", { secret }),
      content: (
        <>
          <Note tone="warning">{t("lovable.steps.secret.warning")}</Note>
          <Steps items={list("secret")} />
        </>
      ),
    },
    {
      title: t("lovable.steps.done.title"),
      body: t("lovable.steps.done.body"),
      content: (
        <>
          <Steps items={list("done")} />
          <Note>{t("lovable.steps.done.note")}</Note>
        </>
      ),
    },
  ];
  return <Wizard title={t("lovable.name")} steps={steps} onClose={onClose} footer={current ? <RemoveButton platform="lovable" name={t("lovable.name")} onDone={onClose} /> : null} />;
}

function DudaWizard({ feedUrl, connected, onClose }: { feedUrl: string | null; connected: boolean; onClose: () => void }) {
  const t = useTranslations("settings.publishing");
  const list = (key: string) => t.raw(`duda.steps.${key}.items` as "duda.steps.widget.items") as string[];
  const checks = useChecklist(1, connected);
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { copied, copy } = useCopy();
  const url = created ?? feedUrl;
  const create = (replace: boolean) => {
    if (replace && !window.confirm(t("duda.steps.feed.regenerateConfirm"))) return;
    startTransition(async () => {
      const result = await setupDudaFeed();
      if ("error" in result) setError(result.error);
      else {
        setError(null);
        setCreated(result.feedUrl);
      }
    });
  };
  const steps: Step[] = [
    {
      title: t("duda.steps.before.title"),
      body: t("duda.steps.before.body"),
      ready: checks.all,
      content: (
        <>
          <Checklist items={[t("duda.steps.before.check1")]} checked={checks.checked} onChange={checks.set} />
          <div className="rounded-xl bg-canvas p-3 text-sm">
            <p className="font-medium text-ink">{t("duda.steps.before.emptyTitle")}</p>
            <p className="mt-1 text-ink-secondary">{t("duda.steps.before.emptyBody")}</p>
            <Link href="/dashboard/content-plan" className="mt-2 inline-block font-medium text-ink underline-offset-4 hover:underline">
              {t("wizard.contentPlan")}
            </Link>
          </div>
        </>
      ),
    },
    {
      title: t("duda.steps.feed.title"),
      body: t("duda.steps.feed.body"),
      ready: Boolean(url),
      content: url ? (
        <>
          <CopyRow value={url} id="feed" copied={copied} onCopy={copy} />
          <p className="text-xs text-ink-subtle">{t("duda.steps.feed.tip")}</p>
          <div className="space-y-1.5 border-t border-line pt-4">
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => create(true)}>
              {pending && <LoaderCircle className="animate-spin" />}
              {t("duda.steps.feed.regenerate")}
            </Button>
            <p className="text-xs text-ink-subtle">{t("duda.steps.feed.regenerateHint")}</p>
          </div>
          {error && <p className="text-sm text-[#9A3412]">{error}</p>}
        </>
      ) : (
        <>
          <Button type="button" disabled={pending} onClick={() => create(false)}>
            {pending && <LoaderCircle className="animate-spin" />}
            {t("duda.steps.feed.create")}
          </Button>
          {error && <p className="text-sm text-[#9A3412]">{error}</p>}
        </>
      ),
    },
    {
      title: t("duda.steps.widget.title"),
      body: t("duda.steps.widget.body"),
      content: (
        <>
          <Steps items={list("widget")} />
          <Note>{t("duda.steps.widget.note")}</Note>
        </>
      ),
    },
    {
      title: t("duda.steps.blog.title"),
      body: t("duda.steps.blog.body"),
      content: (
        <>
          <Steps items={list("blog")} />
          <Note>{t("duda.steps.blog.note")}</Note>
        </>
      ),
    },
    { title: t("duda.steps.done.title"), body: t("duda.steps.done.body"), content: <Steps items={list("done")} /> },
  ];
  return <Wizard title={t("duda.name")} steps={steps} onClose={onClose} footer={connected ? <RemoveButton platform="duda" name={t("duda.name")} onDone={onClose} /> : null} />;
}

function summaryOf(platform: PullPlatform, t: T, format: ReturnType<typeof useFormatter>, brandName: string, key: PullKey, duda: { feedUrl: string | null } | null) {
  if (platform === "duda") return duda ? t("duda.summary") : t("duda.description");
  if (!key) return platform === "framer" ? t("framer.description", { brand: brandName }) : t(`${platform}.description`);
  if (!key.lastUsedAt) return t(`${platform}.summaryNew`);
  return t(`${platform}.summary`, { lastUsed: format.dateTime(new Date(key.lastUsedAt), { dateStyle: "medium", timeStyle: "short" }) });
}

export function PullPlatformCards({
  canEdit,
  keys,
  duda,
  apiBaseUrl,
  brandName,
  framerPluginUrl,
  settingsUrl,
  siteUrl,
  nextPackage,
  statusPill,
}: {
  canEdit: boolean;
  keys: { framer: PullKey; lovable: PullKey; nextjs: PullKey };
  duda: { feedUrl: string | null } | null;
  apiBaseUrl: string;
  brandName: string;
  framerPluginUrl: string | null;
  settingsUrl: string;
  siteUrl: string;
  nextPackage: string;
  statusPill: (status: string) => ReactNode;
}) {
  const t = useTranslations("settings.publishing");
  const format = useFormatter();
  const [open, setOpen] = useState<PullPlatform | null>(null);
  const close = () => setOpen(null);
  const connected = { nextjs: Boolean(keys.nextjs), framer: Boolean(keys.framer), lovable: Boolean(keys.lovable), duda: Boolean(duda) };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(["nextjs", "framer", "lovable", "duda"] as const).map((platform) => (
        <section key={platform} className="card flex flex-col p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold text-white" style={{ background: BADGE[platform].color }}>
              {BADGE[platform].letter}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-sans text-[15px] font-semibold text-ink">{t(`${platform}.name`)}</h3>
                {statusPill(connected[platform] ? "connected" : "off")}
              </div>
              <p className="mt-0.5 text-sm text-ink-secondary">{summaryOf(platform, t, format, brandName, platform === "duda" ? null : keys[platform], duda)}</p>
            </div>
          </div>
          {canEdit && (
            <div className="mt-auto flex justify-end pt-4">
              <Button variant={connected[platform] ? "outline" : "primary"} size="sm" onClick={() => setOpen(platform)}>
                {connected[platform] ? t("manage") : t("connect")}
              </Button>
            </div>
          )}
        </section>
      ))}
      <Dialog open={open !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent className="max-w-xl">
          {open === "nextjs" && <NextjsWizard current={keys.nextjs} apiBaseUrl={apiBaseUrl} siteUrl={siteUrl} packageName={nextPackage} onClose={close} />}
          {open === "framer" && <FramerWizard current={keys.framer} apiBaseUrl={apiBaseUrl} brandName={brandName} pluginUrl={framerPluginUrl} onClose={close} />}
          {open === "lovable" && <LovableWizard current={keys.lovable} apiBaseUrl={apiBaseUrl} brandName={brandName} settingsUrl={settingsUrl} onClose={close} />}
          {open === "duda" && <DudaWizard feedUrl={duda?.feedUrl ?? null} connected={Boolean(duda)} onClose={close} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
