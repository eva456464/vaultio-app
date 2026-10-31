<!-- Source: https://www.babylovegrowth.ai/docs/dashboard/analytics -->

Dashboard

# Analytics

See how Google search and AI search send traffic to your site.

The **Site traffic** page shows where your visitors come from, across both traditional Google search and AI search. Use the tabs at the top to switch between **All traffic**, **AI search traffic**, and **Google traffic**, and the period picker in the top right to change the reporting window.

## [All traffic](#all-traffic)

Everything happening on your site, from Google Analytics. Connect your GA4 property to see this tab.

![All traffic tab showing active users, sessions, top channel, channel performance chart, and top pages](https://www.babylovegrowth.ai/_next/static/media/GA4-doc-1.1508b8d5.png)

### [What you see](#what-you-see)

- **Active users** and **Sessions:** total visitors and visits in the selected period.
- **Top channel:** the channel bringing you the most users, such as Organic Search or Direct.
- **Users from AI searches:** how many visitors arrived from an AI search engine, so you can see AI traffic in the context of everything else.
- **Channel performance:** a trend line per channel over time, with a **Channel Breakdown** table ranking each channel by active users and share. Use the channel dropdown to compare only the channels you care about.
- **Top pages:** the pages with the most active users, with each page's **Page Share** and the **Top Source** that drove the most users to it. Search for a page, or flip on **BLG articles only** to see just the articles we generated for you.

## [AI search traffic](#ai-search-traffic)

The same GA4 data, filtered down to visitors who arrived from AI search engines. Use this tab to see whether AI visibility is turning into actual traffic.

### [What you see](#what-you-see-1)

- **Active users** and **Sessions:** visits that came specifically from AI search.
- **Top AI model:** the AI product sending you the most visitors.
- **AI models:** how many distinct AI sources sent you traffic in the period.
- **AI search performance:** a trend line showing which AI models drive the most traffic over time, plus a **Top AI models** table with active users and share for each one.
- **Top pages:** which pages AI search sends people to. Switch **Group by** between **Pages** and **AI models** to flip the view, either the top pages with the AI model that drove each one, or each AI model expanded to show the pages it sends traffic to.

## [Google traffic](#google-traffic)

Your organic performance from Google Search Console. Connect Search Console to see this tab.

![Google traffic tab showing total clicks, total impressions, average position, clicks by country, and the Google search traffic chart](https://www.babylovegrowth.ai/_next/static/media/GSC-doc-1.10a57624.png)

### [What you see](#what-you-see-2)

- **Total clicks:** how many times someone clicked through to your site from Google results, with the change against the previous period.
- **Total impressions:** how many times your site appeared in Google results, with the change against the previous period.
- **Average position:** your average ranking across all countries and keywords. Lower is better.
- **Clicks by country:** which markets your organic clicks come from, ranked by volume and share.
- **Google search traffic:** clicks, impressions, and average position plotted over time. Toggle any of the three on and off in the legend.

### [Top pages](#top-pages)

The pages earning the most clicks from Google search.

![Top pages table with clicks, impressions, click share, CTR, and average position](https://www.babylovegrowth.ai/_next/static/media/GSC-top-pages.836b3bae.png)

Each row shows **Clicks**, **Impressions**, **Click Share** (the page's cut of your site's total clicks), **CTR**, and **Avg Position**. Search for a specific page, or use **BLG articles only** to filter down to articles we generated.

### [Top Keywords](#top-keywords)

The search terms bringing the most clicks to your site.

![Top Keywords table with organic clicks, organic impressions, and average position](https://www.babylovegrowth.ai/_next/static/media/GSC-top-keywords.a5bcabc1.png)

Each row shows **Organic Clicks**, **Organic Impressions**, and **Avg Position** for that term. A **BLG article** badge means we already generated an article targeting that keyword.

### [Time period](#time-period)

Every tab has a period picker in the top right. Google traffic covers the last 7 days, 30 days, 90 days, 12 months, or all time. The GA4 tabs add a last 1 day option. Changing the period updates the cards, charts, and tables together.

---

## [LLM Visibility](#llm-visibility)

LLM Visibility has its own page in the sidebar, under **Analytics → AI visibility**. It tracks how often ChatGPT, Gemini, and Claude mention your brand when people ask questions about your category, which brands get recommended alongside yours, and which websites the models cite when they answer.

![AI visibility Overview tab showing the explanation box, visibility score, brand mentions, brand sentiment, visibility over time, top AI sources, and brands mentioned](https://www.babylovegrowth.ai/_next/static/media/llm-doc-1.8bd62e61.png)

Everything is built on your **tracked prompts**: real questions your buyers ask. We send each active prompt to every model on a recurring schedule, then read the answers to see who gets mentioned and what gets cited. The page is split into four tabs: **Overview**, **Prompts**, **Brands mentioned**, and **Sources**.

### [Overview](#overview)

A summary of your brand's presence across every answer we collected.

- **Explanation:** a plain-language recap of the latest run, how many prompts and models were checked, how many answers mentioned your brand, your visibility score, the most mentioned brand overall, and your top cited source.
- **Visibility score:** the share of AI answers where your brand appeared, across all tracked prompts.
- **Brand mentions:** how many answers mentioned your brand, out of every answer we collected.
- **Brand sentiment:** how AI answers portray your brand, from negative to positive. This card appears once we have enough mentions to score it.
- **Visibility over time:** how your visibility score moved run over run, with a dotted projection showing where it could go with continued optimization.
- **Top AI sources** and **Brands mentioned:** shortcut cards for the two tabs below. Click either one to see the full list.

### [Prompts](#prompts)

The list of prompts we monitor for you.

- **Prompts:** the question sent to the models. Click any row to open its full detail view.
- **Intent:** where the person asking is in their buying journey. **Buying intent** prompts are the most likely to name brands, **Comparison** prompts weigh options against each other, and **Learning** prompts are early research where brand mentions are rarer.
- **Mentioned in:** how many models mentioned your brand in their answer to that prompt.
- Prompts added recently show **Analyzing…** until the first answers come back.

Use **Manage prompts** to add, edit, delete, and toggle prompts. You can keep up to **10 prompts active** at a time, so pick the questions closest to a purchase decision and pause the rest.

### [Brands mentioned](#brands-mentioned)

Which brands AI recommends in your space, and how you compare.

- **Brands mentioned:** every brand that showed up in answers to your prompts, ranked by how many answers mentioned it. Each row shows **Mentioned in** (answers containing that brand), **Visibility** (its share of all answers), and **Sentiment**. Your own brand is tagged with a **You** badge.
- **Brands by prompt:** expand any prompt to see exactly which brands the models named in its answers, so you can spot the questions where competitors own the conversation.

### [Sources](#sources)

The websites that shape what AI says about your category.

- **Top AI sources:** the domains models cited most across all answers, with each domain's **Citation share** of total citations. Pages on your own site are flagged, so you can see when your content is the source being quoted.
- **Sources by prompt:** expand any prompt to see the specific pages cited in its answers. These are the pages to target with content, backlinks, or a mention request.

### [Prompt details](#prompt-details)

Click a prompt from the **Prompts** tab to open it. The detail view shows:

- **The responses:** the raw answers from each model, grouped by provider. Switch between ChatGPT, Gemini, and Claude to compare how each one describes your category, and open multiple responses per model where we collected them.
- **Sources cited:** the websites referenced in the answers to that one prompt.
- **Brands mentioned:** the brands named in the answers to that one prompt, with their sentiment.

[Blog Content

View, modify and manage your content plan](https://www.babylovegrowth.ai/docs/dashboard/content-plan)[Backlinks

Track all the backlinks your website has received and given through our backlink exchange network.](https://www.babylovegrowth.ai/docs/dashboard/backlinks)
