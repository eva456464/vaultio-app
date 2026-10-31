import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getFormatter } from "next-intl/server";
import type { ReactNode } from "react";
import { db } from "@/db";
import { productUpdates, userSettings } from "@/db/schema";
import { DELETION_GRACE_DAYS } from "@/server/account";
import { Link } from "@/i18n/navigation";
import type { AppContext, Brand } from "@/server/context";
import { DeletionBanner } from "./deletion-banner";
import { MobileNav } from "./mobile-nav";
import { ProductUpdatesBell } from "./product-updates";
import { SIDEBAR_COOKIE, Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import { WebsiteSelector } from "./website-selector";

export async function AppShell({
  mode,
  context,
  brand,
  children,
}: {
  mode: "site" | "agency";
  context: AppContext;
  brand: Brand;
  children: ReactNode;
}) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  const [updates, [settings], format] = await Promise.all([
    db.select().from(productUpdates).orderBy(desc(productUpdates.launchedAt)).limit(20),
    db.select({ deletionRequestedAt: userSettings.deletionRequestedAt }).from(userSettings).where(eq(userSettings.userId, context.user.id)),
    getFormatter(),
  ]);
  const deleteOn = settings?.deletionRequestedAt ? new Date(settings.deletionRequestedAt.getTime() + DELETION_GRACE_DAYS * 86_400_000) : null;

  const logo = (
    <Link href={mode === "agency" ? "/clients" : "/dashboard/overview"} className="grid size-10 shrink-0 place-items-center">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt={brand.name} className="size-10 rounded-[10px] object-contain" />
      ) : (
        <span className="font-heading text-lg font-bold text-ink">{brand.name.slice(0, 1)}</span>
      )}
    </Link>
  );

  const selectorProps = {
    sites: context.sites,
    currentSiteId: context.site?.id ?? null,
    agencyMode: mode === "agency",
    isAgency: Boolean(context.organization?.isAgency),
    canEdit: context.member?.role === "admin",
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-[76px] shrink-0 items-center gap-4 border-b border-line bg-header px-4 md:px-5">
        <MobileNav
          mode={mode}
          logo={logo}
          selector={<WebsiteSelector {...selectorProps} className="w-full" />}
        />
        {logo}
        <WebsiteSelector {...selectorProps} className="ml-8 hidden md:flex" />
        <div className="ml-auto flex items-center gap-2">
          <ProductUpdatesBell
            updates={updates.map((u) => ({
              id: u.id,
              title: u.title,
              body: u.body,
              linkUrl: u.linkUrl,
              launchedAt: u.launchedAt.toISOString(),
            }))}
          />
          {mode === "agency" && <UserMenu name={context.user.name} />}
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar mode={mode} initialCollapsed={collapsed} />
        <main className="min-w-0 flex-1 bg-canvas">
          {deleteOn && <DeletionBanner date={format.dateTime(deleteOn, { dateStyle: "long" })} />}
          {children}
        </main>
      </div>
    </div>
  );
}

/** Title band at the top of each page ("Good evening, Damian", "Blog content"...). */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="border-b border-line bg-canvas px-5 py-8 md:px-12 md:py-11">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.025em] text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-secondary">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="space-y-8 px-4 py-8 md:px-12">{children}</div>;
}
