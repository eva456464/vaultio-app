import { getBrand, getAppContext } from "@/server/context";
import { AddWebsiteForm } from "@/components/clients/add-website-form";

export default async function AddWebsitePage() {
  const [context, brand] = await Promise.all([getAppContext(), getBrand()]);
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[480px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="size-10 rounded-[10px]" />
          )}
          <span className="font-heading text-xl font-semibold text-ink">{brand.name}</span>
        </div>
        <AddWebsiteForm isAgency={Boolean(context?.organization?.isAgency)} hasSites={Boolean(context?.sites.length)} />
      </div>
    </main>
  );
}
