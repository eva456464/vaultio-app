"""Offline stand-in for a client's WordPress site with existing posts, for development only.

Serves the WordPress REST API (posts list, a post in edit context, post updates) and the live post
pages, so improvements of posts Vaultio didn't write can be tested end to end; every other path is
served from the static test site. Posts are kept in memory and reset on restart. Run it on the test
site's own address instead of serve-testsite.py (sunnyroofing.test resolves to 127.0.0.1 in
/etc/hosts), then connect WordPress in Settings -> Publishing with site URL
http://sunnyroofing.test, any username and any 16+ character application password:

    sudo python3 scripts/dev-fixtures/mock-wordpress.py 80
"""
import datetime as dt, html, json, os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
TESTSITE = os.path.join(HERE, "testsite")
SITE = "http://sunnyroofing.test"


def read(name):
    with open(os.path.join(HERE, "wordpress", name)) as handle:
        return handle.read()


POSTS = {
    # Block editor post; the SEO title and description come from the post title and excerpt.
    101: {"slug": "metal-roof-cost", "title": "How Much Does a Metal Roof Cost?", "modified": "2025-02-14T17:20:00",
          "excerpt": "Metal roofs cost $14,000 to $28,000 on a typical Santa Barbara house. See prices by panel type and whether metal is worth it.",
          "content": read("metal-roof-cost.html")},
    # Classic editor post; the SEO plugin (Yoast) has a custom title and description.
    102: {"slug": "flat-roof-leaks", "title": "Why Flat Roofs Leak (and How to Fix Them)", "modified": "2026-01-20T09:05:00", "excerpt": "",
          "seo": {"title": "Flat Roof Leak Repair Guide | Sunny Roofing", "description": "Flat roof leaking? The 3 most common causes, what a repair costs and when to call a roofer in Santa Barbara."},
          "content": read("flat-roof-leaks.html")},
    # Built with Elementor: the page shows Elementor's own copy, not the post content.
    103: {"slug": "roof-inspection-checklist", "title": "Roof Inspection Checklist", "modified": "2025-06-02T12:00:00", "excerpt": "", "elementor": True,
          "content": "<h2>Before the inspection</h2>\n<p>Clear the attic access and note any stains.</p>"},
    # Not in Search Console.
    104: {"slug": "company-picnic", "title": "Our 2025 Company Picnic", "modified": "2025-08-01T10:00:00", "excerpt": "",
          "content": "<!-- wp:paragraph -->\n<p>Thanks to everyone who came!</p>\n<!-- /wp:paragraph -->"},
    # Written by Vaultio (the article's WordPress post id is 99): left to the Vaultio improvement path.
    99: {"slug": "how-long-does-a-roof-last", "title": "How Long Does a Roof Last?", "modified": "2026-09-01T08:00:00", "excerpt": "",
         "content": "<p>Written by Vaultio.</p>"},
}


MEDIA = []


def texturize(text):
    return html.escape(text, quote=False).replace("'", "&#8217;")


def post_json(post_id, context):
    post = POSTS[post_id]
    link = f"{SITE}/blog/{post['slug']}/"
    auto_excerpt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>|<!--.*?-->|\[[^\]]*\]", " ", post["content"])).strip()[:150] + " [&hellip;]"
    body = {
        "id": post_id, "date_gmt": "2024-11-05T10:00:00", "modified_gmt": post["modified"], "slug": post["slug"], "status": "publish", "type": "post", "link": link,
        "title": {"rendered": texturize(post["title"])},
        "content": {"rendered": post["content"], "protected": False},
        "excerpt": {"rendered": f"<p>{texturize(post['excerpt']) if post['excerpt'] else auto_excerpt}</p>\n", "protected": False},
    }
    if context == "edit":
        body["title"]["raw"] = post["title"]
        body["content"]["raw"] = post["content"]
        body["excerpt"]["raw"] = post["excerpt"]
    if post.get("seo"):
        body["yoast_head_json"] = {"title": post["seo"]["title"], "description": post["seo"]["description"]}
    return body


def live_page(post_id):
    post = POSTS[post_id]
    seo = post.get("seo") or {"title": f"{post['title']} - Sunny Roofing", "description": post["excerpt"] or None}
    meta = f'<meta name="description" content="{html.escape(seo["description"])}" />' if seo.get("description") else ""
    body = (f'<div data-elementor-type="wp-post" data-elementor-id="{post_id}" class="elementor elementor-{post_id}"><section class="elementor-section">Elementor copy</section></div>'
            if post.get("elementor") else post["content"])
    return f"<!doctype html><html><head><title>{html.escape(seo['title'])}</title>{meta}</head><body><article><h1>{texturize(post['title'])}</h1>{body}</article></body></html>"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=TESTSITE, **kwargs)

    def reply(self, code, body, headers=None, content_type="application/json"):
        data = (json.dumps(body) if content_type == "application/json" else body).encode()
        self.send_response(code)
        self.send_header("content-type", content_type)
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def authorized(self):
        if self.headers.get("authorization", "").startswith("Basic "):
            return True
        self.reply(401, {"code": "rest_not_logged_in", "message": "You are not currently logged in."})
        return False

    def do_GET(self):
        url = urlparse(self.path)
        query = {key: values[-1] for key, values in parse_qs(url.query).items()}
        if url.path == "/wp-json/wp/v2/users/me":
            return self.authorized() and self.reply(200, {"id": 1, "name": "Owner"})
        if url.path == "/wp-json/wp/v2/posts":
            if query.get("context") == "edit" and not self.authorized():
                return
            ids = sorted(POSTS, key=lambda i: POSTS[i]["modified"], reverse=True)
            if query.get("include"):
                wanted = [int(i) for i in query["include"].split(",")]
                ids = [i for i in ids if i in wanted]
            per_page, page = int(query.get("per_page", 10)), int(query.get("page", 1))
            pages = max(1, -(-len(ids) // per_page))
            if page > pages:
                return self.reply(400, {"code": "rest_post_invalid_page_number", "message": "The page number requested is larger than the number of pages available."})
            fields = query.get("_fields", "").split(",") if query.get("_fields") else None
            items = [post_json(i, query.get("context")) for i in ids[(page - 1) * per_page:page * per_page]]
            if fields:
                items = [{key: value for key, value in item.items() if key in fields} for item in items]
            return self.reply(200, items, {"X-WP-Total": str(len(ids)), "X-WP-TotalPages": str(pages)})
        single = re.match(r"^/wp-json/wp/v2/posts/(\d+)$", url.path)
        if single:
            post_id = int(single.group(1))
            if post_id not in POSTS:
                return self.reply(404, {"code": "rest_post_invalid_id", "message": "Invalid post ID."})
            if query.get("context") == "edit" and not self.authorized():
                return
            return self.reply(200, post_json(post_id, query.get("context")))
        page = re.match(r"^/blog/([\w-]+)/?$", url.path)
        if page:
            for post_id, post in POSTS.items():
                if post["slug"] == page.group(1):
                    return self.reply(200, live_page(post_id), content_type="text/html; charset=utf-8")
        # Everything else is the static test site (same rules as serve-testsite.py).
        if not os.path.splitext(url.path)[1] and url.path != "/" and os.path.exists(os.path.join(TESTSITE, url.path.lstrip("/") + ".html")):
            self.path = url.path + ".html"
        return super().do_GET()

    def do_POST(self):
        url = urlparse(self.path)
        if not self.authorized():
            return
        length = int(self.headers.get("content-length", 0))
        if url.path == "/wp-json/wp/v2/media":
            self.rfile.read(length)
            media_id = 500 + len(MEDIA) + 1
            MEDIA.append(media_id)
            return self.reply(201, {"id": media_id, "source_url": f"{SITE}/wp-content/uploads/{media_id}.webp"})
        if url.path == "/wp-json/wp/v2/posts":
            # A new article published by Vaultio.
            fields = json.loads(self.rfile.read(length) or b"{}")
            post_id = max(POSTS) + 1
            POSTS[post_id] = {"slug": fields.get("slug") or f"post-{post_id}", "title": fields.get("title", ""), "excerpt": fields.get("excerpt", ""),
                              "content": fields.get("content", ""), "modified": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")}
            print(f"created post {post_id}", flush=True)
            return self.reply(201, post_json(post_id, "edit"))
        single = re.match(r"^/wp-json/wp/v2/posts/(\d+)$", url.path)
        if not single:
            return self.reply(404, {"code": "rest_no_route", "message": "No route was found."})
        post_id = int(single.group(1))
        if post_id not in POSTS:
            return self.reply(404, {"code": "rest_post_invalid_id", "message": "Invalid post ID."})
        fields = json.loads(self.rfile.read(length) or b"{}")
        post = POSTS[post_id]
        for key in ("content", "title", "excerpt", "slug"):
            if key in fields:
                post[key] = fields[key]
        post["modified"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        print(f"updated post {post_id}: {', '.join(k for k in fields)}", flush=True)
        self.reply(200, post_json(post_id, "edit"))

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 80), Handler).serve_forever()
