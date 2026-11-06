"""Offline stand-in for the Ghost, Webflow, Shopify, Wix, BigCommerce and GoHighLevel APIs Vaultio
publishes to, for development only.

    python3 scripts/dev-fixtures/mock-cms.py 4800

App env: WEBFLOW_API_BASE=http://localhost:4800/webflow/v2 SHOPIFY_API_BASE=http://localhost:4800/shopify
         WIX_API_BASE=http://localhost:4800/wix BIGCOMMERCE_API_BASE=http://localhost:4800/bigcommerce
         GOHIGHLEVEL_API_BASE=http://localhost:4800/ghl
Test credentials (fake):
  Ghost        site http://localhost:4800, Admin API key 6489abcdef0123456789abcd:<64 hex chars of "1">
  Webflow      token wf-test-token-0123456789abcdef
  Shopify      store test-store.myshopify.com, Client ID shp-client / secret shp-secret (or token shpat_test)
  Wix          site ID 01c24d92-2ba6-48bd-90cd-87e33d2e9957, API key wix-test-key-0123456789
  BigCommerce  store hash mh5fua96uw, access token bc-test-token-0123456789abcdef
               WebDAV http://localhost:4800/dav, user webdav-user, password webdav-pass (digest auth)
  GoHighLevel  Location ID ve9EPM428h8vShlRW1KT, token pit-test-0123456789abcdef0123
Everything received is listed at GET /test/log.
"""
import base64, hashlib, hmac, json, re, sys, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4800
GHOST_KEY_ID, GHOST_SECRET = "6489abcdef0123456789abcd", "1" * 64
LOG, GHOST_POSTS, WEBFLOW_ITEMS, SHOPIFY_ARTICLES, WIX_POSTS = [], {}, {}, {}, {}
WPCOM_POSTS, WPCOM_MEDIA = {}, []
WPCOM_TOKEN, WPCOM_BLOG = "wpcom-token-0123456789", "4242"
BC_HASH, BC_TOKEN, BC_POSTS, DAV_FILES = "mh5fua96uw", "bc-test-token-0123456789abcdef", {}, {}
DAV_USER, DAV_PASSWORD, DAV_REALM, DAV_NONCE = "webdav-user", "webdav-pass", "BigCommerce WebDAV", uuid.uuid4().hex
GHL_LOCATION, GHL_TOKEN, GHL_POSTS = "ve9EPM428h8vShlRW1KT", "pit-test-0123456789abcdef0123", {}


def md5(value):
    return hashlib.md5(value.encode()).hexdigest()


def digest_ok(header, method, uri):
    if not header.startswith("Digest "):
        return False
    fields = dict(re.findall(r'(\w+)="?([^",]+)"?', header[7:]))
    ha1 = md5(f"{DAV_USER}:{DAV_REALM}:{DAV_PASSWORD}")
    ha2 = md5(f"{method}:{uri}")
    if fields.get("qop") == "auth":
        expected = md5(f"{ha1}:{fields.get('nonce')}:{fields.get('nc')}:{fields.get('cnonce')}:auth:{ha2}")
    else:
        expected = md5(f"{ha1}:{fields.get('nonce')}:{ha2}")
    return fields.get("username") == DAV_USER and fields.get("nonce") == DAV_NONCE and fields.get("uri") == uri and fields.get("response") == expected


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
        if path == "/test/files":
            return self.reply({"files": sorted(DAV_FILES)})
        if path == "/test/wpcom":
            return self.reply({"posts": list(WPCOM_POSTS.values()), "media": WPCOM_MEDIA})

        # ---------------- WordPress.com (OAuth2 + REST v1.1)
        if path == "/wpcom/oauth2/authorize":
            q = parse_qs(urlparse(self.path).query)
            target = f"{q['redirect_uri'][0]}?code=mock-wpcom-code&state={quote(q['state'][0], safe='')}"
            self.send_response(302)
            self.send_header("location", target)
            self.end_headers()
            return
        if path == "/wpcom/oauth2/token" and method == "POST":
            data = self.body()
            if data.get("code") != "mock-wpcom-code" or data.get("grant_type") != "authorization_code" or not data.get("client_secret"):
                return self.reply({"error": "invalid_grant", "error_description": "The code is invalid"}, 400)
            return self.reply({"access_token": WPCOM_TOKEN, "token_type": "bearer", "blog_id": WPCOM_BLOG, "blog_url": "https://mockblog.wordpress.com", "scope": ""})
        if path.startswith("/wpcom/rest/v1.1/sites/"):
            if auth != f"Bearer {WPCOM_TOKEN}":
                return self.reply({"error": "unauthorized", "message": "User cannot access this private blog."}, 403)
            rest = path[len("/wpcom/rest/v1.1/sites/"):]
            blog, _, sub = rest.partition("/")
            if blog != WPCOM_BLOG:
                return self.reply({"error": "unknown_blog", "message": "Unknown blog"}, 404)
            if sub == "" and method == "GET":
                return self.reply({"ID": int(WPCOM_BLOG), "name": "Mock WP.com Blog", "URL": "https://mockblog.wordpress.com", "lang": "en"})
            if sub == "media/new" and method == "POST":
                length = int(self.headers.get("content-length") or 0)
                raw = self.rfile.read(length)
                if b'name="media[]"' not in raw:
                    return self.reply({"error": "invalid_input", "message": "No media"}, 400)
                media_id = 900 + len(WPCOM_MEDIA)
                WPCOM_MEDIA.append(media_id)
                LOG.append({"wpcom_media": media_id})
                return self.reply({"media": [{"ID": media_id, "URL": f"https://mockblog.files.wordpress.com/{media_id}.webp"}], "errors": []})
            m = re.match(r"^posts/slug:([a-z0-9-]+)$", sub)
            if m and method == "GET":
                post = next((p for p in WPCOM_POSTS.values() if p["slug"] == m.group(1)), None)
                return self.reply(post if post else {"error": "unknown_post", "message": "Unknown post"}, 200 if post else 404)
            m = re.match(r"^posts/(new|\d+)$", sub)
            if m and method == "POST":
                data = self.body()
                if m.group(1) == "new":
                    post_id = 100 + len(WPCOM_POSTS)
                elif int(m.group(1)) in WPCOM_POSTS:
                    post_id = int(m.group(1))
                else:
                    return self.reply({"error": "unknown_post", "message": "Unknown post"}, 404)
                post = {**WPCOM_POSTS.get(post_id, {}), "ID": post_id, "slug": data.get("slug", ""), "title": data.get("title", ""), "status": data.get("status", "publish"), "featured_image": data.get("featured_image"), "content_has_copied_images": "mockblog.files.wordpress.com" in data.get("content", ""), "URL": f"https://mockblog.wordpress.com/{data.get('slug', '')}/"}
                WPCOM_POSTS[post_id] = post
                LOG.append({"wpcom_post": post_id, "status": post["status"], "new": m.group(1) == "new"})
                return self.reply(post)
            return self.reply({"error": "not_found", "message": path}, 404)

        # ---------------- DataForSEO: Google Ads locations of a country
        m = re.match(r"^/dataforseo/v3/keywords_data/google_ads/locations/([a-z]{2})$", path)
        if m:
            rows = [
                {"location_code": 21137, "location_name": "California,United States", "location_type": "State", "country_iso_code": "US"},
                {"location_code": 1014221, "location_name": "Santa Barbara,California,United States", "location_type": "City", "country_iso_code": "US"},
                {"location_code": 1014218, "location_name": "Santa Ana,California,United States", "location_type": "City", "country_iso_code": "US"},
                {"location_code": 9061285, "location_name": "Santa Barbara County,California,United States", "location_type": "County", "country_iso_code": "US"},
                {"location_code": 2840, "location_name": "United States", "location_type": "Country", "country_iso_code": "US"},
            ]
            return self.reply({"status_code": 20000, "tasks": [{"status_code": 20000, "result": rows}]})

        # ---------------- PageSpeed Insights (Lighthouse, mobile): the homepage is fast, other pages slower
        if path == "/pagespeed":
            target = parse_qs(urlparse(self.path).query).get("url", [""])[0]
            home = urlparse(target).path in ("", "/")
            score = 0.92 if home else 0.41
            audits = {
                "first-contentful-paint": {"numericValue": 1200 if home else 3100},
                "largest-contentful-paint": {"numericValue": 1900 if home else 5200},
                "total-blocking-time": {"numericValue": 90 if home else 640},
                "cumulative-layout-shift": {"numericValue": 0.02 if home else 0.21},
                "speed-index": {"numericValue": 1800 if home else 4900},
            }
            LOG.append({"pagespeed": target})
            return self.reply({"lighthouseResult": {"categories": {"performance": {"score": score}}, "audits": audits}})

        # ---------------- Ghost
        if path.startswith("/ghost/api/admin/"):
            if path == "/ghost/api/admin/site/":
                return self.reply({"site": {"title": "Mock Ghost Blog", "url": f"http://localhost:{PORT}/", "version": "5.0"}})
            if not ghost_ok(auth):
                return self.reply({"errors": [{"message": "Authorization failed", "context": "Invalid token"}]}, 401)
            if path == "/ghost/api/admin/users/":
                email = re.search(r"email:'([^']+)'", parse_qs(urlparse(self.path).query).get("filter", [""])[0])
                users = [{"id": "staff-1", "name": "Dana Editor", "email": "dana@mockghost.test"}]
                return self.reply({"users": [u for u in users if email and u["email"] == email.group(1)]})
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
                LOG.append({"platform": "ghost", "method": method, "title": data["title"], "status": data["status"], "html_chars": len(data.get("html") or ""), "feature_image": data.get("feature_image"), "authors": data.get("authors")})
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
            if sub == "/site-media/v1/files/import" and method == "POST":
                data = self.body()
                file_id = f"wixfile-{len(LOG) + 1}"
                LOG.append({"platform": "wix-media", "op": "import", "url": data.get("url")})
                return self.reply({"file": {"id": file_id, "url": f"https://static.wixstatic.com/media/{file_id}.webp", "operationStatus": "PENDING"}})
            if sub == "/site-media/v1/files/get-file-by-id":
                file_id = parse_qs(urlparse(self.path).query).get("fileId", [""])[0]
                return self.reply({"file": {"id": file_id, "url": f"https://static.wixstatic.com/media/{file_id}.webp", "operationStatus": "READY"}})
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
                LOG.append({"platform": "wix", "method": method, "title": draft.get("title"), "publish": data.get("publish", data.get("action")), "node_types": sorted({n["type"] for n in nodes}), "member": draft.get("memberId"), "hero_image": (draft.get("heroImage") or {}).get("id")})
                return self.reply({"draftPost": {"id": post_id, "url": {"base": "https://www.sunnyroofing-wix.test", "path": f"/post/{draft.get('seoSlug', 'post')}"}}})
        # ---------------- BigCommerce (REST v2 blog + store, WebDAV with digest auth)
        if path.startswith("/bigcommerce/stores/"):
            m = re.match(r"^/bigcommerce/stores/([a-z0-9]+)/v2(/.*)$", path)
            if not m or m.group(1) != BC_HASH:
                return self.reply([{"status": 404, "message": "Store not found"}], 404)
            if self.headers.get("x-auth-token") != BC_TOKEN:
                return self.reply([{"status": 401, "message": "Unauthorized"}], 401)
            sub = m.group(2)
            if sub == "/store":
                return self.reply({"name": "Sunny Roofing Store", "domain": "sunnyroofing-bc.test", "secure_url": "https://sunnyroofing-bc.test"})
            if sub == "/blog/posts" and method == "GET":
                return self.reply(list(BC_POSTS.values()))
            pm = re.match(r"^/blog/posts(?:/(\d+))?$", sub)
            if pm and method in ("POST", "PUT"):
                data = self.body()
                post_id = int(pm.group(1)) if pm.group(1) else len(BC_POSTS) + 1
                if pm.group(1) and post_id not in BC_POSTS:
                    return self.reply([{"status": 404, "message": "The requested resource was not found."}], 404)
                url = data.get("url") or BC_POSTS.get(post_id, {}).get("url")
                if any(other["url"] == url and other_id != post_id for other_id, other in BC_POSTS.items()):
                    return self.reply([{"status": 409, "message": "The field 'url' is invalid: a post with this URL already exists."}], 409)
                if not data.get("title") or not data.get("body"):
                    return self.reply([{"status": 400, "message": "The required field 'title' was not supplied."}], 400)
                BC_POSTS[post_id] = {**BC_POSTS.get(post_id, {}), **data, "id": post_id, "url": url}
                LOG.append({"platform": "bigcommerce", "method": method, "id": post_id, "title": data["title"], "url": url, "is_published": data.get("is_published"), "author": data.get("author"), "thumbnail_path": data.get("thumbnail_path"), "body_starts_with_image": data["body"].startswith("<p><img")})
                return self.reply(BC_POSTS[post_id], 201 if method == "POST" else 200)
        if path.startswith("/dav/"):
            length = int(self.headers.get("content-length") or 0)
            data = self.rfile.read(length) if length else b""
            if method not in ("PUT", "DELETE"):
                return self.reply({"message": "Only PUT and DELETE in this mock"}, 405)
            if not digest_ok(auth, method, path):
                self.send_response(401)
                self.send_header("www-authenticate", f'Digest realm="{DAV_REALM}", nonce="{DAV_NONCE}", qop="auth", opaque="{md5("opaque")}"')
                self.send_header("content-length", "0")
                self.end_headers()
                return
            if method == "DELETE":
                DAV_FILES.pop(path, None)
            else:
                DAV_FILES[path] = data
            LOG.append({"platform": "bigcommerce-webdav", "method": method, "path": path, "bytes": len(data), "type": self.headers.get("content-type")})
            self.send_response(204 if method == "DELETE" else 201)
            self.send_header("content-length", "0")
            self.end_headers()
            return

        # ---------------- GoHighLevel (API v2 blogs)
        if path.startswith("/ghl/"):
            query = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}
            if auth != f"Bearer {GHL_TOKEN}":
                return self.reply({"statusCode": 401, "message": "Invalid JWT"}, 401)
            if self.headers.get("version") != "2021-07-28":
                return self.reply({"statusCode": 400, "message": "Version header is missing"}, 400)
            sub = path[len("/ghl"):]
            if method == "GET" and query.get("locationId") not in (None, GHL_LOCATION):
                return self.reply({"statusCode": 403, "message": "The token does not have access to this location"}, 403)
            if sub == "/blogs/site/all":
                return self.reply({"data": [{"_id": "blog-sunny", "name": "Sunny Roofing Blog"}, {"_id": "blog-news", "name": "Company news"}]})
            if sub == "/blogs/authors":
                return self.reply({"authors": [{"_id": "author-dana", "name": "Dana Roofer"}]})
            if sub == "/blogs/categories":
                return self.reply({"categories": [{"_id": "cat-tips", "label": "Roofing tips", "urlSlug": "roofing-tips"}, {"_id": "cat-news", "label": "News", "urlSlug": "news"}]})
            if sub == "/blogs/posts/url-slug-exists":
                taken = any(post.get("urlSlug") == query.get("urlSlug") for post in GHL_POSTS.values())
                return self.reply({"exists": taken})
            pm = re.match(r"^/blogs/posts(?:/([a-z0-9-]+))?$", sub)
            if pm and method in ("POST", "PUT"):
                data = self.body()
                post_id = pm.group(1) or f"post-{len(GHL_POSTS) + 1}"
                if pm.group(1) and post_id not in GHL_POSTS:
                    return self.reply({"statusCode": 404, "message": "Blog post not found"}, 404)
                if data.get("locationId") != GHL_LOCATION:
                    return self.reply({"statusCode": 403, "message": "The token does not have access to this location"}, 403)
                missing = [key for key in ("title", "blogId", "rawHTML", "status", "urlSlug") if not data.get(key)]
                if missing:
                    return self.reply({"statusCode": 422, "message": [f"{key} should not be empty" for key in missing]}, 422)
                GHL_POSTS[post_id] = {**data, "_id": post_id}
                LOG.append({"platform": "gohighlevel", "method": method, "id": post_id, "title": data["title"], "status": data["status"], "urlSlug": data["urlSlug"], "blogId": data["blogId"], "author": data.get("author"), "categories": data.get("categories"), "imageUrl": bool(data.get("imageUrl"))})
                # As documented: create returns the post under "data", update under "updatedBlogPost".
                return self.reply({"data": GHL_POSTS[post_id]} if method == "POST" else {"updatedBlogPost": GHL_POSTS[post_id]}, 201 if method == "POST" else 200)
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
