<!-- Source: https://www.babylovegrowth.ai/docs/integrations/blog-hosting (fetched 2026-11-05) -->

Integrations

# Blog Hosting

Let us host your blog on a custom subdomain with zero technical setup required.

BabyLoveGrowth can host your blog for you on your subdomain (`blog.yoursite.com`). We handle all the technical details: article publishing, styling, server-side rendering, caching, sitemap, and more.

**Important:** Hosting on a subdomain has the **same SEO value** as hosting on your main domain. You'll receive all backlinks and SEO benefits just as you would with any other hosting solution. Plus, your blog stays online even if you cancel your subscription.

On Blog Hosting, BabyLoveGrowth controls the base styling and mobile responsiveness. You can change your brand logo and blog name in the Blog Hosting wizard. Your blog uses the primary color set in **Settings → Branding**. [Learn more →](#customization-options)

------------------------------------------------------------------------

## [Why Choose BabyLoveGrowth Hosting?](#why-choose-babylovegrowth-hosting)

### No Technical Setup

Just add one DNS record and we handle everything else: no plugins, no theme configuration, no hosting headaches.

### Full SEO Benefits

Subdomains provide the same SEO value as your main domain. You get all backlinks, domain authority, and search rankings just like any other hosting solution.

### Automatic SSL & CDN

Your blog is served over HTTPS with automatic SSL certificates and global content delivery for fast loading times.

### Auto-Publishing

Articles are automatically published to your hosted blog, no manual work required.

### Branded Experience

Add your brand logo and blog name. Your blog uses the primary color set in **Settings → Branding**.

### Always Online

Your blog stays online even if you cancel your subscription. Your content is preserved permanently.

------------------------------------------------------------------------

## [Setup Instructions](#setup-instructions)

Open **Settings → Publishing**, scroll to **"Your website not supported? No problem."** and click **Add DNS record** on the **Blog Hosting** banner to launch the setup wizard. It takes less than a minute and has 3 short steps.

### [How blog hosting works](#how-blog-hosting-works)

The wizard shows where your blog will live: `blog.yoursite.com`. We handle hosting, SEO, sitemap, and performance. Review the preview and click **Get started**.

- You only add one DNS record; we handle the rest
- We render every article with your brand and ship sitemap, robots.txt, and JSON-LD
- Works with any builder: Squarespace, Bolt, Carrd, Lovable, and other no-code sites

![Blog Hosting wizard step 1: blog URL preview and Get started button](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fblog-hosting-wizard-start.11eac291.png&w=3840&q=75)

### [Add the DNS record](#add-the-dns-record)

Copy the values shown in the wizard into your DNS provider. We detect your provider and link you straight to its DNS page. You only need one record:

1.  Log in to your DNS provider (where your domain is managed)
2.  Add the **CNAME** record exactly as shown:
    - **Name/Host:** `blog` (or the subdomain shown in the wizard)
    - **Type:** `CNAME`
    - **Value/Points to:** copy from the wizard
3.  Save the record

DNS propagation

We verify automatically. It can take 1–2 hours to propagate. You can also click **Recheck** to verify the status. Still not verified? See the [DNS Troubleshooting Guide](#dns-troubleshooting-guide).

Using Cloudflare? Disable the proxy for this record

If your domain runs through Cloudflare's proxy, it can block your blog from connecting. Fix it in 30 seconds:

1.  Log in to `dash.cloudflare.com`
2.  Go to your domain → DNS → Records
3.  Find the CNAME record for your blog subdomain
4.  Click the **orange cloud icon** so it turns **grey** (DNS only)
5.  Save, and you're done.

![Blog Hosting wizard step 2: DNS record table with copyable Name, Type, and Value, and verification status](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fblog-hosting-wizard-dns.a3e68903.png&w=3840&q=75)

### [Brand your blog & go live](#brand-your-blog--go-live)

Add a **Blog Name** and **Brand Logo**. You can change these any time. Your blog uses the primary color set in **Settings → Branding**. Once DNS is verified, your blog is live at `blog.yoursite.com` and new articles publish automatically. Click **View blog** to open it.

Success!

Your blog is now live and every new article will publish to it automatically.

Link to `blog.yoursite.com` from your main site navigation or footer. Search engines discover your articles through your main domain and crawl new posts faster.

------------------------------------------------------------------------

## [Customization Options](#customization-options)

Once DNS is configured and your blog is live, open **Blog Hosting** in **Settings → Publishing** and click **Edit brand** to change:

### [Brand Logo](#brand-logo)

- Upload a PNG, JPG, or WEBP image
- Your logo will appear in the blog header

### [Blog Name](#blog-name)

- The name shown on your blog

### [Brand Color](#brand-color)

Your blog uses the primary color set in **Settings → Branding**.

------------------------------------------------------------------------

## [DNS Troubleshooting Guide](#dns-troubleshooting-guide)

Having trouble verifying your custom blog domain? Follow these steps to make sure your DNS settings are configured correctly.

### [1. Check your DNS record](#1-check-your-dns-record)

Blog Hosting needs **one CNAME record** to connect your custom blog subdomain, for example `blog.yoursite.com`. In your DNS provider, make sure you have:

- **Type:** `CNAME`
- **Name/Host:** the hostname shown in your Blog Hosting setup wizard (usually `blog`)
- **Value/Target:** the exact CNAME target provided by BabyLoveGrowth

Always copy the values directly from your Blog Hosting setup wizard.

### [2. Make sure you're using the correct domain](#2-make-sure-youre-using-the-correct-domain)

Check that you added the CNAME record to the **same domain** configured in BabyLoveGrowth. For example, if your Blog Hosting setup uses `example.com`, adding the record to `example.store` will not work.

Also make sure you're editing DNS records with the provider that manages your domain's **nameservers**. If you're not sure which one that is, see "Where can I find my DNS provider?" in the FAQ below.

### [3. Using Cloudflare?](#3-using-cloudflare)

If your domain uses Cloudflare:

1.  Open your Cloudflare dashboard
2.  Select your domain and go to **DNS → Records**
3.  Find your blog CNAME record
4.  Set its proxy status to **DNS only** (grey cloud), not **Proxied** (orange cloud)

Only change the blog CNAME record, not your entire domain.

### [4. Wait and verify your DNS](#4-wait-and-verify-your-dns)

DNS changes can take about **1–2 hours** to propagate. We recommend waiting at least 15–30 minutes before checking again. Then:

1.  Go back to **Settings → Publishing → Blog Hosting**
2.  Click **Recheck** in the setup wizard

If your DNS record is never verified, the unfinished setup is removed after 5 days; you can start it again any time.

You can also check your public DNS records with any of these tools:

- [Google Admin Toolbox Dig](https://toolbox.googleapps.com/apps/dig/)
- [WhatsMyDNS](https://www.whatsmydns.net/)
- [DNSChecker](https://dnschecker.org/)

Select **CNAME** and enter your full blog subdomain (for example `blog.yoursite.com`) to check whether the expected target is returned.

### [5. Still seeing "CNAME NOT FOUND"?](#5-still-seeing-cname-not-found)

If verification still fails:

1.  Confirm you're using the correct domain and DNS provider
2.  Double-check the CNAME hostname and target
3.  Make sure Cloudflare proxying is disabled for the blog record, if you use Cloudflare
4.  Click **Recheck** again

If everything looks correct but BabyLoveGrowth still can't detect your record, contact our support team with **Chat with support** (under **"Stuck on the DNS setup?"**) in the Blog Hosting setup wizard and share a screenshot of your DNS configuration. We'll help investigate the issue.

------------------------------------------------------------------------

## [Troubleshooting & FAQ](#troubleshooting--faq)

DNS status shows "NOT FOUND" even after adding the record

DNS propagation can take anywhere from a few minutes to a couple of hours. To verify:

1.  Wait at least 15–30 minutes after adding the record
2.  Double-check the CNAME record (name and value) matches the wizard exactly
3.  Make sure the record type is `CNAME` and not `A` or `TXT`
4.  If you use Cloudflare, confirm the proxy is off (grey cloud) for the blog subdomain
5.  Click the **Recheck** button in the wizard

Still stuck? Follow the full [DNS Troubleshooting Guide](#dns-troubleshooting-guide).

Can I use a different subdomain instead of "blog"?

The hosted blog is set up on `blog.yourwebsite.com` by default. If you need a different subdomain, use **Chat with support** (under **"Stuck on the DNS setup?"**) in the wizard to contact support.

Where can I find my DNS provider?

Your DNS provider is typically where you purchased your domain (like GoDaddy, Namecheap, or Cloudflare). If you're not sure:

1.  Check the nameservers for your domain using a [DNS lookup tool](https://mxtoolbox.com/SuperTool.aspx)
2.  Look for emails from your domain registrar
3.  Contact your IT team or web developer

BabyLoveGrowth automatically detects your DNS provider when you add the record and shows a direct link to its DNS management page.

Do I need to have an existing website to use blog hosting?

Yes, you need a registered domain name. The hosted blog is available at a subdomain of your main website (e.g., `blog.yoursite.com`).

If you don't have a domain yet, you can purchase one from providers like [Namecheap](https://www.namecheap.com), [GoDaddy](https://www.godaddy.com), or [Cloudflare](https://www.cloudflare.com/products/registrar/).

Can I customize the blog design beyond logo and colors?

The hosted blog uses a clean, professional design optimized for SEO and readability. You can currently customize:

- Brand logo
- Blog name

Your blog uses the primary color set in **Settings → Branding**.

If you need more control over design and functionality, consider one of our CMS integrations (like [WordPress](/docs/integrations/wordpress), [Webflow](/docs/integrations/webflow), or [Shopify](/docs/integrations/shopify)) instead.

Is SSL/HTTPS included?

Yes! SSL certificates are automatically provisioned and renewed for your hosted blog. Your blog is always served over HTTPS for security and SEO benefits.

What happens to my blog if I cancel my subscription?

**Your blog remains online even after cancellation.** All your published articles stay accessible at `blog.yourwebsite.com`, preserving your backlinks and SEO value.

Additionally:

- Your articles remain saved in BabyLoveGrowth
- You can export your articles via the API
- You can reconnect or switch to a different integration anytime

How do I update my brand logo or color?

Go back to **Settings → Publishing**, open **Blog Hosting**, and click **Edit brand** to upload a new logo or change your blog name. Your blog uses the primary color set in **Settings → Branding**.

Changes show on your blog within a few minutes.

Does the hosted blog use server side rendering (SSR)?

Yes! All pages on your hosted blog are fully server side rendered. This means:

- Search engines receive fully rendered HTML, maximizing crawlability and indexing speed
- Pages load fast for every visitor, even on slow connections
- Social sharing previews (Open Graph, Twitter Cards) work out of the box
- No JavaScript is required for search engines to read your content

SSR is one of the key reasons the BabyLoveGrowth hosted blog delivers strong SEO performance without any configuration on your end.

------------------------------------------------------------------------

## [Need Help?](#need-help)

If you run into any issues or have questions:

- Click **Chat with support** (under **"Stuck on the DNS setup?"**) in the Blog Hosting wizard
- Contact support via the chat icon in the bottom-right of any page
- Email us at [\[email protected\]](/cdn-cgi/l/email-protection#8ffcfaffffe0fdfbcfedeeedf6e3e0f9eae8fde0f8fbe7a1eee6)

Our team is here to help you get your blog up and running quickly!

[](/docs/dashboard/product-catalog)

Product Catalog

Add your products so they can be featured in generated article text and images to drive sales.

[](/docs/integrations/wordpress)

WordPress

Connect BabyLoveGrowth to WordPress with our official plugin and publish on auto-pilot.
