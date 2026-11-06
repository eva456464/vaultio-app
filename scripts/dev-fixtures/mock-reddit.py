"""Offline stand-in for the Reddit Data API (application-only OAuth + /api/info), for development only.

Run it, then set REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET (any values) and
REDDIT_AUTH_URL=REDDIT_API_URL=http://localhost:4500 so the agents fetch thread details from here.
Details are deterministic fake test data; thread "rf0004" is archived so it gets filtered out.

    python3 scripts/dev-fixtures/mock-reddit.py 4500
"""
import hashlib, json, re, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ARCHIVED = {"rf0004"}


def noise(*parts):
    return int(hashlib.md5("|".join(map(str, parts)).encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


class Handler(BaseHTTPRequestHandler):
    def send_json(self, body, status=200):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if urlparse(self.path).path == "/api/v1/access_token":
            self.rfile.read(int(self.headers.get("content-length") or 0))
            if not self.headers.get("authorization", "").startswith("Basic "):
                return self.send_json({"error": "unauthorized"}, 401)
            return self.send_json({"access_token": "mock-reddit-token", "token_type": "bearer", "expires_in": 86400, "scope": "*"})
        self.send_json({"error": "not found"}, 404)

    def do_GET(self):
        url = urlparse(self.path)
        if self.headers.get("authorization") != "Bearer mock-reddit-token":
            return self.send_json({"error": "unauthorized"}, 401)
        hot = re.match(r"^/r/([A-Za-z0-9_]+)/hot$", url.path)
        if hot:
            sub = hot.group(1)
            titles = [("Weekly megathread: ask anything", True, False), (f"Is it worth fixing a leak myself or calling a pro? ({sub})", False, False),
                      ("Look at this sunset from my roof", False, False), ("Got three quotes for a full replacement, which one would you pick?", False, False),
                      ("[Locked] old drama thread", False, True)]
            children = []
            for i, (title, stickied, locked) in enumerate(titles):
                post_id = f"hot{sub[:3].lower()}{i}"
                children.append({"kind": "t3", "data": {"id": post_id, "subreddit": sub, "title": title, "selftext": f"Trending test post {i} in r/{sub}.",
                                 "author": f"hot_user_{i}", "score": 40 + i * 25, "num_comments": 10 + i * 7, "created_utc": time.time() - (i + 1) * 3600,
                                 "permalink": f"/r/{sub}/comments/{post_id}/test_post_{i}/", "stickied": stickied, "locked": locked, "archived": False,
                                 "over_18": False, "removed_by_category": None}})
            return self.send_json({"kind": "Listing", "data": {"children": children}})
        if url.path != "/api/info":
            return self.send_json({"error": "not found"}, 404)
        ids = [i.removeprefix("t3_") for i in parse_qs(url.query).get("id", [""])[0].split(",") if i]
        children = []
        for post_id in ids:
            age_days = 2 + int(noise(post_id, "age") * 200)
            children.append({"kind": "t3", "data": {
                "id": post_id,
                "subreddit": "",  # the agent keeps the subreddit and title from the search result
                "title": "",
                "selftext": "Test post body for " + post_id + ". Looking for advice before the rainy season.",
                "author": "test_user_" + post_id[-2:],
                "score": int(noise(post_id, "score") * 180),
                "num_comments": int(noise(post_id, "comments") * 60),
                "created_utc": time.time() - age_days * 86400,
                "archived": post_id in ARCHIVED,
                "locked": False,
                "over_18": False,
                "removed_by_category": None,
            }})
        self.send_json({"kind": "Listing", "data": {"children": children}})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4500
    print(f"Reddit mock on http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
