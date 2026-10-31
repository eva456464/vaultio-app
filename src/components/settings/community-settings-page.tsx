import { getFormatter, getTranslations } from "next-intl/server";
import type { CommunityPlatform } from "@/db/schema";
import { getAppContext } from "@/server/context";
import { getCommunitySettings } from "@/server/queries/community";
import { CommunityForm } from "./sections/community-form";
import { SettingsTitle } from "./settings-title";

/** Settings → Reddit and Settings → Quora. */
export async function CommunitySettingsPage({ platform }: { platform: CommunityPlatform }) {
  const context = (await getAppContext())!;
  const site = context.site!;
  const [t, format, data] = await Promise.all([getTranslations("settings.community"), getFormatter(), getCommunitySettings(site, platform)]);
  const nextSearch =
    data.nextSearch?.kind === "soon"
      ? t("nextSoon")
      : data.nextSearch
        ? format.dateTime(new Date(`${data.nextSearch.day}T12:00:00Z`), { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
        : null;
  const canEdit = context.member?.role === "admin";
  return (
    <>
      <SettingsTitle section={platform} canEdit={canEdit} />
      <CommunityForm
        canEdit={canEdit}
        brand={site.brandName ?? new URL(site.url).hostname}
        data={{
          platform,
          maxKeywords: data.maxKeywords,
          active: data.active,
          suggestions: data.suggestions,
          subreddits: data.subreddits,
          replyInstructions: data.replyInstructions,
          llmAvailable: data.llmAvailable,
          nextSearch,
          upgradeAvailable: data.upgradeAvailable && canEdit,
        }}
      />
    </>
  );
}
