import { languageFlag } from "@/lib/languages";
import { cn } from "@/lib/utils";

/** Round flag for a site language. */
export function LanguageFlag({ language, className }: { language: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-5 shrink-0 place-items-center overflow-hidden rounded-full text-[15px] leading-none", className)}
    >
      {languageFlag(language)}
    </span>
  );
}
