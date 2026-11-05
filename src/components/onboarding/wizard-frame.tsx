import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Onboarding page: the step on the left, a live preview of what it changes on the right (large screens). */
export function WizardFrame({
  brand,
  step,
  title,
  description,
  badge,
  children,
  preview,
}: {
  brand: { name: string; logoUrl: string | null };
  step?: string | null;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  preview?: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex min-h-dvh flex-col px-5 py-8 md:px-12 lg:px-16">
        <div className="flex items-center gap-2.5">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="size-9 rounded-[10px]" />
          )}
          <span className="font-heading text-lg font-semibold text-ink">{brand.name}</span>
        </div>
        <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center py-10">
          <div className="flex flex-wrap items-center gap-2">
            {step && <p className="text-xs font-medium uppercase tracking-[1px] text-ink-subtle">{step}</p>}
            {badge}
          </div>
          <h1 className={cn("text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink", step && "mt-2")}>{title}</h1>
          {description && <p className="mt-2 text-[15px] text-ink-secondary">{description}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </section>
      {preview && <aside className="hidden border-l border-line bg-white lg:flex lg:items-center lg:justify-center lg:p-12">{preview}</aside>}
    </main>
  );
}

export function StepActions({ children }: { children: ReactNode }) {
  return <div className="mt-7 flex flex-wrap items-center gap-3">{children}</div>;
}

export function Loading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-5" role="status">
      <span className="mt-1 size-4 shrink-0 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
      <div>
        <p className="text-[15px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-ink-secondary">{hint}</p>
      </div>
    </div>
  );
}
