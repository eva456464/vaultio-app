"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/utils";

export function UserMenu({ name }: { name: string }) {
  const t = useTranslations("header");
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-9 place-items-center rounded-full bg-[#F3F4F6] text-[13px] font-semibold text-ink outline-none">
        {initials(name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onSelect={async () => {
            await authClient.signOut();
            router.replace("/sign-in");
            router.refresh();
          }}
        >
          <LogOut />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
