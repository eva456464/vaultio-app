import { WritingForm, type WritingSettings } from "@/components/settings/sections/writing-form";
import { asEnglishType, SELECTABLE_ARTICLE_TYPES } from "@/lib/writing";
import { SettingsTitle } from "@/components/settings/settings-title";
import { getAppContext } from "@/server/context";

export default async function WritingSettingsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const canEdit = context.member?.role === "admin";
  return (
    <>
      <SettingsTitle section="writing" canEdit={canEdit} />
      <WritingForm
        canEdit={canEdit}
        isEnglish={site.selectedLanguage === "en"}
        initial={{
          rules: (site.articleInstructions ?? "").split("\n").map((rule) => rule.trim()).filter(Boolean),
          englishType: asEnglishType(site.englishType),
          articleLength: site.articleLength,
          allowedArticleTypes: site.allowedArticleTypes.length ? (site.allowedArticleTypes as WritingSettings["allowedArticleTypes"]) : [...SELECTABLE_ARTICLE_TYPES],
          includeRecommendedReads: site.includeRecommendedReads,
          includeCitation: site.includeCitation,
          useWwwInLinks: site.useWwwInLinks,
          useTrailingSlashInLinks: site.useTrailingSlashInLinks,
          includeTldr: site.includeTldr,
          summaryStyle: site.summaryStyle === "key_takeaways" ? "key_takeaways" : "tldr",
          includeToc: site.includeToc,
          includeSourcesSection: site.includeSourcesSection,
          includeInternalLinks: site.includeInternalLinks,
          includePerspective: site.includePerspective,
          mentionCompetitorsIfRelevant: site.mentionCompetitorsIfRelevant,
          includeJsonLd: site.includeJsonLd,
          includeFaqJsonLd: site.includeFaqJsonLd,
          authorName: site.authorName ?? "",
          articleDisclaimer: site.articleDisclaimer ?? "",
        }}
      />
    </>
  );
}
