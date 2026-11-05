<!-- Source: https://www.babylovegrowth.ai/docs/integrations/webflow (fetched 2026-11-05) -->

Integrations

# Webflow

Connect BabyLoveGrowth to Webflow and publish articles on auto-pilot.

The Webflow integration lets BabyLoveGrowth publish articles directly to your Webflow CMS. Once connected, every newly generated article is published automatically (live or as a draft, your choice).

Blog content not displaying properly in the Webflow Editor?

This is a known limitation on Webflow's side. Blog content may not render correctly in the Webflow Editor (e.g. visible code, broken layout, Rich Text field issues). [See this confirmation from Webflow](https://drive.google.com/file/d/1EHzmC5ZgHaMCA-uN0KLFzX0lYWROMyXe/view?usp=sharing). Content publishes successfully and will display correctly on your live website.

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](/docs/dashboard/article-quality)

------------------------------------------------------------------------

## [How to Connect Webflow](#how-to-connect-webflow)

Open **Settings → Publishing**, find **Webflow** under **Connect Your Website**, and click **Connect** to launch the setup wizard. The wizard walks you through 7 short steps, mirrored below.

Already connected? The Webflow card shows a **Connected** badge. Click **Manage** to update your site, collection, or publish settings at any time.

### [What You Need](#what-you-need)

- Access to your Webflow workspace and site
- Permission to generate an API token
- A Webflow CMS Collection ready for blog posts (CMS plan or higher)

### [Open your Webflow dashboard](#open-your-webflow-dashboard)

In the wizard, click **Open Webflow Dashboard** to jump to Webflow in a new tab, then sign in to the workspace where your site lives.

### [Go to your Webflow site settings](#go-to-your-webflow-site-settings)

1.  Find your site and click the **Settings** (gear) icon
2.  Open **Apps & Integrations** and scroll to **API access**
3.  Click **Generate API Token**
4.  Name it anything, e.g. "Blog Sync"

![Webflow site settings](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-site-setting.7e2ecde3.png&w=3840&q=75)

![Webflow Apps & Integrations page](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-app-integration.4e32772b.png&w=3840&q=75)

![Generate API token button in Webflow](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-generate-api.9218d538.png&w=3840&q=75)

![Name your API token in Webflow](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-api-name-generate-token.5fbed895.png&w=3840&q=75)

### [Set token permissions](#set-token-permissions)

Enable exactly these two permissions on the token:

- **CMS**: Read & Write
- **Sites**: Read Only

![Webflow CMS permissions set to Read and Write](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-cms-permission.d36cce90.png&w=3840&q=75)

![Webflow Sites permissions set to Read-only](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-site-access.feca7b9f.png&w=3840&q=75)

### [Generate & copy your token](#generate--copy-your-token)

Click **Generate token**, copy it, then paste it into the **API Token** field in the wizard. Your Webflow site and collection load automatically.

![Generated API token in Webflow](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-token-generated.d81442e1.png&w=3840&q=75)

Webflow only shows this token once. Copy it before leaving the page.

### [Confirm your collection & publish settings](#confirm-your-collection--publish-settings)

The wizard picks your Webflow site automatically from the token. Confirm the collection looks right, then choose your settings:

- **Webflow Connection**: the CMS collection your blog posts go into
- **Publish Settings**: **Publish Immediately** (articles go live the moment they're generated) or **Save as Draft** (articles are saved as drafts for you to review first)
- **Use BabyLoveGrowth default styling**: turn on to apply our default article styling

Click **Continue**.

![Webflow wizard step 5: confirm the auto-detected site and collection and choose publish settings](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwebflow-wizard-confirm-site.10008403.png&w=3840&q=75)

### [Map your collection fields](#map-your-collection-fields)

Match each Webflow field in your collection to the article content it should receive. You must map at least the **slug** and one **Rich Text** field (the article body).

Click **Connect** to finish. You'll see the **Webflow connected!** screen.

## [Publishing & Verifying](#publishing--verifying)

With **Automatically Publish** on (**Settings → Publishing**), new articles publish to Webflow on their own. To verify the connection right away:

1.  Go to your **Content Plan**
2.  Publish or re-publish any article
3.  In Webflow, open your site → **CMS** → your blog collection
4.  You'll see the article appear there

![Content Plan with the Publish action on an article](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcontent-plan-publish.233bae2c.png&w=3840&q=75)

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

Each website in BabyLoveGrowth connects to one Webflow site. Generate a separate token for each site if you manage several.

Will articles go live immediately?

Only if you choose **Publish Immediately** in Step 5. Choose **Save as Draft** to review in Webflow before going live.

Do I need a specific Webflow plan?

You need a Webflow plan that includes CMS access and API capabilities (CMS plan or higher).

Need more help?

Contact support via the chat icon in the bottom-right corner.

[](/docs/integrations/shopify)

Shopify

Connect BabyLoveGrowth to Shopify with a custom app and publish to your store blog on auto-pilot.

[](/docs/integrations/wix)

Wix

Connect BabyLoveGrowth to Wix with your Site ID and an API key, then publish on auto-pilot.
