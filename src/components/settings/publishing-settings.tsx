"use client";

import { Check, Code2, Copy, Globe, Webhook } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HostedBlogCard, PlatformCard, type HostedBlogState, type PlatformConnection } from "./platform-cards";
import {
  disconnectIntegration,
  generateApiKey,
  revokeApiKey,
  saveWebhook,
  saveWordpress,
  setAutoPublish,
  testWebhook,
} from "@/server/actions/publishing";

type Connection = { status: string; lastError: string | null; config: Record<string, string> } | null;

const fieldClass = "mt-1.5 h-11 w-full rounded-control border border-control bg-white px-3.5 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40";

function StatusPill({ status }: { status: string }) {
  const t = useTranslations("settings.publishing.status");
  const style =
    status === "connected"
      ? "bg-success-bg text-success"
      : status === "pending"
        ? "bg-[#EEF4FF] text-[#2A5BD7]"
        : status === "error"
          ? "bg-[#FBEAE6] text-[#9A3412]"
          : "bg-[#F3F4F6] text-ink-secondary";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", style)}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(status as "connected")}
    </span>
  );
}

function IntegrationCard({ icon, name, description, status, children }: { icon: ReactNode; name: string; description: string; status: string; children: ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas text-ink">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-sans text-[16px] font-semibold text-ink">{name}</h3>
            <StatusPill status={status} />
          </div>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function PublishingSettings({
  canEdit,
  autoPublish,
  apiKey,
  webhook,
  wordpress,
  apiBaseUrl,
  platforms,
  hostedBlog,
  blogSuggestion,
  defaultBlogName,
  onVercel,
}: {
  platforms: Record<"ghost" | "webflow" | "shopify" | "wix", PlatformConnection>;
  hostedBlog: HostedBlogState;
  blogSuggestion: string;
  defaultBlogName: string;
  onVercel: boolean;
  apiBaseUrl: string;
  canEdit: boolean;
  autoPublish: boolean;
  apiKey: { prefix: string; lastUsedAt: string | null } | null;
  webhook: Connection;
  wordpress: Connection;
}) {
  const t = useTranslations("settings.publishing");
  const [auto, setAuto] = useState(autoPublish);
  const [, startTransition] = useTransition();

  return (
    <div className="mt-8 space-y-8">
      <label className="card flex cursor-pointer items-start justify-between gap-6 p-5 md:p-6">
        <span>
          <span className="block text-[15px] font-semibold text-ink">{t("autoPublish")}</span>
          <span className="mt-1 block text-sm text-ink-secondary">{t("autoPublishHint")}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={auto}
          disabled={!canEdit}
          onChange={(event) => {
            setAuto(event.target.checked);
            startTransition(() => setAutoPublish(event.target.checked));
          }}
          className="mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[#D1D5DB] transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-[#22A06B] checked:before:translate-x-[22px]"
        />
      </label>

      <div className="space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[1.1px] text-section">{t("developers")}</p>
        <ApiCard apiKey={apiKey} canEdit={canEdit} apiBaseUrl={apiBaseUrl} />
        <WebhookCard connection={webhook} canEdit={canEdit} />
      </div>

      <div className="space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[1.1px] text-section">{t("platforms")}</p>
        <HostedBlogCard blog={hostedBlog} suggestion={blogSuggestion} defaultName={defaultBlogName} canEdit={canEdit} onVercel={onVercel} />
        <WordpressCard connection={wordpress} canEdit={canEdit} />
        <div className="grid gap-4 md:grid-cols-2">
          {(["shopify", "webflow", "wix", "ghost"] as const).map((platform) => (
            <PlatformCard key={platform} platform={platform} connection={platforms[platform]} canEdit={canEdit} statusPill={<StatusPill status={platforms[platform]?.status ?? "off"} />} />
          ))}
        </div>
        <p className="pt-2 text-[11px] font-medium uppercase tracking-[1.1px] text-section">{t("morePlatforms")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(t.raw("otherPlatforms") as string[]).map((name) => (
            <div key={name} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
              <span className="text-sm font-medium text-ink">{name}</span>
              <span className="text-xs text-ink-subtle">{t("comingSoon")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiCard({ apiKey, canEdit, apiBaseUrl }: { apiKey: { prefix: string; lastUsedAt: string | null } | null; canEdit: boolean; apiBaseUrl: string }) {
  const t = useTranslations("settings.publishing");
  const format = useFormatter();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <IntegrationCard icon={<Code2 className="size-5" />} name={t("api.name")} description={t("api.description")} status={apiKey ? "connected" : "off"}>
      {newKey && (
        <div className="mb-4 rounded-xl border border-success-border bg-success-bg p-4">
          <p className="text-sm font-medium text-success">{t("api.newKey")}</p>
          <div className="mt-2 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-ink">{newKey}</code>
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(newKey).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? t("api.copied") : t("api.copy")}
            </Button>
          </div>
        </div>
      )}
      {apiKey && (
        <p className="text-sm text-ink-secondary">
          {t("api.active", { prefix: apiKey.prefix, lastUsed: apiKey.lastUsedAt ? format.dateTime(new Date(apiKey.lastUsedAt), { dateStyle: "medium", timeStyle: "short" }) : t("api.neverUsed") })}
        </p>
      )}
      <p className="mt-3 text-sm text-ink-secondary">{t("api.docs")}</p>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-canvas p-3 font-mono text-xs text-ink">{`curl ${apiBaseUrl}/v1/articles \\\n  -H "X-API-Key: <your key>"`}</pre>
      <p className="mt-3 text-xs text-ink-subtle">{t("api.note")}</p>
      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => startTransition(async () => setNewKey((await generateApiKey()).key))}>
            {apiKey ? t("api.regenerate") : t("api.generate")}
          </Button>
          {apiKey && (
            <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => { await revokeApiKey(); setNewKey(null); })}>
              {t("api.revoke")}
            </Button>
          )}
        </div>
      )}
    </IntegrationCard>
  );
}

function WebhookCard({ connection, canEdit }: { connection: Connection; canEdit: boolean }) {
  const t = useTranslations("settings.publishing");
  const [editing, setEditing] = useState(!connection);
  const [url, setUrl] = useState(connection?.config.url ?? "");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <IntegrationCard icon={<Webhook className="size-5" />} name={t("webhook.name")} description={t("webhook.description")} status={connection?.status ?? "off"}>
      {connection?.lastError && <p className="mb-3 text-sm text-[#9A3412]">{t("lastError", { error: connection.lastError })}</p>}
      {editing && canEdit ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await saveWebhook({ url, token });
              if ("error" in result && result.error) setMessage({ ok: false, text: result.error });
              else {
                setMessage(null);
                setEditing(false);
                setToken("");
              }
            });
          }}
        >
          <label className="block text-sm font-medium text-ink" htmlFor="webhook-url">
            {t("webhook.url")}
            <input id="webhook-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("webhook.urlPlaceholder")} className={fieldClass} required />
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="webhook-token">
            {t("webhook.token")}
            <input id="webhook-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} className={fieldClass} required minLength={8} />
          </label>
          <p className="text-xs text-ink-subtle">{t("webhook.expect", { example: '{"success": true, "link": "https://…"}' })}</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{t("save")}</Button>
            {connection && <Button type="button" variant="outline" onClick={() => setEditing(false)}>{t("cancel")}</Button>}
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {connection && <p className="truncate font-mono text-xs text-ink-secondary">{connection.config.url}</p>}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {connection ? (
                <>
                  <Button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await testWebhook();
                        setMessage(result.ok ? { ok: true, text: `${t("webhook.testOk")}${result.url ? ` ${t("webhook.testLink", { link: result.url })}` : ""}` } : { ok: false, text: result.error });
                      })
                    }
                  >
                    {t("webhook.test")}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(true)}>{t("manage")}</Button>
                  <Button variant="ghost" disabled={pending} onClick={() => startTransition(() => disconnectIntegration("webhook"))}>{t("disconnect")}</Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>{t("connect")}</Button>
              )}
            </div>
          )}
        </div>
      )}
      {message && <p className={cn("mt-3 text-sm", message.ok ? "text-success" : "text-[#9A3412]")}>{message.text}</p>}
    </IntegrationCard>
  );
}

function WordpressCard({ connection, canEdit }: { connection: Connection; canEdit: boolean }) {
  const t = useTranslations("settings.publishing");
  const [editing, setEditing] = useState(false);
  const [siteUrl, setSiteUrl] = useState(connection?.config.siteUrl ?? "");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <IntegrationCard icon={<Globe className="size-5" />} name={t("wordpress.name")} description={t("wordpress.description")} status={connection?.status ?? "off"}>
      {connection?.lastError && <p className="mb-3 text-sm text-[#9A3412]">{t("lastError", { error: connection.lastError })}</p>}
      {editing && canEdit ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await saveWordpress({ siteUrl, username, appPassword });
              if ("error" in result && result.error) setMessage({ ok: false, text: result.error });
              else {
                setMessage({ ok: true, text: t("wordpress.verified") });
                setEditing(false);
                setAppPassword("");
              }
            });
          }}
        >
          <label className="block text-sm font-medium text-ink" htmlFor="wp-url">
            {t("wordpress.siteUrl")}
            <input id="wp-url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://yoursite.com" className={fieldClass} required />
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="wp-user">
            {t("wordpress.username")}
            <input id="wp-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" className={fieldClass} required />
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor="wp-password">
            {t("wordpress.appPassword")}
            <input id="wp-password" type="password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} autoComplete="off" className={fieldClass} required />
          </label>
          <p className="text-xs text-ink-subtle">{t("wordpress.help")}</p>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{t("save")}</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>{t("cancel")}</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {connection && <p className="truncate font-mono text-xs text-ink-secondary">{connection.config.siteUrl}</p>}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setEditing(true)}>{connection ? t("manage") : t("connect")}</Button>
              {connection && <Button variant="ghost" disabled={pending} onClick={() => startTransition(() => disconnectIntegration("wordpress"))}>{t("disconnect")}</Button>}
            </div>
          )}
        </div>
      )}
      {message && <p className={cn("mt-3 text-sm", message.ok ? "text-success" : "text-[#9A3412]")}>{message.text}</p>}
    </IntegrationCard>
  );
}
