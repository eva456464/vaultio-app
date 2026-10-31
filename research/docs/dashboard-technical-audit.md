<!-- Source: https://www.babylovegrowth.ai/docs/dashboard/technical-audit -->

Dashboard

# Site Health

Finds SEO/GEO issues that prevent proper indexing and ranking

Site Health finds issues that might be blocking Google and AI systems like ChatGPT from properly reading and ranking your site. The check runs automatically once a week, and the banner at the top tells you when the next one is due.

## [Dashboard Overview](#dashboard-overview)

![Site health dashboard showing the overall health score, page speed, LLM optimization and SEO optimization sub-scores, crawler file status, and the issues detected table](https://www.babylovegrowth.ai/_next/static/media/site-health.c652d6f0.png)

- **Health score:** Your overall score out of 100, with a verdict of Good, Needs work, or Critical. It is the average of the three sub-scores next to it.
- **Page Speed:** Average loading performance across the pages we audited.
- **LLM Optimization:** How readable your pages are for AI crawlers, weighted mostly on per-page health, with crawler files and page speed factored in.
- **SEO Optimization:** Page speed, the number of issues found, and whether your crawler files are in place.
- **Crawler files:** Status of your sitemap.xml, robots.txt, and llms.txt. Any file that is missing or misconfigured shows a **Fix** link that opens instructions.
- **Issues detected:** Every audited page with its own score and issue count. Expand a row to see that page's issues, sorted with the most severe first, and click any issue for the full explanation and fix.

Buttons you will use from this page:

- **Choose pages:** Pick up to 20 pages to prioritise in the next run. Your homepage is always included, and we fill any remaining slots automatically.
- **What we check:** The full list of checks we run against your site.
- **Share:** Creates a read-only link to your results. Anyone with the link can view it without an account, and it always shows your latest run.
- **How to fix the whole site** and **How to fix this page**: Copy a ready-made prompt covering the issues found. Send it to your developer, or paste it into Claude, Cursor, Codex, or another AI agent.
- **Recheck all issues:** Runs the check again ahead of schedule. Available once per day with an active subscription.

## [What We Check](#what-we-check)

- **LLMs.txt:** Verifies if llms.txt is present and contains correct information for AI crawlers.
- **JSON-LD Schema:** Validates structured data so search engines understand your content.
- **Robots.txt:** Checks for proper configuration allowing search engines to crawl your site.
- **Sitemap:** Validates sitemap.xml presence and structure for efficient indexing.
- **SSL Certificate:** Ensures HTTPS is properly configured for security and rankings.
- **Meta Title:** Validates length, uniqueness, and relevance of page titles.
- **Meta Description:** Checks description length, uniqueness, and relevance.
- **Canonical URL:** Validates that canonical tags are present, unique, and pointing at the right page.
- **Broken Links:** Identifies broken internal and external links hurting user experience.
- **Image Optimization:** Checks image sizes, alt text, and formats for performance.
- **Page Speed:** Analyzes Core Web Vitals and overall performance metrics.

## [Understanding Your Health Score](#understanding-your-health-score)

Your health score is the average of your Page Speed, LLM Optimization, and SEO Optimization sub-scores, out of 100. The badge under the score tells you where you stand.

- **70 and above:** Good. Minimal issues detected.
- **50 to 69:** Needs work. Several issues to address.
- **Below 50:** Critical. Needs significant attention.

Aim for 70 or higher. A perfect score is not always necessary, and the fastest way to move the number is usually fixing your crawler files and the pages with the most issues.

## [Issue Priority Levels](#issue-priority-levels)

When you expand a page, its issues are sorted by severity so the ones that matter most sit at the top.

- **High:** Issues that significantly impact SEO and should be fixed first.
- **Medium:** Issues that should be addressed soon.
- **Low:** Minor optimizations that can improve performance over time.

Each issue includes step-by-step guidance explaining what it means, why it matters, and how to fix it.

## [Common Issues and Fixes](#common-issues-and-fixes)

Missing LLMs.txt

A file that tells AI crawlers how to access your content. Create an llms.txt file in your root directory with information about your site structure and content.

Missing or Invalid Sitemap

A file that helps search engines discover all your pages. Generate a sitemap.xml file and submit it to Google Search Console.

Invalid JSON-LD Schema

Structured data that helps search engines understand your content type. Validate your schema using Google Rich Results Test and fix any syntax errors or missing required fields.

Robots.txt Blocking Crawlers

Your robots.txt may be preventing search engines from accessing important pages. Review the file and ensure you are not blocking pages you want indexed.

SSL Certificate Issues

Your site may have an expired, misconfigured, or missing SSL certificate. Ensure HTTPS is enabled and the certificate is valid. Mixed content warnings should also be resolved.

Meta Title Issues

Titles may be too long, too short, duplicated across pages, or not relevant to page content. Keep titles between 50 and 60 characters, make each page title unique, and include your primary keyword naturally.

Meta Description Issues

Descriptions may be missing, duplicated, too long, or not compelling. Write unique descriptions between 120 and 160 characters for each page. Include relevant keywords and a clear value proposition to improve click-through rates.

Broken Links

Links that return 404 errors or do not work. Update or remove broken links and use redirects for content that has moved.

Missing Alt Text

Images without descriptive alt attributes hurt accessibility and SEO. Add descriptive alt text to all images that explains what the image shows.

Slow Page Speed

Pages that take too long to load negatively impact user experience and rankings. Optimize images, enable browser caching, minimize JavaScript, and consider using a CDN.

Large Image Files

Images that are not optimized slow down your pages. Compress images, use modern formats like WebP, and serve appropriately sized images for different devices.

Missing Canonical Tags

Without canonical tags, search engines may index duplicate versions of your pages. Add canonical tags to specify the preferred URL for each page.

## [Best Practices](#best-practices)

- **Fix critical issues immediately.** Do not let them accumulate.
- **Document your fixes.** Track what you have changed and when.
- **Monitor trends.** Watch for recurring issues that may indicate deeper problems.
- **Test after fixes.** Verify improvements by running a new audit.
- **Prioritize user experience.** Many technical SEO fixes also improve how visitors experience your site.

## [Frequently Asked Questions](#frequently-asked-questions)

How often do you perform technical checks?

Once per week automatically. You can also trigger one yourself with **Recheck all issues**, which is available once per day.

What if I cannot fix an issue myself?

Some issues may require developer help. Share the audit report with your developer or contact our support team for guidance.

Do I need to fix every issue?

Focus on critical issues first. Minor notices can be addressed over time as you optimize your site.

Will fixing issues improve my rankings?

Yes. Technical SEO issues directly impact how search engines crawl, index, and rank your content. Fixing them can lead to improved rankings and better AI visibility.

Can I share the audit report?

Yes. Click **Share** in the top-right corner to get a read-only link. Anyone with it can view your score and issues without an account, and it always reflects your latest run.

[Backlinks

Track all the backlinks your website has received and given through our backlink exchange network.](https://www.babylovegrowth.ai/docs/dashboard/backlinks)[Reddit AI Agent

Learn how to review, edit, schedule, and track Reddit opportunities in Social Presence.](https://www.babylovegrowth.ai/docs/dashboard/reddit)
