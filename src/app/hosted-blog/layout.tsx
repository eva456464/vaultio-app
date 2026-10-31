import type { ReactNode } from "react";
import "../globals.css";
import "./blog.css";

/** Root layout for blogs Vaultio hosts on clients' own subdomains (no dashboard chrome or branding). */
export default function HostedBlogRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
