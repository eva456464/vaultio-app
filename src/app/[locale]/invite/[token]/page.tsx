import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";
import { AcceptInviteButton, SignOutButton } from "@/components/invite/invite-actions";
import { Link } from "@/i18n/navigation";
import { isGoogleSignInEnabled } from "@/server/auth";
import { getBrand, getSession } from "@/server/context";
import { findInvitation } from "@/server/invites";

export default async function InvitePage({ params, searchParams }: PageProps<"/[locale]/invite/[token]">) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const [t, tTeam, brand, session, invite] = await Promise.all([getTranslations("invite"), getTranslations("settings.team"), getBrand(), getSession(), findInvitation(token)]);

  let body: React.ReactNode;
  if (invite.kind !== "open") {
    body = (
      <>
        <p className="text-[15px] text-ink">{invite.kind === "missing" ? t("missing") : t(invite.kind, { workspace: invite.workspace })}</p>
        <Link href="/" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink text-[15px] font-medium text-white hover:bg-ink/90">
          {t("goToApp")}
        </Link>
      </>
    );
  } else {
    const header = (
      <>
        <h1 className="text-page-title font-semibold tracking-[-0.025em] text-ink">{t("title", { workspace: invite.workspace })}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{t("subtitle", { workspace: invite.workspace, brand: brand.name })}</p>
        <p className="mt-3 inline-flex rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink-secondary">{t("invitedAs", { role: tTeam(`roles.${invite.role}`), email: invite.email })}</p>
      </>
    );
    if (!session) {
      const mode = query.mode === "sign-in" ? "sign-in" : "sign-up";
      body = (
        <>
          {header}
          <p className="mb-1 mt-6 text-sm font-semibold text-ink">{mode === "sign-in" ? t("signInToJoin") : t("createAccount")}</p>
          <AuthForm mode={mode} brandName={brand.name} googleEnabled={isGoogleSignInEnabled} invite={{ token, email: invite.email }} />
        </>
      );
    } else if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
      body = (
        <>
          {header}
          <p className="mt-6 rounded-xl bg-[#FDF3E2] p-3 text-sm text-[#8A6320]">{t("wrongAccount", { email: session.user.email, invited: invite.email })}</p>
          <SignOutButton />
        </>
      );
    } else {
      body = (
        <>
          {header}
          <AcceptInviteButton token={token} />
        </>
      );
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="size-10 rounded-[10px] object-contain" />
          )}
          <span className="font-heading text-xl font-semibold tracking-tight text-ink">{brand.name}</span>
        </div>
        <div className="card p-8">{body}</div>
      </div>
    </main>
  );
}
