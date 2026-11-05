<!-- Source: https://www.babylovegrowth.ai/docs/integrations/shopify (fetched 2026-11-05) -->

Integrations

# Shopify

Connect BabyLoveGrowth to Shopify with a custom app and publish to your store blog on auto-pilot.

The Shopify integration lets BabyLoveGrowth publish articles directly to your Shopify store blog. Once connected, every newly generated article is published automatically, live or as a draft, your choice.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](/docs/dashboard/article-quality)

No blogs found? Check these first

If the wizard says your credentials work but there's no blog yet, create one in Shopify under **Content → Blog posts → Manage blogs → Add blog** (most stores already have the default "News" blog). Also confirm the app has **read_content** and **write_content**, and that the person who created and installed the app is the **store owner** (or a staff account allowed to create apps). **Collaborator** accounts cannot use the Dev Dashboard for this setup.

------------------------------------------------------------------------

## [How to Connect Shopify](#how-to-connect-shopify)

Open **Settings → Publishing**, find **Shopify** under **Connect Your Website**, and click **Connect** to launch the setup wizard. The wizard walks you through 10 short steps, mirrored below in more detail, and verifies your store name and credentials with Shopify as you go.

Already connected? The Shopify card shows a **Connected** badge. Click **Manage** to update your blog, author, or publish settings at any time.

### [What You Need](#what-you-need)

- **Shopify admin access** as the **store owner**, or a staff account that is allowed to create apps (Collaborator accounts cannot access the Dev Dashboard)
- Your `.myshopify.com` address (the wizard shows you exactly where to find it, and you can paste the whole address)

That's it. Articles are published to a **blog** in your Shopify store. Most stores already have the default "News" blog, and the wizard tells you if yours doesn't have one yet. The whole setup takes about 10 minutes. Your store, theme and products are never touched. This connection can only read and publish blog posts.

### [Before you start](#before-you-start)

One quick check in the wizard: confirm that you can sign in to Shopify as the **store owner** (or that your account is allowed to create apps). Tick the box to continue.

If you're not sure about permissions, ask the store owner to complete these steps, or check Shopify's help on [app permissions](https://help.shopify.com/en/manual/apps/about-apps).

### [Find your store name](#find-your-store-name)

Every Shopify store has its own `.myshopify.com` address. Open [**your Shopify domain settings**](https://admin.shopify.com/settings/domains) (the wizard has the same "Open my domain settings" button) and find the address that ends in `.myshopify.com` (e.g. `na70yq-bn.myshopify.com`).

Paste the **whole address** into the wizard if you like. It trims the `.myshopify.com` part for you. The wizard then checks with Shopify that the store exists and shows a green check when it does.

### [Create an app in the Shopify Dev Dashboard](#create-an-app-in-the-shopify-dev-dashboard)

The connection works through a small private app that you create once, no coding involved, just a few clicks. Open the [**Shopify Dev Dashboard**](https://dev.shopify.com/dashboard/). If Shopify asks you to sign in, use the same account you use for your store. Then:

1.  Click **Create app** in the top-right corner
2.  Choose **Start from Dev Dashboard**
3.  Give the app any name you like and click **Create**, or use "BabyLoveGrowth Blog Publisher" (the wizard can copy this name for you)

### [Give the app blog permissions](#give-the-app-blog-permissions)

After creating the app, you land on its configuration form. (If you don't see it, open **Versions** and start a new version.)

1.  Under **API access**, click **Select scopes**
2.  Search for **"content"** and tick both **read_content** and **write_content**

Everything else can stay exactly as it is, including the pre-filled **App URL**. This app has no visible pages, so the URL is never shown to anyone. Only if the App URL box is empty, paste `https://shopify.dev/apps/default-app-home` into it.

### [Release the version](#release-the-version)

1.  Click **Release** on the version screen
2.  The version name can stay empty. Just click **Release** again to confirm

Nothing changes on your live store yet. A release only prepares the app so it can be installed in the next step.

### [Install the app on your store](#install-the-app-on-your-store)

This step happens back in the [**Shopify Dev Dashboard**](https://dev.shopify.com/dashboard/) (not in your store admin):

1.  In the **Apps** list, click the app you just created (e.g. "BabyLoveGrowth Blog Publisher")
2.  You land on the app's **Overview** page. In the **Installs** card (top right), click **Install app**
3.  Select your store from the list and confirm the installation

**Don't see your store in the list?** The app and the store must belong to the same Shopify organization, and your account needs permission to install apps. If you're a collaborator, or the store is owned by a different account, ask the store owner to create the app and complete these steps from their account.

### [Open your app's Settings](#open-your-apps-settings)

**Heads up:** after installing, Shopify often leaves you in your store admin, but your credentials are back in the [**Dev Dashboard**](https://dev.shopify.com/dashboard/). That is a different Settings page than your store's Settings (General, Plan, Billing, Domains, …).

1.  Open your app in the Dev Dashboard and click **Settings** in its left sidebar (bottom left, below Monitoring, Logs and Versions)
2.  Find the **Client credentials** section with the **Client ID** and **Client secret** fields, and keep this tab open

### [Paste your credentials](#paste-your-credentials)

Copy both values from the Settings tab you just opened and paste them into the wizard:

- **Client ID**
- **Client secret** (you may need to reveal it first)

The wizard verifies the credentials with Shopify automatically and shows a green check when everything works. If something is off, it tells you what to fix:

- **Invalid credentials**: re-copy the full Client ID and Client secret (no extra spaces)
- **App not installed**: go back to Step 6 and finish the install, then re-check
- **Store not in the same organization**: create the app while signed in to the account that owns the store
- **No blogs**: add a blog under **Content → Blog posts → Manage blogs**, then re-check

If verification keeps failing, the wizard offers **Chat with support** so our team can help right away.

![Shopify app credentials showing Client ID and Client Secret](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-credentials-get.92145b99.png&w=3840&q=75)

### [Choose where and how to publish](#choose-where-and-how-to-publish)

Last details: pick the blog we should publish to and how new articles should appear:

- **Blog**: select the blog new articles should post to (create one in Shopify if none appears)
- **Author name**: the name shown as the post author
- **Publish behavior**: **Publish immediately** to go live, or **Save as draft** to review each article in Shopify first

Shopify has no store-wide setting for publish vs draft. It's controlled per article, and you can change your choice later via **Manage**. Click **Connect** to finish.

![Shopify wizard: select your blog, author, and publish behavior](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fshopify-wizard-blog-publishing.3fb4f8b0.png&w=3840&q=75)

### [Publish your first article](#publish-your-first-article)

With the store connected, click **Publish first article** (only shown when you already have an article ready). The wizard publishes your latest article to your Shopify blog (or creates it as a draft, depending on your choice) and shows the result.

**Still preparing your first articles?** If website setup is still running, you won't see the publish button yet. That's normal and nothing is wrong. Once articles are ready, they'll be sent to your Shopify blog automatically.

**Store shows a password page?** Unlaunched Shopify stores hide the public site behind a password (you'll see "Opening soon"). The article is still published. Open **Content → Articles** in your Shopify admin (or use the wizard's **View blog posts in Shopify admin** link) to confirm it. Once you launch the store, the public blog URL works for everyone.

From then on, new articles are sent to your Shopify blog automatically. If publishing fails for a real reason (not "no article yet"), our support team is notified and you can chat with them right away.

## [Publishing & Verifying](#publishing--verifying)

With **Automatically Publish** on (toggle at the top of the Publishing page), new articles publish to Shopify on their own. To verify the connection right away:

1.  Use **Publish first article** in the wizard, or go to your **Content Plan** and publish / re-publish any article
2.  In Shopify admin, open **Content → Articles**. You'll see the article there
3.  If your store is still password-protected, the public URL will show Shopify's password page until you launch the store. That does not mean publishing failed

![Content Plan with the Publish action on an article](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcontent-plan-publish.233bae2c.png&w=3840&q=75)

## [Tips & Best Practices](#tips--best-practices)

- Make sure your blog exists in Shopify so it appears in the Blog dropdown
- Use your `.myshopify.com` store name (not a custom domain) for the connection. Pasting the full address is fine; the wizard trims it
- **Save as draft** lets you review in Shopify before going live; **Publish immediately** makes articles live automatically
- Create the app and install it from the same Shopify organization that owns the store
- After install, always go back to the **Dev Dashboard** app Settings for Client ID / Client secret, not your store admin Settings

## [Troubleshooting & FAQ](#troubleshooting--faq)

Cannot find blog?

Create a blog in Shopify (**Content → Blog posts → Manage blogs → Add blog**), then re-check credentials in Step 8 or reload the blog dropdown in Step 9.

Don't see my store when installing?

The app and store must be in the same Shopify organization, and you need permission to install apps. Collaborators, or stores owned by a different account, usually need the store owner to create the app and install it.

Can't find Client ID / Client secret?

They live in the **Dev Dashboard** → your app → **Settings** → **Client credentials**, not in your store admin Settings page.

Connection / credential check fails?

Re-check Store Name, Client ID, and Client secret; ensure scopes **read_content** and **write_content** are enabled and the app is installed on this store. Use **Chat with support** in the wizard if you're stuck.

Published link shows a password page?

Your store isn't public yet. Confirm the article under **Content → Articles** in Shopify admin. It will be visible to everyone once you launch the store.

No "Publish first article" button?

That means there isn't an article ready yet (often because website setup is still running). Your connection is saved. Articles will publish automatically when they're ready.

Do I need a special Shopify plan?

Any plan that allows creating and installing custom apps works.

Will posts go live immediately?

Only if you choose **Publish immediately**. Choose **Save as draft** to review first.

Can I change the author name?

Yes. Set any author name in Step 9 (or via **Manage**); Shopify uses it for the post.

Which store name do I enter?

The part before `.myshopify.com` (e.g. `na70yq-bn`). Pasting the full address works too. The wizard trims it.

Need more help?

Use **Chat with support** in the wizard, or the chat icon in the bottom-right corner.

[](/docs/integrations/wordpress-com)

WordPress.com

Connect a WordPress.com site in one click and publish through WordPress.com's own API, no plugin required.

[](/docs/integrations/webflow)

Webflow

Connect BabyLoveGrowth to Webflow and publish articles on auto-pilot.
