"""Offline stand-in for the Ghost, Webflow, Shopify and Wix APIs Vaultio publishes to, for development only.

    python3 scripts/dev-fixtures/mock-cms.py 4800

App env: WEBFLOW_API_BASE=http://localhost:4800/webflow/v2 SHOPIFY_API_BASE=http://localhost:4800/shopify
         WIX_API_BASE=http://localhost:4800/wix
Test credentials (fake):
  Ghost   site http://localhost:4800, Admin API key 6489abcdef0123456789abcd:<64 hex chars of "1">
  Webflow token wf-test-token-0123456789abcdef
  Shopify store test-store.myshopify.com, Client ID shp-client / secret shp-secret (or token shpat_test)
  Wix     site ID 01c24d92-2ba6-48bd-90cd-87e33d2e9957, API key wix-test-key-0123456789
Everything received is listed at GET /test/log.
"""
import base64, hashlib, hmac, json, re, sys, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4800
GHOST_KEY_ID, GHOST_SECRET = "6489abcdef0123456789abcd", "1" * 64
LOG, GHOST_POSTS, WEBFLOW_ITEMS, SHOPIFY_ARTICLES, WIX_POSTS = [], {}, {}, {}, {}


def ghost_ok(header):
    if not header.startswith("Ghost "):
        return False
    try:
        head, payload, sig = header[6:].split(".")
        expected = base64.urlsafe_b64encode(hmac.new(bytes.fromhex(GHOST_SECRET), f"{head}.{payload}".encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
        kid = json.loads(base64.urlsafe_b64decode(head + "=="))["kid"]
        claims = json.loads(base64.urlsafe_b64decode(payload + "=="))
        return sig == expected and kid == GHOST_KEY_ID and claims["aud"] == "/admin/" and claims["exp"] > time.time()
    except Exception:  # noqa: BLE001
        return False


class Handler(BaseHTTPRequestHandler):
    def reply(self, body, status=200):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        length = int(self.headers.get("content-length") or 0)
        raw = self.rfile.read(length) if length else b""
        if self.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
            return {k: v[0] for k, v in parse_qs(raw.decode()).items()}
        return json.loads(raw or b"{}")

    def handle_any(self, method):
        path = urlparse(self.path).path
        auth = self.headers.get("authorization", "")
        if path == "/test/log":
            return self.reply({"log": LOG})

        # ---------------- Ghost
        if path.startswith("/ghost/api/admin/"):
            if path == "/ghost/api/admin/site/":
                return self.reply({"site": {"title": "Mock Ghost Blog", "url": f"http://localhost:{PORT}/", "version": "5.0"}})
            if not ghost_ok(auth):
                return self.reply({"errors": [{"message": "Authorization failed", "context": "Invalid token"}]}, 401)
            m = re.match(r"^/ghost/api/admin/posts/(?:([0-9a-f]+)/)?$", path)
            if m and method == "GET" and not m.group(1):
                return self.reply({"posts": []})
            if m and method == "GET":
                post = GHOST_POSTS.get(m.group(1))
                return self.reply({"posts": [post]} if post else {"errors": [{"message": "Not found"}]}, 200 if post else 404)
            if m and method in ("POST", "PUT"):
                data = self.body()["posts"][0]
                post_id = m.group(1) or uuid.uuid4().hex[:24]
                if method == "PUT" and data.get("updated_at") != GHOST_POSTS.get(post_id, {}).get("updated_at"):
                    return self.reply({"errors": [{"message": "Saving failed! Someone else is editing this post."}]}, 409)
                post = {"id": post_id, "slug": data["slug"], "status": data["status"], "url": f"http://localhost:{PORT}/{data['slug']}/", "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + len(LOG))), "title": data["title"]}
                GHOST_POSTS[post_id] = post
                LOG.append({"platform": "ghost", "method": method, "title": data["title"], "status": data["status"], "html_chars": len(data.get("html") or ""), "feature_image": data.get("feature_image")})
                return self.reply({"posts": [post]})

        # ---------------- Webflow
        if path.startswith("/webflow/v2/"):
            if auth != "Bearer wf-test-token-0123456789abcdef":
                return self.reply({"message": "Request not authorized", "code": "not_authorized"}, 401)
            sub = path[len("/webflow/v2"):]
            if sub == "/sites":
                return self.reply({"sites": [{"id": "site1", "displayName": "Sunny Roofing (Webflow)", "shortName": "sunny-roofing", "customDomains": [{"url": "www.sunnyroofing-webflow.test"}]}]})
            if sub == "/sites/site1/collections":
                return self.reply({"collections": [{"id": "col-team", "displayName": "Team", "slug": "team"}, {"id": "col-blog", "displayName": "Blog Posts", "slug": "blog"}]})
            if sub == "/collections/col-blog":
                return self.reply({"id": "col-blog", "fields": [{"slug": "name", "type": "PlainText", "isRequired": True}, {"slug": "slug", "type": "PlainText", "isRequired": True}, {"slug": "post-body", "type": "RichText", "isRequired": False}, {"slug": "post-summary", "type": "PlainText"}, {"slug": "main-image", "type": "Image"}]})
            m = re.match(r"^/collections/col-blog/items(?:/([a-z0-9-]+))?(/live)?$", sub)
            if m:
                data = self.body()
                item_id = m.group(1) or f"item-{len(WEBFLOW_ITEMS) + 1}"
                WEBFLOW_ITEMS[item_id] = data
                LOG.append({"platform": "webflow", "method": method, "live": bool(m.group(2)), "draft": data.get("isDraft"), "fields": sorted(data.get("fieldData", {}).keys()), "image": data.get("fieldData", {}).get("main-image")})
                return self.reply({"id": item_id, "fieldData": data.get("fieldData", {})})

        # ---------------- Shopify
        if path.startswith("/shopify/"):
            sub = path[len("/shopify"):]
            if sub == "/admin/oauth/access_token":
                data = self.body()
                if data.get("grant_type") == "client_credentials" and data.get("client_id") == "shp-client" and data.get("client_secret") == "shp-secret":
                    return self.reply({"access_token": "shpat_from_client_credentials", "scope": "read_content,write_content", "expires_in": 86399})
                return self.reply({"error": "invalid_client", "error_description": "Client authentication failed"}, 401)
            if re.match(r"^/admin/api/[0-9-]+/graphql\.json$", sub):
                if self.headers.get("x-shopify-access-token") not in ("shpat_from_client_credentials", "shpat_test"):
                    return self.reply({"errors": "[API] Invalid API key or access token"}, 401)
                data = self.body()
                query, variables = data["query"], data.get("variables", {})
                if "blogs(first" in query:
                    return self.reply({"data": {"shop": {"name": "Sunny Roofing Store", "primaryDomain": {"url": "https://shop.sunnyroofing.test"}}, "blogs": {"nodes": [{"id": "gid://shopify/Blog/1", "title": "News", "handle": "news"}]}}})
                if "articleCreate" in query or "articleUpdate" in query:
                    article = variables["article"]
                    article_id = variables.get("id") or f"gid://shopify/Article/{len(SHOPIFY_ARTICLES) + 1}"
                    if "articleCreate" in query and not article.get("author", {}).get("name"):
                        return self.reply({"data": {"articleCreate": {"article": None, "userErrors": [{"field": ["author"], "message": "Author can't be blank"}]}}})
                    SHOPIFY_ARTICLES[article_id] = article
                    key = "articleUpdate" if "articleUpdate" in query else "articleCreate"
                    LOG.append({"platform": "shopify", "op": key, "title": article["title"], "isPublished": article.get("isPublished"), "author": article.get("author"), "image": article.get("image")})
                    return self.reply({"data": {key: {"article": {"id": article_id, "handle": article.get("handle")}, "userErrors": []}}})
                return self.reply({"errors": [{"message": "Unknown query"}]}, 400)

        # ---------------- Wix
        if path.startswith("/wix/"):
            if auth != "wix-test-key-0123456789" or self.headers.get("wix-site-id") != "01c24d92-2ba6-48bd-90cd-87e33d2e9957":
                return self.reply({"message": "UNAUTHENTICATED", "details": {"applicationError": {"description": "Invalid API key or site"}}}, 401)
            sub = path[len("/wix"):]
            if sub == "/members/v1/members/query":
                return self.reply({"members": [{"id": "member-owner-1", "profile": {"nickname": "Owner"}}]})
            m = re.match(r"^/blog/v3/draft-posts(?:/([a-z0-9-]+))?$", sub)
            if m and method == "DELETE":
                WIX_POSTS.pop(m.group(1), None)
                return self.reply({})
            if m and method in ("POST", "PATCH"):
                data = self.body()
                post_id = m.group(1) or str(uuid.uuid4())
                draft = data["draftPost"]
                nodes = draft.get("richContent", {}).get("nodes", [])
                WIX_POSTS[post_id] = draft
                LOG.append({"platform": "wix", "method": method, "title": draft.get("title"), "publish": data.get("publish", data.get("action")), "node_types": sorted({n["type"] for n in nodes}), "member": draft.get("memberId")})
                return self.reply({"draftPost": {"id": post_id, "url": {"base": "https://www.sunnyroofing-wix.test", "path": f"/post/{draft.get('seoSlug', 'post')}"}}})
        return self.reply({"message": f"No mock route {method} {path}"}, 404)

    def do_GET(self):
        self.handle_any("GET")

    def do_POST(self):
        self.handle_any("POST")

    def do_PUT(self):
        self.handle_any("PUT")

    def do_PATCH(self):
        self.handle_any("PATCH")

    def do_DELETE(self):
        self.handle_any("DELETE")

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"CMS mock on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
