<!-- Source: https://www.babylovegrowth.ai/docs/integrations/bigcommerce (fetched 2026-11-05) -->

Integrations

# BigCommerce

Connect BabyLoveGrowth to BigCommerce with a store hash and access token, then publish on auto-pilot.

The BigCommerce integration lets BabyLoveGrowth publish articles directly to your BigCommerce store blog. Once connected, every newly generated article is published automatically (live or as a draft, your choice).

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](/docs/dashboard/article-quality)

------------------------------------------------------------------------

## [How to Connect BigCommerce](#how-to-connect-bigcommerce)

Open **Settings → Publishing**, find **BigCommerce** under **Connect Your Website**, and click **Connect** to launch the setup wizard. The wizard walks you through 5 short steps, mirrored below.

Already connected? The BigCommerce card shows a **Connected** badge. Click **Manage** to update your settings at any time.

### [What You Need](#what-you-need)

- Your Store Hash (from your store URL)
- An Access Token from a Store-level API account
- WebDAV URL, Username, and Password (to upload article images)

### [Find your Store Hash](#find-your-store-hash)

Open your BigCommerce store URL and copy the part between `store-` and `.mybigcommerce.com`.

Example: `https://store-mh5fua96uw.mybigcommerce.com/...` → your Store Hash is `mh5fua96uw`.

Paste it into the **Store Hash** field in the wizard.

### [Create an API account](#create-an-api-account)

In your BigCommerce admin, follow **Settings → API → Store-level API accounts**. Then:

1.  Click **Create API account** (top right)
2.  Select token type **V2/V3 API token** and give it a name, e.g. "Blog Sync"
3.  Under **Content**, set access to **Modify**
4.  Click **Save** and copy the **Access Token**

### [Copy your Access Token](#copy-your-access-token)

After saving the API account, BigCommerce shows your **Access Token**. Copy it and paste it into the wizard.

BigCommerce only shows this token once. Copy it before clicking anything else.

### [Get your WebDAV credentials](#get-your-webdav-credentials)

We need these to upload article images to your store. Find all three on the same screen under **Settings → Advanced → File access (WebDAV)**:

- **WebDAV URL (Path)**
- **WebDAV Username**
- **WebDAV Password**

### [Blog publishing](#blog-publishing)

Set an **Author Name** to show on posts and choose how articles should be published under **Publish Settings**:

- **Publish Immediately**: articles go live as soon as they're generated
- **Draft**: articles are saved as drafts for you to review first

Click **Connect** to finish. You'll see the **BigCommerce connected!** screen.

## [Publishing & Verifying](#publishing--verifying)

With **Automatically Publish** on (toggle at the top of **Settings → Publishing**), new articles publish to BigCommerce on their own. To verify the connection right away:

1.  Go to your **Content Plan**
2.  Publish or re-publish any article
3.  In BigCommerce, open your store blog to confirm the article appears

![Content Plan with the Publish action on an article](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcontent-plan-publish.233bae2c.png&w=3840&q=75)

## [Troubleshooting & FAQ](#troubleshooting--faq)

Invalid Store Hash?

Re-copy the value between `store-` and `.mybigcommerce.com` from your store URL.

Token issues?

Regenerate the API account and ensure token type is **V2/V3** and **Content** is set to **Modify**.

Publish fails?

Confirm the integration shows **Connected** and the Access Token is active. Verify the WebDAV credentials are correct.

Images not uploading?

Check your WebDAV credentials. WebDAV is required for uploading article images to BigCommerce.

What's the difference between V2/V3 and V1 API tokens?

Use **V2/V3 API tokens**. They provide the access needed for blog content. V1 tokens are legacy and may not work.

Can I change the author name later?

Yes. Update the author name via **Manage**, and it applies to future published articles.

Will articles go live immediately?

Only if you choose **Publish Immediately**. Choose **Draft** to review in BigCommerce before going live.

What if I regenerate my Access Token?

The old token stops working immediately. Paste the new token via **Manage** to restore the connection.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[](/docs/integrations/duda)

Duda

Connect BabyLoveGrowth to Duda using an RSS feed to import your latest articles.

[](/docs/integrations/snapps)

Snapps CMS

Connect BabyLoveGrowth to Snapps with a Site ID and API key, then publish on auto-pilot.
