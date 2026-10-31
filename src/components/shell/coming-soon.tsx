import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "./app-shell";

/** Placeholder for sections that are still being rebuilt. */
export async function ComingSoon({ titleKey }: { titleKey: string }) {
  const [tNav, tCommon] = await Promise.all([getTranslations("nav"), getTranslations("common")]);
  return (
    <>
      <PageHeader title={tNav(titleKey as "overview")} />
      <PageBody>
        <section className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-canvas text-ink-subtle">
            <Construction className="size-6" strokeWidth={1.5} />
          </span>
          <p className="mt-4 max-w-md text-[15px] text-ink-secondary">{tCommon("comingSoon")}</p>
        </section>
      </PageBody>
    </>
  );
}
