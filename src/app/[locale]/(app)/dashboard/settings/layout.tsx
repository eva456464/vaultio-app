import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: LayoutProps<"/[locale]/dashboard/settings">) {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:flex-row md:px-12 md:py-11">
      <SettingsNav />
      <div className="min-w-0 max-w-[820px] flex-1">{children}</div>
    </div>
  );
}
