"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ArticleExportMenu({ articleId }: { articleId: number }) {
  const t = useTranslations("article");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-control bg-white text-sm font-medium text-ink outline-none hover:bg-canvas">
        {t("export")}
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <a href={`/api/articles/${articleId}/export?format=md`}>{t("downloadMarkdown")}</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/articles/${articleId}/export?format=html`}>{t("exportHtml")}</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
