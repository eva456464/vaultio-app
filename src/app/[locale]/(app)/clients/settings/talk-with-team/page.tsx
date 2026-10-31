import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SettingsTitle } from "@/components/settings/settings-title";

/** Links to the platform owner's booking page (SUPPORT_BOOKING_URL) and support email (SUPPORT_EMAIL). */
export default async function TalkWithTeamPage() {
  const t = await getTranslations("settings.talk");
  const booking = process.env.SUPPORT_BOOKING_URL;
  const email = process.env.SUPPORT_EMAIL;
  return (
    <>
      <SettingsTitle section="talk-with-team" />
      <p className="-mt-4 mb-6 text-[15px] text-ink-secondary">{t("subtitle")}</p>
      <section className="card flex flex-col items-center px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-brand">
          <CalendarClock className="size-6" />
        </span>
        <h2 className="mt-4 font-sans text-lg font-semibold text-ink">{t("cardTitle")}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{booking ? t("cardBody") : t("notSet")}</p>
        {booking && (
          <a href={booking} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-white hover:bg-ink/90">
            {t("button")}
          </a>
        )}
        {email && <p className="mt-4 text-sm text-ink-secondary">{t.rich("email", { email, link: (chunks) => <a href={`mailto:${email}`} className="font-medium text-ink underline">{chunks}</a> })}</p>}
      </section>
    </>
  );
}
