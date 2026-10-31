<!-- Source: https://www.babylovegrowth.ai/docs/integrations/framer -->

Integrations

# Framer

Connect BabyLoveGrowth to Framer via the official plugin and import articles in a few clicks.

The Framer integration syncs articles to your Framer CMS via our official plugin. Import your articles into a Framer Collection and build beautiful blog layouts with Framer's visual design tools.

Framer does not auto-publish

Unlike other CMS integrations, Framer can't publish on its own. To bring in new articles, re-open the plugin in Framer and click **Import Articles** again.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect Framer](#how-to-connect-framer)

Open **Settings → Publishing**, find **Framer** under **Website platforms**, and click **Connect** to launch the setup wizard. The wizard walks you through 6 short steps, mirrored below.

Already connected? The Framer card shows a **Connected** badge. Click **Manage** to copy your API key again at any time.

### [Before you start](#before-you-start)

The wizard opens with a quick checklist. You'll need:

- A Framer site with CMS capabilities (a plan that includes the CMS)
- The ability to edit and publish your Framer project

No code required. Everything happens in the Framer plugin.

### [Install and activate the plugin](#install-and-activate-the-plugin)

1. In the wizard, click **Open the BabyLoveGrowth plugin** to open the official plugin page (direct link: [framer.com/community/marketplace/plugins/babylovegrowth](https://www.framer.com/community/marketplace/plugins/babylovegrowth)). You can also find it inside Framer via the **Plugins** menu in the top toolbar → search **“BabyLoveGrowth”**.
2. Click **Install** and choose the **Framer project** to add it to.
3. Open the plugin from the **Plugins** menu. It appears in a panel on the right, ready for the next step.

### [Get your BLG API key](#get-your-blg-api-key)

Click **Generate API Key** in the wizard, then **Copy** it. You paste it into the Framer plugin in the next step.

Keep your API key secure and never share it publicly.

### [Connect the plugin & import articles](#connect-the-plugin--import-articles)

In the Framer plugin:

1. **Paste the API key** you just copied from your dashboard
2. When prompted, **name the CMS collection** the plugin creates, e.g. **"Blog"** or **"Articles"**. This is where your articles will live in Framer's CMS.
3. Click **Next**, then **Import Articles**

All your BabyLoveGrowth articles are imported into your Framer CMS collection.

### [Build your blog pages in Framer](#build-your-blog-pages-in-framer)

Your articles are in Framer. Now create pages to display them:

1. Open the **Pages** panel (left sidebar), click the **+**, and choose **New CMS Page**.
2. Select the collection you named earlier (e.g. "Blog"), then choose the **Index** template. This becomes your blog listing page that shows all articles.
3. Add another page: **+ → New CMS Page** → the **same collection** → choose the **Detail** template (Framer usually names it `/blog/:slug`). This is the individual article page.
4. On both pages, **bind the elements** to your CMS fields (title, cover image, and a **Formatted Text** element for the content), then style and **publish** your Framer site.

New to Framer's CMS? This short lesson walks through Index and Detail pages: [Framer Academy: CMS pages](https://www.framer.com/academy/lessons/cms-pages-dynamic-content).

### [You're all set](#youre-all-set)

The final step confirms the connection and lists how to verify it. Remember Framer is **pull-based**: it doesn't auto-publish. To bring in new articles, re-open the plugin in Framer and click **Import Articles** again.

Not seeing your articles? Use **Chat with support** on this step (or the chat icon in the bottom-right corner).

## [Importing New Articles](#importing-new-articles)

Because Framer doesn't auto-publish, you bring in new content manually. To verify the connection and sync new articles:

1. Go to your **Content Plan** and publish / re-publish any article
2. In Framer, re-open the plugin and click **Import Articles**
3. Your article appears in your Framer CMS collection

## [Tips & Best Practices](#tips--best-practices)

- Name your collection clearly (e.g. "Blog" or "Articles") so templates are easy to map
- After importing, you can reorder or filter posts within your Framer CMS pages
- Use Framer's visual editor to customize the design of your blog index and detail pages
- Re-run Import Articles in the plugin whenever you want to pull in new articles

## [Troubleshooting & FAQ](#troubleshooting--faq)

Import fails?

Re-check your API key and ensure the plugin is installed on the correct Framer site. Regenerate the key via **Manage** if needed.

Articles not showing in Framer?

Make sure you clicked **Import Articles** in the plugin, and that your collection was created correctly.

Can I publish articles automatically to Framer?

No, auto-publishing isn't available for Framer. Re-open the plugin and click **Import Articles** to sync new content.

Can I customize the article layout?

Yes! Use Framer's visual editor to fully customize your CMS page templates and create unique blog designs.

What if I change my collection name?

You'll need to remap your CMS pages to the new collection in Framer's page settings.

Do I need a specific Framer plan?

You need a Framer plan that includes CMS capabilities to use this integration.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[Ghost

Connect BabyLoveGrowth to Ghost with Admin and Content API keys, then publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/ghost)[GoHighLevel

Connect BabyLoveGrowth to GoHighLevel with a Private Integration token and publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/gohighlevel)
