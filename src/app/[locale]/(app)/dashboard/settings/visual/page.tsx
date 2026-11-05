import { InstructionsEditor } from "@/components/settings/instructions-editor";
import { VisualForm, type VisualSettings } from "@/components/settings/sections/visual-form";
import { SettingsTitle } from "@/components/settings/settings-title";
import { asBodyStyle, asCoverStyle, asInfographicStyle } from "@/lib/visuals";
import { images } from "@/server/ai/images";
import { getAppContext, getBrand } from "@/server/context";
import { safeColor } from "@/server/brand";
import { instructionsView } from "@/server/instructions";

export default async function VisualSettingsPage() {
  const context = (await getAppContext())!;
  const site = context.site!;
  const brand = await getBrand();
  const canEdit = context.member?.role === "admin";
  const cta = site.ctaSettings ?? {};
  const initial: VisualSettings = {
    heroImageStyle: asCoverStyle(site.heroImageStyle),
    bodyImageStyle: asBodyStyle(site.bodyImageStyle),
    infographicStyle: asInfographicStyle(site.infographicStyle),
    includeInfographic: site.includeInfographic,
    imageMood: site.imageMood ?? "",
    links: { enabled: cta.links?.enabled ?? false, items: cta.links?.items ?? [] },
    map: { enabled: cta.map?.enabled ?? false, address: cta.map?.address ?? "", mapsUrl: cta.map?.mapsUrl ?? "" },
    contact: { enabled: cta.contact?.enabled ?? false, phone: cta.contact?.phone ?? "", whatsapp: cta.contact?.whatsapp ?? "", email: cta.contact?.email ?? "" },
    promo: { enabled: cta.promo?.enabled ?? false },
    youtube: { enabled: site.includeYoutube, channel: site.youtubeChannel ?? "" },
  };
  return (
    <>
      <SettingsTitle section="visual" canEdit={canEdit} />
      <VisualForm
        canEdit={canEdit}
        imagesAvailable={images.available()}
        brandColor={safeColor(site.brandColor, brand.accentColor)}
        brandName={site.brandName ?? new URL(site.url).hostname}
        initial={initial}
        instructions={<InstructionsEditor field="images" canEdit={canEdit} otherHref="/dashboard/settings/writing" {...instructionsView(site, "images")} />}
      />
    </>
  );
}
