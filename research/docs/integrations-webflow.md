<!-- Source: https://www.babylovegrowth.ai/docs/integrations/webflow -->

Integrations

# Webflow

Connect BabyLoveGrowth to Webflow and publish articles on auto-pilot.

The Webflow integration lets BabyLoveGrowth publish articles directly to your Webflow CMS. Once connected, every newly generated article is published automatically (live or as a draft, your choice).

Blog content not displaying properly in the Webflow Editor?

This is a known limitation on Webflow's side. Blog content may not render correctly in the Webflow Editor (e.g. visible code, broken layout, Rich Text field issues). [See this confirmation from Webflow](https://drive.google.com/file/d/1EHzmC5ZgHaMCA-uN0KLFzX0lYWROMyXe/view?usp=sharing). Content publishes successfully and will display correctly on your live website.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](https://www.babylovegrowth.ai/docs/dashboard/article-quality)

---

## [How to Connect Webflow](#how-to-connect-webflow)

Open **Settings → Publishing**, find **Webflow** under **Website platforms**, and click **Connect** to launch the setup wizard. The wizard walks you through 5 short steps, mirrored below.

Already connected? The Webflow card shows a **Connected** badge. Click **Manage** to update your site, collection, or publish settings at any time.

### [What You Need](#what-you-need)

- Access to your Webflow workspace and site
- Permission to generate an API token
- A Webflow CMS Collection ready for blog posts (CMS plan or higher)

### [Open your Webflow dashboard](#open-your-webflow-dashboard)

In the wizard, click **Open Webflow Dashboard** to jump to Webflow in a new tab, then sign in to the workspace where your site lives.

### [Go to your Webflow site settings](#go-to-your-webflow-site-settings)

1. Find your site and click the **Settings** (gear) icon
2. Open **Apps & Integrations** and scroll to **API access**
3. Click **Generate API Token**
4. Name it anything, e.g. "Blog Sync"

![Webflow site settings](https://www.babylovegrowth.ai/_next/static/media/webflow-site-setting.7e2ecde3.png)

![Webflow Apps & Integrations page](https://www.babylovegrowth.ai/_next/static/media/webflow-app-integration.4e32772b.png)

![Generate API token button in Webflow](https://www.babylovegrowth.ai/_next/static/media/webflow-generate-api.9218d538.png)

![Name your API token in Webflow](https://www.babylovegrowth.ai/_next/static/media/webflow-api-name-generate-token.5fbed895.png)

### [Set token permissions](#set-token-permissions)

Enable exactly these two permissions on the token:

- **CMS**: Read & Write
- **Sites**: Read Only

![Webflow CMS permissions set to Read and Write](https://www.babylovegrowth.ai/_next/static/media/webflow-cms-permission.d36cce90.png)

![Webflow Sites permissions set to Read-only](https://www.babylovegrowth.ai/_next/static/media/webflow-site-access.feca7b9f.png)

### [Generate & copy your token](#generate--copy-your-token)

Click **Generate token**, copy it, then paste it into the **API Token** field in the wizard. Your Webflow site and collection load automatically.

![Generated API token in Webflow](https://www.babylovegrowth.ai/_next/static/media/webflow-token-generated.d81442e1.png)

Webflow only shows this token once. Copy it before leaving the page.

### [Confirm your site & collection](#confirm-your-site--collection)

The wizard auto-detects your site and collection from the token. Confirm they look right, then choose your **Publish Settings**:

- **Webflow Site**: the site articles publish to (auto-detected)
- **Webflow Connection**: the CMS collection your blog posts go into
- **Publish Immediately**: articles go live the moment they're generated
- **Save as Draft**: articles are saved as drafts for you to review first

Click **Connect** to finish. You'll see the **Webflow connected!** screen.

![Webflow wizard step 5: confirm the auto-detected site and collection and choose publish settings](https://www.babylovegrowth.ai/_next/static/media/webflow-wizard-confirm-site.10008403.png)

## [Publishing & Verifying](#publishing--verifying)

With **Automatically Publish** on (toggle at the top of the Integrations page), new articles publish to Webflow on their own. To verify the connection right away:

1. Go to your **Content Plan**
2. Publish or re-publish any article
3. In Webflow, open your site → **CMS** → your blog collection
4. You'll see the article appear there

![Content Plan with the Publish action on an article](https://www.babylovegrowth.ai/_next/static/media/content-plan-publish.233bae2c.png)

## [Troubleshooting & FAQ](#troubleshooting--faq)

Blog content not displaying in the Webflow Editor?

This is a known issue from Webflow. Blog content may not display correctly in the Webflow Editor (visible code, broken layout, Rich Text field issues). You can refer to [this confirmation from Webflow](https://drive.google.com/file/d/1EHzmC5ZgHaMCA-uN0KLFzX0lYWROMyXe/view?usp=sharing). Content publishes successfully and will be visible on your live website.

Site or collection not showing after pasting the token?

Re-paste the API token in the wizard and make sure it has **CMS Read & Write** and **Sites Read Only** permissions.

Publish fails?

Confirm the token is valid and the collection still exists. Check that you haven't hit item-count or field limits in Webflow.

What happens if I regenerate my API token?

The old token stops working immediately. Open **Manage** on the Webflow card and paste the new token.

Can I publish to multiple Webflow sites?

You can connect one Webflow site per BabyLoveGrowth account. Generate a separate token for each site if you manage several.

Will articles go live immediately?

Only if you choose **Publish Immediately** in Step 5. Choose **Save as Draft** to review in Webflow before going live.

Do I need a specific Webflow plan?

You need a Webflow plan that includes CMS access and API capabilities (CMS plan or higher).

Need more help?

Contact support via the chat icon in the bottom-right corner.

[Shopify

Connect BabyLoveGrowth to Shopify with a custom app and publish to your store blog on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/shopify)[Wix

Connect BabyLoveGrowth to Wix with your Site ID and an API key, then publish on auto-pilot.](https://www.babylovegrowth.ai/docs/integrations/wix)
