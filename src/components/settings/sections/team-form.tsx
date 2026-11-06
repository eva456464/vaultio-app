"use client";

import { languageName } from "@/lib/languages";
import { Check, Copy, Crown, EllipsisVertical, Link2, Mail, Plus, Shield, Trash2, User, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { cancelInvite, inviteMember, removeMember, renameWorkspace, resendInvite, updateMemberAccess, updateMemberRole } from "@/server/actions/team";
import type { TeamData } from "@/server/queries/team";
import { inputClass, SettingsCard, useSave } from "../form-kit";

type Role = "admin" | "member";
type Site = TeamData["sites"][number];

const AVATAR_COLORS = ["#2A78D6", "#C98A0B", "#7C3AED", "#0E9F6E", "#D9480F", "#0891B2", "#BE185D"];

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  const color = AVATAR_COLORS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: muted ? "#9CA3AF" : color }}>
      {initials(name)}
    </span>
  );
}

const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

function SiteChecklist({ sites, selected, onChange, disabled }: { sites: Site[]; selected: number[]; onChange: (ids: number[]) => void; disabled?: boolean }) {
  const locale = useLocale();
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {sites.map((site) => {
        const on = disabled || selected.includes(site.id);
        return (
          <li key={site.id}>
            <label className={cn("flex items-center gap-3 px-4 py-3 text-sm", disabled ? "text-ink-secondary" : "cursor-pointer text-ink hover:bg-canvas")}>
              <input
                type="checkbox"
                checked={on}
                disabled={disabled}
                onChange={() => onChange(on ? selected.filter((id) => id !== site.id) : [...selected, site.id])}
                className="size-4 accent-[#111827]"
              />
              <span className="font-medium">{host(site.url)}</span>
              <span className="text-xs text-ink-subtle">{languageName(site.language, locale)}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function RolePicker({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  const t = useTranslations("settings.team");
  return (
    <div role="radiogroup" aria-label={t("dialog.role")} className="grid grid-cols-2 rounded-xl bg-canvas p-1">
      {(["admin", "member"] as const).map((role) => (
        <button
          key={role}
          type="button"
          role="radio"
          aria-checked={value === role}
          onClick={() => onChange(role)}
          className={cn("rounded-lg py-2.5 text-sm font-medium", value === role ? "bg-white text-ink shadow-sm" : "text-ink-secondary hover:text-ink")}
        >
          {t(`roles.${role}`)}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("settings.team.dialog");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? t("copied") : label}
    </Button>
  );
}

function InviteDialog({ sites, open, onOpenChange }: { sites: Site[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("settings.team.dialog");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [websiteIds, setWebsiteIds] = useState(sites.map((site) => site.id));
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ link: string; emailed: boolean; emailError?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setEmail("");
      setRole("member");
      setWebsiteIds(sites.map((site) => site.id));
      setError(null);
      setSent(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl">
        {sent ? (
          <>
            <DialogTitle className="text-xl">{sent.emailed ? t("sentTitle") : t("linkTitle")}</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-ink-secondary">{sent.emailed ? t("sentBody", { email }) : (sent.emailError ?? t("linkBody", { email }))}</DialogDescription>
            {!sent.emailed && <p className="mt-4 break-all rounded-xl bg-canvas p-3 font-mono text-xs text-ink">{sent.link}</p>}
            <div className="mt-6 flex justify-end gap-2">
              {!sent.emailed && <CopyButton text={sent.link} label={t("copy")} />}
              <Button onClick={() => close(false)}>{t("done")}</Button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await inviteMember({ email, role, websiteIds });
                if ("error" in result) setError(result.error);
                else {
                  setError(null);
                  setSent(result);
                }
              });
            }}
          >
            <DialogTitle className="text-xl">{t("title")}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("subtitle")}</DialogDescription>
            <label htmlFor="invite-email" className="mt-6 block text-sm font-medium text-ink">{t("email")}</label>
            <input id="invite-email" type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("emailPlaceholder")} className={inputClass} />
            <p className="mt-5 text-sm font-medium text-ink">{t("role")}</p>
            <div className="mt-1.5">
              <RolePicker value={role} onChange={setRole} />
            </div>
            <p className="mt-5 text-sm font-medium text-ink">{t("access")}</p>
            <div className="mt-1.5">
              <SiteChecklist sites={sites} selected={websiteIds} onChange={setWebsiteIds} disabled={role === "admin"} />
            </div>
            <p className="mt-2 text-xs text-ink-subtle">{role === "admin" ? t("adminsAll") : t("membersSome")}</p>
            {error && <p className="mt-3 text-sm text-[#9A3412]">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={pending || !email.trim()}>{pending ? t("inviting") : t("invite")}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccessDialog({ member, sites, onClose }: { member: TeamData["members"][number]; sites: Site[]; onClose: () => void }) {
  const t = useTranslations("settings.team.accessDialog");
  const tDialog = useTranslations("settings.team.dialog");
  const [selected, setSelected] = useState(member.allWebsites ? sites.map((site) => site.id) : member.websiteIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogTitle className="text-xl">{t("title")}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-secondary">{t("subtitle", { name: member.name })}</DialogDescription>
        <div className="mt-5">
          <SiteChecklist sites={sites} selected={selected} onChange={setSelected} />
        </div>
        {error && <p className="mt-3 text-sm text-[#9A3412]">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{tDialog("cancel")}</Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateMemberAccess(member.id, selected);
                if ("error" in result) setError(result.error);
                else onClose();
              })
            }
          >
            {t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const t = useTranslations("settings.team");
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink">
      <Crown className="size-3.5 text-[#C98A0B]" aria-hidden />
      {t("roles.admin")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-ink-secondary">
      <User className="size-3.5" aria-hidden />
      {t("roles.member")}
    </span>
  );
}

function StatusBadge({ status }: { status: "active" | "pending" | "expired" }) {
  const t = useTranslations("settings.team.status");
  const style = { active: "bg-success-bg text-success", pending: "bg-[#FDF3E2] text-[#8A6320]", expired: "bg-[#F3F4F6] text-ink-secondary" }[status];
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", style)}>{t(status)}</span>;
}

export function TeamForm({ data }: { data: TeamData }) {
  const t = useTranslations("settings.team");
  const [name, setName] = useState(data.workspaceName);
  const { button } = useSave(() => renameWorkspace(name));
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<TeamData["members"][number] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: true } | { error: string }>, done?: string) =>
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        setNotice(null);
      } else {
        setError(null);
        setNotice(done ?? null);
      }
    });

  const accessLabel = (allWebsites: boolean, ids: number[]) => (allWebsites ? t("allWebsites") : t("someWebsites", { count: ids.length }));

  return (
    <div className="space-y-6">
      <p className="-mt-4 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      <SettingsCard title={t("workspaceTitle")} hint={t("workspaceHint")} footer={data.isAdmin ? button(!name.trim()) : undefined}>
        <input aria-label={t("workspaceTitle")} value={name} disabled={!data.isAdmin} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder={t("workspacePlaceholder")} className={cn(inputClass, "mt-0")} />
      </SettingsCard>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 md:p-6">
          <h2 className="font-sans text-[16px] font-semibold text-ink">{t("membersTitle")}</h2>
          {data.isAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              {data.seats.limit !== null && <span className="text-sm text-ink-secondary">{t("seats", { used: data.seats.used, limit: data.seats.limit })}</span>}
              <Button onClick={() => setInviting(true)} disabled={data.seats.full}>
                <Plus />
                {t("addMember")}
              </Button>
            </div>
          )}
        </div>
        {data.isAdmin && data.seats.full && (
          <p className="mx-5 mb-4 rounded-xl bg-canvas p-3 text-sm text-ink-secondary md:mx-6">
            {t.rich("seatsFull", { link: (chunks) => <Link href="/dashboard/settings/billing" className="font-medium text-ink underline underline-offset-2">{chunks}</Link> })}
          </p>
        )}
        {data.isAdmin && !data.emailEnabled && <p className="mx-5 mb-4 rounded-xl bg-[#EEF4FF] p-3 text-sm text-[#2A5BD7] md:mx-6">{t("noEmail")}</p>}
        {(notice || error) && (
          <p role="status" className={cn("mx-5 mb-4 text-sm md:mx-6", error ? "text-[#9A3412]" : "text-success")}>
            {error ?? notice}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-line bg-canvas text-left text-ink-secondary">
                <th className="px-5 py-3 font-medium md:px-6">{t("columns.member")}</th>
                <th className="px-3 py-3 font-medium">{t("columns.role")}</th>
                <th className="px-3 py-3 font-medium">{t("columns.access")}</th>
                <th className="px-3 py-3 font-medium">{t("columns.status")}</th>
                <th className="w-14 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.members.map((member) => (
                <tr key={`m${member.id}`}>
                  <td className="px-5 py-3.5 md:px-6">
                    <span className="flex items-center gap-3">
                      <Avatar name={member.name} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {member.name}
                          {member.isYou && <span className="ml-2 text-xs font-normal text-ink-subtle">({t("you")})</span>}
                        </span>
                        <span className="block truncate text-ink-secondary">{member.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3.5"><RoleBadge role={member.role} /></td>
                  <td className="px-3 py-3.5 text-ink-secondary">{accessLabel(member.allWebsites, member.websiteIds)}</td>
                  <td className="px-3 py-3.5"><StatusBadge status="active" /></td>
                  <td className="px-3 py-3.5 text-right">
                    {data.isAdmin && !member.isYou && (
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label={t("actions", { name: member.name })} disabled={pending} className="grid size-9 place-items-center rounded-full text-ink-secondary outline-none hover:bg-canvas hover:text-ink">
                          <EllipsisVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => run(() => updateMemberRole(member.id, member.role === "admin" ? "member" : "admin"))}>
                            {member.role === "admin" ? <User /> : <Shield />}
                            {member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                          </DropdownMenuItem>
                          {member.role === "member" && (
                            <DropdownMenuItem onSelect={() => setEditing(member)}>
                              <Link2 />
                              {t("editAccess")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-[#C4320A]"
                            onSelect={() => {
                              if (window.confirm(t("removeConfirm", { name: member.name }))) run(() => removeMember(member.id));
                            }}
                          >
                            <Trash2 />
                            {t("remove")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
              {data.invites.map((invite) => (
                <tr key={`i${invite.id}`}>
                  <td className="px-5 py-3.5 md:px-6">
                    <span className="flex items-center gap-3">
                      <Avatar name={invite.email} muted />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{invite.email.split("@")[0]}</span>
                        <span className="block truncate text-ink-secondary">{invite.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3.5"><RoleBadge role={invite.role} /></td>
                  <td className="px-3 py-3.5 text-ink-secondary">{accessLabel(invite.role === "admin", invite.websiteIds)}</td>
                  <td className="px-3 py-3.5"><StatusBadge status={invite.expired ? "expired" : "pending"} /></td>
                  <td className="px-3 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={t("actions", { name: invite.email })} disabled={pending} className="grid size-9 place-items-center rounded-full text-ink-secondary outline-none hover:bg-canvas hover:text-ink">
                        <EllipsisVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onSelect={async () => {
                            await navigator.clipboard.writeText(invite.link);
                            setError(null);
                            setNotice(t("linkCopied"));
                          }}
                        >
                          <Copy />
                          {t("copyLink")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            run(async () => {
                              const result = await resendInvite(invite.id);
                              if ("error" in result) return result;
                              return result.emailError ? { error: result.emailError } : result;
                            }, data.emailEnabled ? t("resent") : t("renewed"))
                          }
                        >
                          <Mail />
                          {data.emailEnabled ? t("resend") : t("renew")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-[#C4320A]" onSelect={() => run(() => cancelInvite(invite.id))}>
                          <X />
                          {t("cancelInvite")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.isAdmin && <InviteDialog sites={data.sites} open={inviting} onOpenChange={setInviting} />}
      {editing && <AccessDialog member={editing} sites={data.sites} onClose={() => setEditing(null)} />}
    </div>
  );
}
