import { SettingsNav } from "@/components/settings/settings-nav";

export default function AgencySettingsLayout({ children }: LayoutProps<"/[locale]/clients/settings">) {
  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:flex-row md:px-12 md:py-11">
      <SettingsNav mode="agency" />
      <div className="min-w-0 max-w-[820px] flex-1">{children}</div>
    </div>
  );
}
