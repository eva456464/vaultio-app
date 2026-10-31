import { cn } from "@/lib/utils";

const FLAGS: Record<string, string> = {
  en: "🇺🇸",
  fr: "🇫🇷",
  nl: "🇳🇱",
  de: "🇩🇪",
  es: "🇪🇸",
  pt: "🇵🇹",
  it: "🇮🇹",
};

/** Round flag for a site language. */
export function LanguageFlag({ language, className }: { language: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-5 shrink-0 place-items-center overflow-hidden rounded-full text-[15px] leading-none", className)}
    >
      {FLAGS[language] ?? "🌐"}
    </span>
  );
}
