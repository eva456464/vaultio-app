<!-- Source: https://www.babylovegrowth.ai/docs/integrations/ghost -->

Integrations

# Ghost

Connect BabyLoveGrowth to Ghost with Admin and Content API keys, then publish on auto-pilot.

The Ghost integration lets BabyLoveGrowth publish articles directly to your Ghost site. Once connected, every newly generated article is published automatically (live or as a draft, your choice).

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect Ghost](#how-to-connect-ghost)

Open **Settings → Publishing**, find **Ghost** under **Website platforms**, and click **Connect** to launch the setup wizard. The wizard walks you through 4 short steps, mirrored below.

Already connected? The Ghost card shows a **Connected** badge. Click **Manage** to update your credentials or publish settings at any time.

### [What You Need](#what-you-need)

- Admin access to your Ghost site (Ghost(Pro) or self-hosted)
- A custom integration in Ghost (created in the steps below)
- Your Ghost Site URL, Admin API Key, and Content API Key

### [Open your Ghost dashboard](#open-your-ghost-dashboard)

In the wizard, click **Open Ghost Dashboard** to open your Ghost admin in a new tab, then sign in.

### [Open Ghost Settings](#open-ghost-settings)

In your Ghost dashboard, follow **Settings → Integrations → Custom Integrations**. Then:

1. Click **Add custom integration**
2. Name it anything, e.g. "Blog Sync"

### [Paste your credentials](#paste-your-credentials)

All three values are on the same screen in Ghost. Copy each one and paste it into the wizard:

- **Ghost Site URL (API URL)**
- **Admin API Key**
- **Content API Key**

You need both API keys. The Admin key allows publishing; the Content key allows reading.

### [Blog publishing](#blog-publishing)

Set an optional **Author Name** and choose how articles should be published under **Publish Settings**:

- **Publish Immediately**: articles go live as soon as they're generated
- **Draft**: articles are saved as drafts for you to review first

Click **Connect** to finish. You'll see the **Ghost connected!** screen.

## [Publishing & Verifying](#publishing--verifying)

With **Automatically Publish** on (toggle at the top of the Integrations page), new articles publish to Ghost on their own. To verify the connection right away:

1. Go to your **Content Plan**
2. Publish or re-publish any article
3. In Ghost Admin, go to **Posts**
4. You'll see the article appear there

![Content Plan with the Publish action on an article](https://www.babylovegrowth.ai/_next/static/media/content-plan-publish.233bae2c.png)

## [Troubleshooting & FAQ](#troubleshooting--faq)

Invalid keys or URL?

Re-copy the API URL, Admin API Key, and Content API Key from the custom integration in Ghost. Make sure you've copied all three correctly.

Publish fails?

Ensure both keys are correct and the site URL points to your Ghost API URL. Check that your Ghost site is accessible and not under maintenance.

Connection test succeeds but publishing fails?

Verify that your Admin API Key has the correct permissions. Try regenerating the custom integration in Ghost.

What's the difference between Admin and Content API keys?

The **Admin API Key** allows creating and publishing posts. The **Content API Key** allows reading published content. Both are required.

Can I set a custom author name?

Yes. Enter an author name in Step 4, and it will be used for all published articles. Leave blank to use Ghost's default author.

Will articles go live immediately?

Only if you choose **Publish Immediately**. Choose **Draft** to review in Ghost before going live.

Do I need Ghost(Pro) or can I use self-hosted?

Both Ghost(Pro) and self-hosted Ghost installations work. Just ensure your API URL is correct for your setup.

What if I regenerate my API keys?

The old keys stop working immediately. Paste the new keys via **Manage** to restore the connection.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[Wix

Connect BabyLoveGrowth to Wix with your Site ID and an API key, then publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/wix)[Framer

Connect BabyLoveGrowth to Framer via the official plugin and import articles in a few clicks.](https://www.babylovegrowth.ai/docs/integrations/framer)
