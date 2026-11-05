<!-- Source: https://www.babylovegrowth.ai/docs/dashboard/product-catalog (fetched 2026-11-05) -->

Dashboard

# Product Catalog

Add your products so they can be featured in generated article text and images to drive sales.

Add your catalog and we'll feature your products in article text, images, and direct links inside relevant articles to drive sales. Products with **Include in Articles** enabled can appear in generated article text and visuals.

Open **Settings → Product Catalog** and choose how to add your products.

![Product catalog page in Settings with the Shopify, WooCommerce, Add manually, and XML Feed (URL) options](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdoc-PC-1.22b4e7f7.png&w=3840&q=75)

## [Ways to add products](#ways-to-add-products)

- **Shopify:** Connect your Shopify store and import products automatically.
- **WooCommerce:** Connect your WooCommerce store and import products automatically.
- **Add manually:** Add products one by one, upload a file, or import a Google or Facebook feed.
- **XML Feed (URL):** Import products from an existing XML feed URL.

## [Connect your store](#connect-your-store)

Connecting Shopify or WooCommerce gives us read-only access to your products, so we can import them, keep them in sync, and feature them in your articles. We never modify your store data. Click **Sync Catalog** any time to pull the latest products.

- [Shopify Product Catalog setup guide](/docs/integrations/shopify-product-catalog)
- [WooCommerce Product Catalog setup guide](/docs/integrations/woocommerce-product-catalog)

Connecting a store for products is separate from blog publishing. Disconnecting a store removes its synced products; products you added manually are kept.

## [Add manually](#add-manually)

Click **Add manually**, then choose how you want to add products:

- **One by one:** Add products manually, one at a time.
- **Import file:** Upload an XML, CSV or Excel file with your products.
- **Google Shopping feed:** Import products from your Google Merchant Center feed URL.
- **Facebook catalog feed:** Import products from your Facebook catalog feed URL.

The two feed options work the same way as [XML Feed (URL)](#xml-feed-url) below.

### [One by one](#one-by-one)

- **Product Name:** The name shown when the product is featured. Required.
- **Description (Optional):** A short description of the product.
- **Product URL:** The link customers are sent to (e.g. `https://yoursite.com/product`).
- **Price:** The product price (e.g. 29.99).
- **Currency:** Select the currency for the price.
- **Product Image:** Choose an image or drag and drop. Accepts PNG, JPG, and WEBP.
- **Include in Articles:** When enabled, this product can be featured in generated article text and images. A product needs a Product URL before it can be included. Toggle it off to keep the product in your catalog without featuring it.

The **Preview** on the right shows a quick look at the details you've entered. Click **Add product** to save it.

![Add product manually form with name, description, URL, price, currency, image, Include in Articles toggle, and a live preview](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdoc-PC-2.cce7b1bc.png&w=3840&q=75)

### [Import file](#import-file)

Upload a product catalog file in XML, CSV, or Excel format. Products are added as manual entries. Image URLs in your file are downloaded and stored on our servers. Re-importing a file updates existing products with the same `id`.

- **Required fields:** `id`, `title`
- **Optional fields:** `description`, `link`, `image_link` (hosted on our servers), `price`, `currency_code`, `brand`, `product_type`

The dialog shows an example for each format. Click **Import products** once you've chosen your file.

![Import products from file dialog with a file upload area and the example XML, CSV, and Excel formats](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdoc-PC-3.b0d9c5ac.png&w=3840&q=75)

#### [XML format](#xml-format)

``` min-w-full
<?xml version="1.0" encoding="UTF-8"?>
<products>
  <product>
    <id>SKU-001</id>
    <title>Organic Cotton T-Shirt</title>
    <description>Soft everyday tee made from organic cotton.</description>
    <link>https://example.com/products/organic-cotton-t-shirt</link>
    <image_link>https://example.com/images/tee-main.jpg</image_link>
    <price>29.99</price>
    <currency_code>USD</currency_code>
    <brand>Example Co</brand>
    <product_type>Apparel &gt; Shirts</product_type>
  </product>
</products>
```

#### [CSV format](#csv-format)

The first row must be a header row.

``` min-w-full
id,title,description,link,image_link,price,currency_code,brand,product_type
SKU-001,Organic Cotton T-Shirt,Soft everyday tee made from organic cotton.,https://example.com/products/organic-cotton-t-shirt,https://example.com/images/tee-main.jpg,29.99,USD,Example Co,Apparel > Shirts
```

#### [Excel format](#excel-format)

Use the same columns in the first worksheet. Row 1 must be a header row, with the same column names as the CSV example above (`id`, `title`, `description`, `link`, `image_link`, `price`, `currency_code`, `brand`, `product_type`).

Accepted file types: XML (.xml), CSV (.csv), or Excel (.xlsx, .xls).

## [XML Feed (URL)](#xml-feed-url)

Import products from the same XML feed you already use for Google Merchant Center or your Facebook catalog. We fetch your products from the feed and keep them up to date with it automatically.

1.  Click **XML Feed (URL)**.
2.  Choose the **Feed format**: Google Shopping or Facebook.
3.  Paste your **XML feed URL** (for example, `https://yourstore.com/feed.xml`) and click **Import products**.

Importing a new URL replaces the saved feed. You can also remove the feed and its products at any time.

Use an RSS 2.0 feed with `g:` product fields, the same file you submit to Google Merchant Center.

![Import products from XML feed dialog with Google Shopping selected as the feed format](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdoc-PC-4.ea91ce8d.png&w=3840&q=75)

Use the XML product feed you use for your Facebook catalog.

![Import products from XML feed dialog with Facebook selected as the feed format](/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fdoc-PC-5.5e48ce0c.png&w=3840&q=75)

[](/docs/dashboard/settings)

Settings

Configure your account, business and brand, articles, integrations, and socials.

[](/docs/integrations/blog-hosting)

Blog Hosting

Let us host your blog on a custom subdomain with zero technical setup required.
