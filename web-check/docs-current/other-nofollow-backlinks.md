<!-- Source: https://www.babylovegrowth.ai/docs/other/nofollow-backlinks (fetched 2026-11-05) -->

Other

# Fixing a nofollow backlink

Why you see a "no-follow" warning in your backlink dashboard and how to fix it.

## [Why it matters](#why-it-matters)

You're linking to another site, but the link is set to **"nofollow"**, a special setting that tells Google and other search engines to ignore the link. Nofollow links don't pass SEO value to the site you link to, so please switch them to normal links. We recheck your links about once a week.

## [What you need to do](#what-you-need-to-do)

Change the link from "nofollow" back to a normal link (called "dofollow"). This is usually just flipping one switch in your website settings. It takes 2 minutes.

Don't worry about telling us after you fix it.

We automatically recheck your links about once a week. Once we see the link is fixed, the warning disappears.

## [What the problem looks like](#what-the-problem-looks-like)

**Bad (nofollow):** Search engines ignore this link

``` min-w-full
<a href="https://example.com" rel="nofollow">Click here</a>
```

**Good (normal link):** Search engines follow this link

``` min-w-full
<a href="https://example.com">Click here</a>
```

The issue is that invisible `rel="nofollow"` part. It's usually added automatically by a plugin or setting. You didn't put it there on purpose.

## [How to fix it on WordPress](#how-to-fix-it-on-wordpress)

Good news: this is usually caused by **one plugin setting** that's making ALL your outgoing links nofollow. Turn it off and all your links are fixed instantly.

### [If you use Rank Math (most common)](#if-you-use-rank-math-most-common)

Rank Math has one switch that adds nofollow to every external link. Here's how to turn it off:

1.  Log into your WordPress dashboard
2.  In the left menu, click **Rank Math SEO**
3.  Click **General Settings**
4.  Click the **Links** tab
5.  Find the switch labeled **Nofollow External Links**
6.  **Turn it OFF** (it should be gray/disabled)
7.  Click **Save Changes** at the bottom

**That's it!** All your external links are now normal links. You don't need to edit each post individually.

**What you should see:**

- Before: Switch is ON/blue
- After: Switch is OFF/gray

### [If you use "WP External Links" or "External Links" plugin](#if-you-use-wp-external-links-or-external-links-plugin)

This plugin's job is to add nofollow to outgoing links. You need to tell it to stop:

1.  In your WordPress dashboard, look for **External Links** in the left menu
2.  Click it to open the plugin settings
3.  Find the option **Add nofollow** (or "Nofollow External Links")
4.  **Turn it OFF**
5.  Also turn off any options mentioning "sponsored" or "ugc"
6.  Click **Save**

All your external links are now fixed.

### [If you use Yoast SEO or All in One SEO](#if-you-use-yoast-seo-or-all-in-one-seo)

These plugins don't have a global switch. They add nofollow to individual links. You need to edit the specific post with the link:

1.  Go to **Posts** or **Pages** and open the article that has the link
2.  Find the link and click it
3.  In the small popup, click **Advanced** (or the gear icon)
4.  Look for a toggle/checkbox labeled **nofollow**
5.  **Turn it OFF** (uncheck it)
6.  Also check for a **sponsored** toggle. Turn that OFF too
7.  Click **Update** to save the post

**Example:** If you see a blue toggle next to "nofollow", click it so it turns gray.

### [Still showing nofollow?](#still-showing-nofollow)

Your theme or another plugin might be adding it. Here's what to do:

1.  **Quick test:** Temporarily turn off ALL your SEO and link-related plugins (one at a time), then check if the nofollow disappears. When it disappears, you found the plugin causing it.
2.  **Need help?** Contact your web developer and tell them: "One of my external links has `rel="nofollow"` and I can't find which plugin is adding it. Can you search the theme for `nofollow`?"

## [How to fix it on Shopify](#how-to-fix-it-on-shopify)

Shopify makes links normal by default, so if yours has nofollow, some plugin probably added it.

### [Option 1: An SEO app](#option-1-an-seo-app)

If you use an app that manages SEO or meta tags (like "NoIndexly" or similar), it might be adding nofollow automatically:

1.  Go to your Shopify admin
2.  Click **Apps** in the left menu
3.  Open your SEO app
4.  Look for settings about **"nofollow"** or **"external links"**
5.  **Turn OFF** any option that adds nofollow to external links
6.  Save the settings

### [Option 2: Your theme's code](#option-2-your-themes-code)

If options 1 didn't work, your theme itself is adding nofollow. This is technical. You'll likely need help:

**What to tell your developer:** "My Shopify theme is adding `rel="nofollow"` to external links. Can you search the theme code for `nofollow` and remove it?"

**If you want to try yourself:**

1.  Go to **Online Store → Themes**
2.  Click the **⋯** (three dots) next to your theme
3.  Click **Edit code**
4.  Use the search box to search for `nofollow` across all files
5.  When you find it, remove the code that's adding it
6.  Click **Save**

Editing theme code can break your site if you're not sure what you're doing. Back up your theme first or contact a developer.

## [How to verify it's fixed](#how-to-verify-its-fixed)

Want to double-check? Here's how to see if the nofollow is really gone:

1.  **Visit your published article** (the live page on your website, not the editor)
2.  **Find the link** you just fixed
3.  **Right-click on the link** and choose **Inspect** (or "Inspect Element")
4.  A panel opens showing the HTML code
5.  **Look at the link code**. You should see something like:

    ``` min-w-full
    <a href="https://example.com">Click here</a>
    ```
6.  **Check:** There should be NO `rel="nofollow"` in the code

**If you see `rel="nofollow"` is gone:** ✅ You fixed it! We'll pick up the change at our next check, about once a week.

**If you still see `rel="nofollow"`:** Try clearing your browser cache (Ctrl+F5 or Cmd+Shift+R) and check again. If it's still there, go back through the steps above or contact your developer.

------------------------------------------------------------------------

## [Quick summary](#quick-summary)

1.  **The problem:** A plugin/setting is adding `rel="nofollow"` to your link
2.  **What to do:** Turn off the plugin setting that's adding it (usually one switch in Rank Math, External Links plugin, or your SEO app)
3.  **After you fix it:** We recheck your links about once a week, no need to tell us
4.  **Verify:** Right-click the link on your live site → Inspect → confirm no `rel="nofollow"` in the code

Need help? Contact your web developer and show them this page.

[](/docs/resources)

Free resources

Our three free academies on getting found on Google and cited by ChatGPT, Claude, Gemini and Perplexity.
