import type { Metadata } from "next";
import { Fira_Code, Inter, Plus_Jakarta_Sans, Raleway } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";
import { routing } from "@/i18n/routing";
import { getBrand } from "@/server/context";
import "../globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter-var" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code" });

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const [brand, t] = await Promise.all([getBrand(), getTranslations({ locale, namespace: "meta" })]);
  return {
    title: t("title", { brand: brand.name }),
    description: t("description"),
    icons: brand.faviconUrl ? { icon: brand.faviconUrl } : undefined,
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const brand = await getBrand();
  const brandStyle = {
    "--brand-accent": brand.accentColor,
    "--brand-secondary": brand.secondaryColor,
  } as CSSProperties;

  return (
    <html
      lang={locale}
      style={brandStyle}
      className={`${jakarta.variable} ${raleway.variable} ${inter.variable} ${firaCode.variable}`}
    >
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
