<!-- Source: https://www.babylovegrowth.ai/docs/integrations/blog-hosting -->

Integrations

# Blog Hosting

Let us host your blog on a custom subdomain with zero technical setup required.

BabyLoveGrowth can host your blog for you on your subdomain (`blog.yoursite.com`). We handle all the technical details: article publishing, styling, server-side rendering, caching, sitemap, and more. Blog hosting is 100% free to use.

**Important:** Hosting on a subdomain has the **same SEO value** as hosting on your main domain. You'll receive all backlinks and SEO benefits just as you would with any other hosting solution. Plus, your blog stays online even if you cancel your subscription.

On Blog Hosting, BabyLoveGrowth controls the base styling and mobile responsiveness. You can customize your brand logo and colors from hosting settings. [Learn more →](#customization-options)

---

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

Customize your blog with your brand logo and colors to match your website's look and feel.

### Always Online

Your blog stays online even if you cancel your subscription. Your content is preserved permanently.

---

## [Setup Instructions](#setup-instructions)

Open **Settings → Publishing** and select the **Blog Hosting** banner (under the Website platforms section) to launch the setup wizard. It takes less than a minute and has 3 short steps.

### [Host your blog with us](#host-your-blog-with-us)

The wizard shows where your blog will live: `blog.yoursite.com`. We handle hosting, SEO, sitemap, and performance. Review the preview and click **Start hosting**.

- You only add one DNS record; we handle the rest
- We render every article with your brand and ship sitemap, robots.txt, and JSON-LD
- Works with any builder: Squarespace, Bolt, Carrd, Lovable, and other no-code sites

![Blog Hosting wizard step 1: blog URL preview and Start hosting button](https://www.babylovegrowth.ai/_next/static/media/blog-hosting-wizard-start.11eac291.png)

### [Add the DNS record](#add-the-dns-record)

Copy the values shown in the wizard into your DNS provider. We detect your provider and link you straight to its DNS page. You only need one record:

1. Log in to your DNS provider (where your domain is managed)
2. Add the **CNAME** record exactly as shown:
   - **Name/Host:** `blog` (or the subdomain shown in the wizard)
   - **Type:** `CNAME`
   - **Value/Points to:** copy from the wizard
3. Save the record

DNS propagation

We verify automatically. It can take 1–2 hours to propagate. You can also click **Recheck** to verify the status.

Using Cloudflare? Disable the proxy for this record

If your domain runs through Cloudflare's proxy, it can block your blog from connecting. Fix it in 30 seconds:

1. Log in to `dash.cloudflare.com`
2. Go to your domain → DNS → Records
3. Find the CNAME record for your blog subdomain
4. Click the **orange cloud icon** so it turns **grey** (DNS only)
5. Save, and you're done.

![Blog Hosting wizard step 2: DNS record table with copyable Name, Type, and Value, and verification status](https://www.babylovegrowth.ai/_next/static/media/blog-hosting-wizard-dns.a3e68903.png)

### [Brand your blog & go live](#brand-your-blog--go-live)

Add a **display name** and **logo**. You can change these any time. Once DNS is verified, your blog is live at `blog.yoursite.com` and new articles publish automatically. Click **View blog** to open it.

Success!

Your blog is now live and every new article will publish to it automatically.

Link to `blog.yoursite.com` from your main site navigation or footer. Search engines discover your articles through your main domain and crawl new posts faster.

---

## [Customization Options](#customization-options)

Once DNS is configured and your blog is live, you can customize the appearance:

### [Brand Logo](#brand-logo)

- Upload a PNG, JPG, or WEBP image
- Recommended size: 200x200 pixels (square)
- Your logo will appear in the blog header

### [Brand Color](#brand-color)

- Choose your primary brand color using the color picker
- Enter a hex color code (e.g., `#FA5C12`)
- Used for links, buttons, and accent elements

---

## [Troubleshooting & FAQ](#troubleshooting--faq)

DNS status shows "NOT FOUND" even after adding the record

DNS propagation can take anywhere from a few minutes to a couple of hours. To verify:

1. Wait at least 15–30 minutes after adding the record
2. Double-check the CNAME record (name and value) matches the wizard exactly
3. Make sure the record type is `CNAME` and not `A` or `TXT`
4. If you use Cloudflare, confirm the proxy is off (grey cloud) for the blog subdomain
5. Click the **Recheck** button in the wizard

Can I use a different subdomain instead of "blog"?

The hosted blog is set up on `blog.yourwebsite.com` by default. If you need a different subdomain, use the **I need help** button in the wizard to contact support.

Where can I find my DNS provider?

Your DNS provider is typically where you purchased your domain (like GoDaddy, Namecheap, or Cloudflare). If you're not sure:

1. Check the nameservers for your domain using a [DNS lookup tool](https://mxtoolbox.com/SuperTool.aspx)
2. Look for emails from your domain registrar
3. Contact your IT team or web developer

BabyLoveGrowth automatically detects your DNS provider when you add the record and shows a direct link to its DNS management page.

Do I need to have an existing website to use blog hosting?

Yes, you need a registered domain name. The hosted blog is available at a subdomain of your main website (e.g., `blog.yoursite.com`).

If you don't have a domain yet, you can purchase one from providers like [Namecheap](https://www.namecheap.com), [GoDaddy](https://www.godaddy.com), or [Cloudflare](https://www.cloudflare.com/products/registrar/).

Can I customize the blog design beyond logo and colors?

The hosted blog uses a clean, professional design optimized for SEO and readability. You can currently customize:

- Brand logo
- Brand color (for links and accents)

If you need more control over design and functionality, consider one of our CMS integrations (like [WordPress](https://www.babylovegrowth.ai/docs/integrations/wordpress), [Webflow](https://www.babylovegrowth.ai/docs/integrations/webflow), or [Shopify](https://www.babylovegrowth.ai/docs/integrations/shopify)) instead.

Is SSL/HTTPS included?

Yes! SSL certificates are automatically provisioned and renewed for your hosted blog. Your blog is always served over HTTPS for security and SEO benefits.

What happens to my blog if I cancel my subscription?

**Your blog remains online even after cancellation.** All your published articles stay accessible at `blog.yourwebsite.com`, preserving your backlinks and SEO value.

Additionally:

- Your articles remain saved in BabyLoveGrowth
- You can export your articles via the API
- You can reconnect or switch to a different integration anytime

How do I update my brand logo or color?

Go back to **Settings → Publishing**, open **Blog Hosting**, and you can:

- Click your existing logo to upload a new one
- Click the color preview to pick a new brand color
- Changes take effect immediately

Does the hosted blog use server side rendering (SSR)?

Yes! All pages on your hosted blog are fully server side rendered. This means:

- Search engines receive fully rendered HTML, maximizing crawlability and indexing speed
- Pages load fast for every visitor, even on slow connections
- Social sharing previews (Open Graph, Twitter Cards) work out of the box
- No JavaScript is required for search engines to read your content

SSR is one of the key reasons the BabyLoveGrowth hosted blog delivers strong SEO performance without any configuration on your end.

---

## [Need Help?](#need-help)

If you run into any issues or have questions:

- Click the **"I need help"** button in the Blog Hosting wizard
- Contact support via the chat icon in the bottom-right of any page
- Email us at [[email protected]](https://www.babylovegrowth.ai/cdn-cgi/l/email-protection#f98a8c8989968b8db99b989b8095968f9c9e8b968e8d91d79890)

Our team is here to help you get your blog up and running quickly!

[Product Catalog

Add your products so they can be featured in generated article text and images to drive sales.](https://www.babylovegrowth.ai/docs/dashboard/product-catalog)[WordPress

Connect BabyLoveGrowth to WordPress with our official plugin and publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/wordpress)
