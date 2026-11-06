import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Development only: PREVIEW_ANY_ORIGIN=1 lets a preview proxy on another address use the dev
// server (dev assets, Server Actions). Never on in production.
const previewAnyOrigin = process.env.NODE_ENV !== "production" && process.env.PREVIEW_ANY_ORIGIN === "1";

const nextConfig: NextConfig = {
  // "**.*" is any host name with a dot (Next refuses a bare "**" on purpose).
  ...(previewAnyOrigin ? { allowedDevOrigins: ["**.*"], experimental: { serverActions: { allowedOrigins: ["**.*"] } } } : {}),
  // The dashboard is per-user and per-site, so every page is rendered on request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  serverExternalPackages: ["postgres"],
  devIndicators: false,
};

export default withNextIntl(nextConfig);
