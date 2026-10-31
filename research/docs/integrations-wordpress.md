<!-- Source: https://www.babylovegrowth.ai/docs/integrations/wordpress -->

Integrations

# WordPress

Connect BabyLoveGrowth to WordPress with our official plugin and publish on auto-pilot.

The WordPress integration uses our official plugin to publish articles directly to your site. Once connected, articles are published automatically every day.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect WordPress](#how-to-connect-wordpress)

Open **Settings → Publishing**, find **WordPress** under **Website platforms**, and click **Connect** to launch the setup wizard. The wizard walks you through 6 short steps, mirrored below.

The WordPress card shows **Awaiting test** until you publish your first article in the final step. Once that succeeds it flips to **Connected**; if a publish fails it shows **Action needed**. Click **Manage** any time to reopen the wizard.

### [Before you start](#before-you-start)

The wizard opens with a quick checklist. Confirm both items to continue:

- **WordPress admin access**: you can sign in to your WordPress dashboard.
- **You can install plugins**: self-hosted WordPress, or a plan that supports plugins.

Can't install plugins?

Choose **Connect manually instead** at the bottom of this step to connect with a WordPress username and application password, no plugin required.

### [Enter your WordPress URL](#enter-your-wordpress-url)

Type your WordPress site address, for example `https://www.yoursite.com`. The wizard checks the format and turns the field green when it looks right, then generates a direct install link so there's no manual searching in WordPress. Click **Continue**.

![WordPress wizard: enter your WordPress site URL](https://www.babylovegrowth.ai/_next/static/media/WP-integration-step2.634216b6.png)

### [Install the plugin](#install-the-plugin)

Click **Open plugin directory** in the wizard. It opens your WordPress admin straight to the plugin page. Find the **BabyLoveGrowth Integration** plugin and click **Install Now**, then return to the wizard and click **Continue**.

![WordPress plugin search page showing BabyLoveGrowth Integration with Install Now button](https://www.babylovegrowth.ai/_next/static/media/WP-integration-step3.9d5c70ef.png)

### [Activate the plugin](#activate-the-plugin)

Once the plugin is installed, click **Activate** to turn it on. Back in the wizard, click **I've activated the plugin** to continue.

![WordPress plugins list showing the Activate button for BabyLoveGrowth Integration](https://www.babylovegrowth.ai/_next/static/media/WP-integration-step4.4bf63ace.png)

### [Paste your Integration Key](#paste-your-integration-key)

In WordPress, open **BabyLoveGrowth** in the left sidebar and copy the **Integration Key** shown there. Switch back to the wizard, paste it into the **Integration Key** field, and click **Connect**.

[VIDEO: /videos/integrations-instructions/WP-integration-step5.mp4]

### [Publish your first article](#publish-your-first-article)

On the final step, click **Publish test article**. We publish your latest article to confirm the connection works end-to-end. The status changes from **Awaiting test** to **Connected** when it succeeds. If your first article hasn't been generated yet, the wizard tells you it's on the way; your connection is already saved, so you can come back and test later.

That's it. New articles now publish automatically every day. Click **Done** to finish.

![WordPress wizard final step: connected, with the publish test article button](https://www.babylovegrowth.ai/_next/static/media/WP-integration-step6.61a2a751.png)

## [Post Settings (Categories, Author, Tags)](#post-settings-categories-author-tags)

### [Where to configure](#where-to-configure)

In your WordPress plugin settings (under your WordPress admin), set the defaults you want BabyLoveGrowth to apply when publishing new posts.

### [What you can select](#what-you-can-select)

- **Category**: choose the default WordPress category to apply to new posts.
- **Tags**: choose one or more WordPress tags to apply to new posts.
- **Author**: published posts are assigned to the WordPress user configured in the plugin. To change the author, update it in the WordPress plugin.

If you leave Category/Tags empty in the plugin, WordPress uses its default behavior (for example, an "Uncategorized" category, or no tags).

## [Troubleshooting & FAQ](#troubleshooting--faq)

Firewall / security plugin blocking publishing?

If the test publish fails, a firewall or WordPress security plugin is almost always blocking our server from reaching your site's `/wp-json` endpoint. Add our two publishing IP addresses to your plugin's allowlist (whitelist), then run the test again:

```
13.219.219.246
100.49.49.152
```

Find your plugin below for exact steps:

Cloudflare

1. Log in to Cloudflare and select your domain.
2. Go to **Security → WAF → Tools** (older dashboards: **Security → Tools**).
3. Under **IP Access Rules**, add `13.219.219.246` with action **Allow**, then add `100.49.49.152` the same way.
4. If you use **Bot Fight Mode** or a Managed Challenge, also add a WAF custom rule that **Skips** when the URI path contains `/wp-json/`.

Wordfence

1. In WordPress, go to **Wordfence → Firewall → All Options**.
2. Under **General Wordfence Options → Allowlisted IP addresses**, add both IPs (comma-separated), then **Save**.
3. Open **Wordfence → Firewall → Blocking** and delete any rule blocking these IPs.
4. Re-run the test. You can confirm it worked in **Wordfence → Tools → Live Traffic**.

Sucuri

1. Blocking happens in the Sucuri **Firewall (WAF) dashboard** at `waf.sucuri.net`, not the WordPress plugin.
2. Go to **Firewall → Access Control → Whitelist IP Addresses**.
3. Add both IPs and save.

Solid Security (formerly iThemes Security)

1. In WordPress, go to **Security → Settings**.
2. Open **Global Settings** and add both IPs to the **Authorized Hosts / Allowlist**.
3. Check **Banned Users** and make sure neither IP is listed there.

Defender (WPMU DEV)

1. In WordPress, go to **Defender → Firewall → IP Banning**.
2. Open the **IP Allowlist** tab, add both IPs, and save.
3. Make sure the IPs are not also in the IP Blocklist.

NinjaFirewall

1. In WordPress, go to **NinjaFirewall → Firewall Policies** (or **Access Control**).
2. Add both IPs to the **whitelist / “Do not block these IP addresses”** list and save.

All-In-One Security (AIOS)

1. In WordPress, go to **WP Security → Firewall → Allowlist Manager** and add both IPs (and confirm they aren't under **Blacklist Manager**).
2. Save your changes.
3. Note: AIOS applies IP rules via `.htaccess`, so they only take effect on Apache / LiteSpeed hosts (not Nginx).

Host / server firewall (mod\_security, Imunify360, cPanel…)

If you don't run any of the plugins above, the block is at your hosting or server level. Contact your host and ask them to allowlist `13.219.219.246` and `100.49.49.152` for your domain, specifically for **POST** requests to `/wp-json/`.

After allowlisting, reopen the wizard via **Manage** and click **Publish test article** again. Still stuck? Contact support from the chat icon in the bottom-right corner and we'll help.

Card shows "Action needed" or the test fails?

Regenerate the Integration Key in the WordPress plugin, reopen the wizard via **Manage**, paste the new key, and publish the first article again.

Why am I getting a WordPress authentication error?

This usually means something is blocking the connection between BabyLoveGrowth and your WordPress site. The most common causes are security plugins (like Wordfence, VPN Guard, Proxy Blockers, Akismet, or Jetpack) that block external REST API connections. Try temporarily disabling these to see if the connection works.

Firewall/security plugin blocks requests?

Add our publishing IPs (`13.219.219.246` and `100.49.49.152`) to your firewall or security plugin's allowlist. See [Firewall / security plugin blocking publishing?](#firewall) above for per-plugin steps.

Is the plugin required?

Yes. Use the official **BabyLoveGrowth Integration** plugin to get the Integration Key.

Can I reconnect if I rotate keys?

Yes. Regenerate the key in the plugin, then paste it into the wizard via **Manage**.

Do I need to change my theme?

No. We publish standard WordPress posts; your theme controls presentation.

If I edit the article, can I republish?

Yes, re-publishing updates the article.

Do I need a specific WordPress plan?

Any WordPress site that allows plugins works (self-hosted or plans with plugin support).

Need more help?

Contact support via the chat icon in the bottom-right corner.

[Blog Hosting

Let us host your blog on a custom subdomain with zero technical setup required.](https://www.babylovegrowth.ai/docs/integrations/blog-hosting)[WordPress.com

Connect a WordPress.com site in one click and publish through WordPress.com's own API, no plugin required.](https://www.babylovegrowth.ai/docs/integrations/wordpress-com)
