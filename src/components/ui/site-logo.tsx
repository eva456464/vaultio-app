import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteLogo({ url, className }: { url: string | null; className?: string }) {
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-[70%] object-contain" />
      ) : (
        <Globe className="size-5 text-ink-subtle" />
      )}
    </span>
  );
}
