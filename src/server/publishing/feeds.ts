/** The address Duda imports a website's articles from (Settings → Publishing → Duda). */
export const dudaFeedUrl = (origin: string, token: string) => `${origin.replace(/\/$/, "")}/api/integrations/rss?key=${token}&limit=10`;
