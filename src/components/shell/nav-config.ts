import {
  ChartColumn,
  FileChartColumn,
  FileText,
  HeartPulse,
  LayoutGrid,
  Link,
  MessageSquare,
  ReceiptText,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavLeaf = { key: string; href: string };
export type NavItem = {
  key: string;
  icon: LucideIcon;
  href?: string;
  children?: NavLeaf[];
  /** Extra path prefixes that keep this item highlighted. */
  match?: string[];
};
export type NavSection = { label?: string; items: NavItem[] };

export const SITE_NAV: NavSection[] = [
  {
    items: [
      { key: "overview", icon: LayoutGrid, href: "/dashboard/overview" },
      { key: "blogContent", icon: FileText, href: "/dashboard/content-plan", match: ["/dashboard/articles"] },
      { key: "backlinks", icon: Link, href: "/dashboard/backlink-exchange" },
      { key: "siteHealth", icon: HeartPulse, href: "/dashboard/geo-audit" },
      {
        key: "socials",
        icon: MessageSquare,
        children: [
          { key: "reddit", href: "/dashboard/socials?tab=reddit" },
          { key: "quora", href: "/dashboard/socials?tab=quora" },
        ],
      },
      { key: "reporting", icon: FileChartColumn, href: "/dashboard/reporting" },
    ],
  },
  {
    label: "analytics",
    items: [
      {
        key: "aiVisibility",
        icon: Sparkles,
        children: [
          { key: "aiVisibilityOverview", href: "/dashboard/ai-visibility" },
          { key: "prompts", href: "/dashboard/ai-visibility?tab=prompts" },
          { key: "brandsMentioned", href: "/dashboard/ai-visibility?tab=brands-mentioned" },
          { key: "sources", href: "/dashboard/ai-visibility?tab=sources" },
        ],
      },
      {
        key: "siteTraffic",
        icon: ChartColumn,
        children: [
          { key: "allTraffic", href: "/dashboard/analytics/ga4" },
          { key: "aiSearchTraffic", href: "/dashboard/analytics/ai-traffic" },
          { key: "googleTraffic", href: "/dashboard/analytics/google-traffic" },
        ],
      },
    ],
  },
  {
    items: [{ key: "settings", icon: Settings, href: "/dashboard/settings/account", match: ["/dashboard/settings"] }],
  },
];

export const AGENCY_NAV: NavSection[] = [
  {
    label: "clientManagement",
    items: [
      { key: "clients", icon: Users, href: "/clients" },
      { key: "invoices", icon: ReceiptText, href: "/clients/invoices" },
      { key: "settings", icon: Settings, href: "/clients/settings/profile", match: ["/clients/settings"] },
    ],
  },
];

export type ShellMode = "site" | "agency";
export const NAV_BY_MODE: Record<ShellMode, NavSection[]> = { site: SITE_NAV, agency: AGENCY_NAV };
