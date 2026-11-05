<!-- Source: https://www.babylovegrowth.ai/docs/integrations/gohighlevel (fetched 2026-11-05) -->

Integrations

# GoHighLevel

Connect BabyLoveGrowth to GoHighLevel with a Private Integration token and publish on auto-pilot.

The GoHighLevel integration lets BabyLoveGrowth publish articles directly to your GoHighLevel blog. Once connected, every newly generated article is published automatically (published or draft, your choice).

How articles look on your site

Formatting and mobile-friendliness depend on your website's theme and CSS. We deliver semantic content; your theme controls the styling. [Learn more](/docs/dashboard/article-quality)

------------------------------------------------------------------------

## [How to Connect GoHighLevel](#how-to-connect-gohighlevel)

Open **Settings → Publishing**, find **GoHighLevel** under **Connect Your Website**, and click **Connect** to launch the setup wizard. The wizard walks you through 6 short steps, mirrored below.

Already connected? The GoHighLevel card shows a **Connected** badge. Click **Manage** to update your blog, author, or publish settings at any time.

### [What You Need](#what-you-need)

- A GoHighLevel sub-account with access to create Private Integrations
- **At least one Blog** with a published post (Sites → Blogs)
- Your Location ID and a Private Integration token

### [Before you start](#before-you-start)

Before connecting, your sub-account must already have a **blog** with at least one published post. We need an existing blog to publish into.

In GoHighLevel, open **Sites → Websites**, find the site you want to connect, and confirm it has a blog (create one under **Sites → Blogs** if not). Then click **Continue**.

![GoHighLevel Sites menu showing Websites section](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fghl-site-select.febf8d13.png&w=3840&q=75)

### [Create a Private Integration](#create-a-private-integration)

In your GoHighLevel sub-account, follow **Settings → Private Integrations → Create New Integration**. Then:

1.  Click **Create New Integration**
2.  Give it a name like "Blog Sync"
3.  Open the next step to see which scopes to enable

![GoHighLevel Settings button in left sidebar](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fghl-settings.e8f028ff.png&w=3840&q=75)

![GoHighLevel Private Integrations menu](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fghl-private-integration.f71eab4a.png&w=3840&q=75)

![GoHighLevel integration name input](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fghl-integration-name.1ca4c7ba.png&w=3840&q=75)

### [Enable these scopes](#enable-these-scopes)

Tick every scope below. We need all of them to publish posts:

- `blogs/post.write`: Create blog post
- `blogs/post-update.write`: Update blog post
- `blogs/check-slug.readonly`: Check blog post slug
- `blogs/category.readonly`: View blog categories
- `blogs/author.readonly`: View blog authors
- `blogs/posts.readonly`: View blog posts
- `blogs/list.readonly`: View blogs list

![GoHighLevel scope selection showing blog permissions](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fghl-scop.a1912be6.png&w=3840&q=75)

### [Paste your access token](#paste-your-access-token)

Once you save the Private Integration, GoHighLevel reveals a **token** (starts with `pit-`). Copy it and paste it into the wizard.

![GoHighLevel Create button and Private Integration token](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fghl-create.c5684366.png&w=3840&q=75)

This token is shown only once. If you lose it, you'll need to recreate the Private Integration.

### [Add your Location ID](#add-your-location-id)

Find the Location ID for the sub-account you want to publish into under **Settings → Business Profile → Location ID**, then paste it into the wizard.

![GoHighLevel Business Profile showing Location ID](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fghl-locationid.69b22d52.png&w=3840&q=75)

The Location ID is a long alphanumeric string unique to your location.

### [Choose blog & publish settings](#choose-blog--publish-settings)

Pick which blog new articles should land in, plus the default author and publish status. The **Blog** and **Author** dropdowns load automatically once your token and Location ID are valid.

- **Blog**: where new articles are published
- **Author** (optional): leave empty for the default author
- **Publish Status**: **Publish immediately** or **Save as draft**
- **Remove first image** (optional): drops the first image of every article so your hero image doesn't appear twice if your template already shows one
- **Remove first H1** (optional): drops the first H1 so it doesn't duplicate the title your template renders

Click **Connect** to finish. You'll see the **GoHighLevel connected** screen.

![GoHighLevel wizard step 6: choose blog, author, publish status, and the remove-first-image / remove-first-H1 options](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fgohighlevel-wizard-blog-settings.f7cee464.png&w=3840&q=75)

## [Publishing & Verifying](#publishing--verifying)

With **Automatically Publish** on (toggle at the top of **Settings → Publishing**), new articles publish to GoHighLevel on their own. To verify the connection right away:

1.  Go to your **Content Plan**
2.  Publish or re-publish any article
3.  In GoHighLevel, open **Sites → Blogs** to confirm the article appears (live if **Publish immediately**, otherwise as a draft)

![Content Plan with the Publish action on an article](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcontent-plan-publish.233bae2c.png&w=3840&q=75)

## [Tips & Best Practices](#tips--best-practices)

- Create your blog in GoHighLevel before connecting so it appears in the dropdown
- Use **Save as draft** if you want to review articles before they go live
- Keep your Private Integration token secure and never share it
- Enable **Remove first image** if your blog theme already displays hero images

## [Troubleshooting & FAQ](#troubleshooting--faq)

Blogs and authors not loading?

Make sure you've entered both the Location ID and Private Integration token correctly. Wait a few seconds for the dropdowns to populate.

Connection fails with "Invalid credentials"?

Double-check your Location ID (Settings → Business Profile) and token (starts with `pit-`). Ensure your token has the required blog scopes.

Blog dropdown is empty?

Create at least one blog in GoHighLevel (Sites → Blogs) first, then reopen the wizard.

Which scopes do I need?

All seven blog scopes: `blogs/post.write`, `blogs/post-update.write`, `blogs/check-slug.readonly`, `blogs/category.readonly`, `blogs/author.readonly`, `blogs/posts.readonly`, and `blogs/list.readonly`.

Can I use the same token for multiple locations?

No. Each location needs its own Private Integration token. Connect a separate integration for each GoHighLevel location.

Will articles go live immediately?

Only if you choose **Publish immediately**. Choose **Save as draft** to review in GoHighLevel first.

What if I regenerate my token?

The old token stops working immediately. Paste the new token via **Manage**.

Can I change the author after connecting?

Yes. Open **Manage** on the GoHighLevel card, pick a different author, and save.

Do I need a GoHighLevel Agency account?

No. Both Agency and Location accounts work. You just need access to create Private Integrations and manage blogs.

Need more help?

Contact support via the chat icon in the bottom-right corner.

[](/docs/integrations/framer)

Framer

Connect BabyLoveGrowth to Framer via the official plugin and import articles in a few clicks.

[](/docs/integrations/duda)

Duda

Connect BabyLoveGrowth to Duda using an RSS feed to import your latest articles.
