import { redirect } from "@/i18n/navigation";
import { getBrand, getSession } from "@/server/context";

export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (await getSession()) redirect({ href: "/", locale });
  const brand = await getBrand();

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="size-10 rounded-[10px] object-contain" />
          )}
          <span className="font-heading text-xl font-semibold tracking-tight text-ink">{brand.name}</span>
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </main>
  );
}
