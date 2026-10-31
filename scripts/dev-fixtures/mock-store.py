"""Offline stand-in for a client's online store, for development only: Shopify's GraphQL Admin API
(products, read-only), the WooCommerce REST API (products), Google Shopping / Facebook product feeds
and product images.

    python3 scripts/dev-fixtures/mock-store.py 4900

Shopify: run the app with SHOPIFY_API_BASE=http://localhost:4900, then connect any store name with
Client ID "catalog-client" and secret "catalog-secret". WooCommerce: store URL
http://localhost:4900, consumer key "ck_test_catalog", secret "cs_test_catalog" (a store URL ending
in /redirect answers with a redirect to www, like a store entered without www). Feeds:
http://localhost:4900/feeds/google.xml and /feeds/facebook.xml. GET /test/state shows the request log.
"""
import base64, json, os, re, struct, sys, zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4900
BASE = f"http://127.0.0.1:{PORT}"
LOG = []

SHOPIFY_PRODUCTS = [
    {"id": "gid://shopify/Product/1001", "title": "Solar Attic Fan", "handle": "solar-attic-fan", "status": "ACTIVE", "vendor": "Sunny Roofing", "productType": "Ventilation",
     "description": "Solar-powered fan that pulls hot attic air out, so shingles last longer and rooms below stay cooler.", "variants": 1, "price": "329.00", "image": "attic-fan"},
    {"id": "gid://shopify/Product/1002", "title": "Mesh Gutter Guard", "handle": "mesh-gutter-guard", "status": "ACTIVE", "vendor": "Sunny Roofing", "productType": "Gutters",
     "description": "Stainless micro-mesh guards that keep leaves and pine needles out of 5-inch gutters.", "variants": 3, "price": "49.99", "image": "gutter-guard"},
    {"id": "gid://shopify/Product/1003", "title": "Elastomeric Roof Coating", "handle": "roof-coating", "status": "ACTIVE", "vendor": "Sunny Roofing", "productType": "Flat roofs",
     "description": "Reflective white coating for flat and low-slope roofs; seals hairline cracks.", "variants": 2, "price": "189.00", "image": "roof-coating"},
    {"id": "gid://shopify/Product/1004", "title": "Metal Roof Touch-Up Paint", "handle": "touch-up-paint", "status": "ACTIVE", "vendor": "Sunny Roofing", "productType": "Metal roofs",
     "description": "Color-matched paint pens for scratches on painted metal roof panels.", "variants": 6, "price": "18.50", "image": None},
    {"id": "gid://shopify/Product/1005", "title": "Copper Ridge Cap (draft)", "handle": "copper-ridge-cap", "status": "DRAFT", "vendor": "Sunny Roofing", "productType": "Metal roofs",
     "description": "Not on sale yet.", "variants": 1, "price": "240.00", "image": None},
    {"id": "gid://shopify/Product/1006", "title": "Old Shingle Sample Kit", "handle": "sample-kit", "status": "ARCHIVED", "vendor": "Sunny Roofing", "productType": "Samples",
     "description": "Archived.", "variants": 1, "price": "0.00", "image": None},
]

WOO_PRODUCTS = [
    {"id": 501, "name": "Roof Leak Repair Tape", "slug": "leak-repair-tape", "status": "publish", "price": "24.95", "type": "simple", "variations": [], "category": "Repairs", "image": "leak-tape",
     "short_description": "<p>Butyl tape for emergency leak repairs on flashing and seams.</p>"},
    {"id": 502, "name": "Skylight Flashing Kit", "slug": "skylight-flashing-kit", "status": "publish", "price": "74.50", "type": "variable", "variations": [601, 602], "category": "Skylights", "image": None,
     "short_description": "<p>Step flashing and sealant for curb-mounted skylights.</p>"},
    {"id": 503, "name": "Ridge Vent (coming soon)", "slug": "ridge-vent", "status": "draft", "price": "", "type": "simple", "variations": [], "category": "Ventilation", "image": None,
     "short_description": ""},
]

COLORS = {"attic-fan": (232, 166, 52), "gutter-guard": (110, 140, 160), "roof-coating": (236, 236, 228), "leak-tape": (40, 40, 40), "ridge-vent": (120, 100, 90), "snow-guards": (170, 175, 180)}


def png(name, size=240):
    """A small solid-colour PNG with a darker border (no image library needed)."""
    r, g, b = COLORS.get(name, (200, 200, 200))
    rows = b""
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            edge = x < 12 or y < 12 or x >= size - 12 or y >= size - 12
            row += bytes((max(0, r - 60), max(0, g - 60), max(0, b - 60)) if edge else (r, g, b))
        rows += bytes(row)
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")


def shopify_node(product):
    live = product["status"] == "ACTIVE"
    return {
        "id": product["id"], "title": product["title"], "handle": product["handle"], "status": product["status"], "vendor": product["vendor"], "productType": product["productType"],
        "onlineStoreUrl": f"https://shop.sunnyroofing.test/products/{product['handle']}" if live else None,
        "description": product["description"], "variantsCount": {"count": product["variants"]},
        "priceRangeV2": {"minVariantPrice": {"amount": product["price"], "currencyCode": "USD"}},
        "featuredImage": {"url": f"{BASE}/images/{product['image']}.png"} if product["image"] else None,
    }


def woo_item(product):
    return {
        "id": product["id"], "name": product["name"], "permalink": f"https://shop.sunnyroofing.test/product/{product['slug']}/", "status": product["status"],
        "short_description": product["short_description"], "description": "", "price": product["price"], "type": product["type"], "variations": product["variations"],
        "images": [{"src": f"{BASE}/images/{product['image']}.png"}] if product["image"] else [], "categories": [{"name": product["category"]}], "brands": [],
    }


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body, headers=None, content_type="application/json"):
        data = body if isinstance(body, bytes) else (json.dumps(body) if content_type == "application/json" else body).encode()
        self.send_response(code)
        self.send_header("content-type", content_type)
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        return self.rfile.read(int(self.headers.get("content-length", 0) or 0))

    def woo_authorized(self):
        auth = self.headers.get("authorization", "")
        if not auth.startswith("Basic "):
            self.reply(401, {"code": "woocommerce_rest_cannot_view", "message": "Sorry, you cannot list resources."})
            return False
        key, _, secret = base64.b64decode(auth[6:]).decode().partition(":")
        if key == "ck_writeonly":
            self.reply(403, {"code": "woocommerce_rest_cannot_view", "message": "Sorry, you cannot list resources."})
            return False
        if key != "ck_test_catalog" or secret != "cs_test_catalog":
            self.reply(401, {"code": "woocommerce_rest_authentication_error", "message": "Consumer key is invalid."})
            return False
        return True

    def do_GET(self):
        url = urlparse(self.path)
        query = {key: values[-1] for key, values in parse_qs(url.query).items()}
        LOG.append(f"GET {url.path}")
        if url.path.startswith("/redirect/"):
            return self.reply(301, "", {"location": f"http://www.example.test{url.path[9:]}"}, "text/plain")
        image = re.match(r"^/images/([\w-]+)\.png$", url.path)
        if image:
            return self.reply(200, png(image.group(1)), content_type="image/png")
        feed = re.match(r"^/feeds/(google|facebook)\.xml$", url.path)
        if feed:
            with open(os.path.join(HERE, "catalog", f"feed-{feed.group(1)}.xml"), "rb") as handle:
                return self.reply(200, handle.read().replace(b"http://127.0.0.1:4900", BASE.encode()), content_type="application/xml")
        if url.path == "/wp-json/" or url.path == "/wp-json":
            return self.reply(200, {"name": "Sunny Roofing Shop", "url": f"http://localhost:{PORT}"})
        if url.path == "/wp-json/wc/v3/data/currencies/current":
            return self.woo_authorized() and self.reply(200, {"code": "USD", "name": "United States (US) dollar", "symbol": "$"})
        if url.path == "/wp-json/wc/v3/products":
            if not self.woo_authorized():
                return
            items = [woo_item(product) for product in WOO_PRODUCTS]
            per_page, page = int(query.get("per_page", 10)), int(query.get("page", 1))
            pages = max(1, -(-len(items) // per_page))
            return self.reply(200, items[(page - 1) * per_page:page * per_page], {"X-WP-Total": str(len(items)), "X-WP-TotalPages": str(pages)})
        if url.path == "/test/state":
            return self.reply(200, {"log": LOG[-50:]})
        self.reply(404, {"code": "rest_no_route", "message": "No route was found matching the URL and request method."})

    def do_POST(self):
        url = urlparse(self.path)
        LOG.append(f"POST {url.path}")
        if url.path == "/admin/oauth/access_token":
            form = parse_qs(self.body().decode())
            if form.get("client_id", [""])[0] == "catalog-client" and form.get("client_secret", [""])[0] == "catalog-secret":
                return self.reply(200, {"access_token": "shpat_mock_catalog", "scope": "read_products,read_inventory", "expires_in": 86399})
            return self.reply(400, {"error": "invalid_client", "error_description": "Client authentication failed"})
        if re.match(r"^/admin/api/[\w-]+/graphql\.json$", url.path):
            if self.headers.get("x-shopify-access-token") != "shpat_mock_catalog":
                return self.reply(401, {"errors": "[API] Invalid API key or access token (unrecognized login or wrong password)"})
            request = json.loads(self.body() or b"{}")
            text = request.get("query", "")
            if "pageInfo" in text:
                cursor = int((request.get("variables") or {}).get("cursor") or 0)
                nodes = [shopify_node(product) for product in SHOPIFY_PRODUCTS[cursor:cursor + 4]]
                more = cursor + 4 < len(SHOPIFY_PRODUCTS)
                return self.reply(200, {"data": {"products": {"pageInfo": {"hasNextPage": more, "endCursor": str(cursor + 4) if more else None}, "nodes": nodes}}})
            return self.reply(200, {"data": {"shop": {"name": "Sunny Roofing Shop", "currencyCode": "USD", "primaryDomain": {"url": "https://shop.sunnyroofing.test"}}, "products": {"nodes": [{"id": SHOPIFY_PRODUCTS[0]["id"]}]}}})
        self.reply(404, {"errors": "Not Found"})

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
