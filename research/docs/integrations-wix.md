<!-- Source: https://www.babylovegrowth.ai/docs/integrations/wix -->

Integrations

# Wix

Connect BabyLoveGrowth to Wix with your Site ID and an API key, then publish on auto-pilot.

The Wix integration lets BabyLoveGrowth publish articles directly to your Wix blog. Once connected, every newly generated article is published automatically, live or as a draft, your choice.

Set up your Wix blog first

Your Wix site needs a blog before you connect. If you skip this, you'll hit a **"No blog instanceId found"** error during setup. [How to add a blog in Wix](https://drive.google.com/file/d/1r7Ocu23Cccq_ZkZyjNH0DwSeQSKBGKet/view?usp=sharing), then come back.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect Wix](#how-to-connect-wix)

Open **Settings → Publishing**, find **Wix** under **Website platforms**, and click **Connect** to launch the setup wizard. The wizard walks you through 6 short steps, mirrored below.

Already connected? The Wix card shows a **Connected** badge. Click **Manage** to update your settings at any time.

### [What You Need](#what-you-need)

- A Wix site with the **Blog** app already added
- Access to the site **owner's** Wix account (API keys created by co-owners or collaborators are rejected by Wix)
- Your Wix **Site ID** (found in the dashboard URL)

### [Before you start](#before-you-start)

BabyLoveGrowth publishes articles to your Wix blog automatically. The wizard opens with a short checklist. Confirm both points before continuing:

- The **Wix Blog** app is added to your site
- You can sign in as the site's **account owner** (keys created by co-owners or collaborators are rejected by Wix with a 403 error)

### [Find your Site ID](#find-your-site-id)

Open your Wix dashboard and look at the URL in your browser's address bar. Copy everything after `/dashboard/`.

Example: `manage.wix.com/dashboard/01c24d92-2ba6-48bd-90cd-87e33d2e9957/home` → your Site ID is `01c24d92-2ba6-48bd-90cd-87e33d2e9957`.

Paste it into the **Site ID** field in the wizard. The wizard also shows a short video of exactly where to find it.

### [Create your API key](#create-your-api-key)

Click **Open Wix API Keys** in the wizard. It takes you straight to [manage.wix.com/account/api-keys](https://manage.wix.com/account/api-keys) (you may be asked to sign in). Everything happens on one Wix screen:

1. Click **Generate API Key** (top right)
2. Name it anything, e.g. "Blog Sync"
3. Under **Permissions**, expand **All site permissions** and turn on **Wix Contacts & Members** and **Wix Blog**

If Wix asks which sites the key can access, pick **All sites**, or make sure your site is included. A key limited to other sites is rejected with a 403 error.

The wizard shows a video of the whole flow on this step.

### [Verify your email & copy the key](#verify-your-email--copy-the-key)

To finish creating the key, Wix asks you to verify your identity:

1. Click **Generate Key**. Wix sends a verification code to your email
2. Enter the code and click **Verify & Generate Key**
3. **Copy the key** that appears. You'll paste it in the next step

Wix keys are long, span **several lines**, and start with `IST.` (that's normal). Copy the whole thing.

Wix only shows this key once. Copy it before leaving the page.

### [Paste your key & connect](#paste-your-key--connect)

Paste the key into the **API Key** field (required). Your Wix site is detected automatically. Just choose how articles should be posted under **Publish Settings**:

- **Publish Immediately**: articles go live as soon as they're generated
- **Draft**: articles are saved as drafts for you to review first

Click **Connect**. We verify the key with Wix first (by creating and instantly deleting a test draft post), so a successful connection means publishing genuinely works. If the check fails, the wizard shows the exact reason and the most likely fixes. You'll then see the **Wix connected!** screen.

## [Publishing & Verifying](#publishing--verifying)

With **Automatically Publish** on (toggle at the top of the Integrations page), new articles publish to Wix on their own. To verify the connection right away:

1. Go to your **Content Plan**
2. Publish or re-publish any article
3. In Wix, go to your site dashboard → **Blog**
4. You'll see the article appear there

![Content Plan with the Publish action on an article](https://www.babylovegrowth.ai/_next/static/media/content-plan-publish.233bae2c.png)

## [Troubleshooting & FAQ](#troubleshooting--faq)

"No blog instanceId found" error?

Your Wix site doesn't have a blog yet. Add the **Blog** app to your Wix site (and create at least one post), then reconnect. For a walkthrough, see [this Wix blog setup video](https://drive.google.com/file/d/1r7Ocu23Cccq_ZkZyjNH0DwSeQSKBGKet/view?usp=sharing).

Site not connecting?

Double-check your **Site ID** (everything after `/dashboard/`) and confirm the API key has **Wix Blog** and **Wix Contacts & Members** permissions.

Wix rejected the key (403 / permission error)?

The three most common causes:

1. The key is missing the **Wix Blog** permission. Check its permission list
2. The key was created by a **co-owner or collaborator**. It must come from the site owner's account
3. The key's **site access** is limited to specific sites that don't include this one

API key issues?

Make sure you completed email verification when generating the key, and that you copied the **whole** key. Wix keys span several lines and start with `IST.`. If in doubt, generate a fresh key and paste it into **Manage**.

Publish fails?

Confirm the key is still valid and the blog still exists on your Wix site.

Can I change publish status later?

Yes. Open **Manage** on the Wix card and switch between **Publish Immediately** and **Draft**.

What happens if I regenerate my API key?

The old key stops working immediately. Paste the new key via **Manage**.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[Webflow

Connect BabyLoveGrowth to Webflow and publish articles on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/webflow)[Ghost

Connect BabyLoveGrowth to Ghost with Admin and Content API keys, then publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/ghost)
