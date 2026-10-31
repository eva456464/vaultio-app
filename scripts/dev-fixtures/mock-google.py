"""Offline stand-in for Google OAuth, Analytics (GA4) and Search Console, for development only.

Run it, then set GOOGLE_API_MOCK_URL=http://localhost:4400 (plus any GOOGLE_CLIENT_ID / SECRET)
so the app talks to it instead of Google. The numbers are deterministic fake test data.

    python3 scripts/dev-fixtures/mock-google.py 4400
"""
import base64, datetime as dt, hashlib, json, re, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

TODAY = dt.date.today()
GA4_START = dt.date(2025, 9, 1)  # property creation
GSC_START = dt.date(2026, 3, 1)
PAGES = ["/", "/services/roof-repair", "/blog/how-long-does-a-roof-last", "/about", "/contact", "/blog/metal-roof-cost",
         "/services/roof-replacement", "/services/gutters", "/areas/santa-barbara", "/areas/goleta", "/blog/flat-roof-leaks",
         "/blog/roof-inspection-checklist", "/reviews", "/financing"]
PAGE_WEIGHT = [40, 20, 15, 10, 8, 7, 6, 5, 5, 4, 4, 3, 3, 2]
SOURCES = [  # source, default channel group, base daily users
    ("(direct)", "Direct", 9), ("google", "Organic Search", 6), ("bing", "Organic Search", 1),
    ("facebook.com", "Organic Social", 1), ("google", "Paid Search", 1),
    ("chatgpt.com", "Referral", 0.5), ("perplexity.ai", "Referral", 0.25), ("gemini.google.com", "Referral", 0.15),
    ("copilot.microsoft.com", "Referral", 0.08), ("claude.ai", "Referral", 0.08),
]
QUERIES = ["roof repair santa barbara", "metal roof cost", "how long does a roof last", "roofers near me", "sunny roofing", "roof inspection goleta",
           "roof replacement cost", "gutter cleaning santa barbara", "flat roof leak repair", "roof inspection checklist", "roofing financing", "emergency roof repair"]
COUNTRIES = ["usa", "can", "gbr", "ind"]
SITE = "https://sunnyroofing.test"


def noise(*parts):
    return int(hashlib.md5("|".join(map(str, parts)).encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def days(start, end, first):
    day = max(dt.date.fromisoformat(start), first)
    last = min(dt.date.fromisoformat(end), TODAY)
    while day <= last:
        yield day
        day += dt.timedelta(days=1)


def ga4_users(day, source_index, page_index):
    source, _, base = SOURCES[source_index]
    weekly = 1.25 if day.weekday() < 5 else 0.7
    expected = base * weekly * PAGE_WEIGHT[page_index] / 100 * (1 + (day - GA4_START).days / 400)
    return int(expected + noise(day, source_index, page_index))


def ga4_report(req):
    rng = req["dateRanges"][0]
    dims = [d["name"] for d in req.get("dimensions", [])]
    mets = [m["name"] for m in req.get("metrics", [])]
    flt = (req.get("dimensionFilter") or {}).get("filter")
    rows = {}
    for day in days(rng["startDate"], rng["endDate"], GA4_START):
        for si, (source, group, _) in enumerate(SOURCES):
            if flt and not re.search(flt["stringFilter"]["value"], source if flt["fieldName"] == "sessionSource" else group, re.I):
                continue
            for pi, page in enumerate(PAGES):
                users = ga4_users(day, si, pi)
                if not users:
                    continue
                values = {"date": day.strftime("%Y%m%d"), "sessionSource": source, "sessionDefaultChannelGroup": group, "pagePath": page, "landingPage": page}
                key = tuple(values[d] for d in dims)
                total = rows.setdefault(key, {"activeUsers": 0, "sessions": 0})
                total["activeUsers"] += users
                total["sessions"] += users + (1 if noise(day, si, pi, "s") > 0.8 else 0)
    ordered = sorted(rows.items(), key=lambda item: -item[1][mets[0]])
    offset, limit = int(req.get("offset", 0)), int(req.get("limit", 10000))
    return {
        "rows": [{"dimensionValues": [{"value": v} for v in key], "metricValues": [{"value": str(m[name])} for name in mets]} for key, m in ordered[offset:offset + limit]],
        "rowCount": len(ordered),
    }


def gsc_report(req):
    dims = req.get("dimensions", [])
    only_page = next((f["expression"] for g in req.get("dimensionFilterGroups", []) for f in g.get("filters", []) if f.get("dimension") == "page"), None)
    rows = {}
    for day in days(req["startDate"], min(req["endDate"], str(TODAY - dt.timedelta(days=2))), GSC_START):
        growth = 1 + (day - GSC_START).days / 120
        for pi, page in enumerate(PAGES):
            for qi, query in enumerate(QUERIES):
                for ci, country in enumerate(COUNTRIES):
                    impressions = int(PAGE_WEIGHT[pi] * (12 - qi) * (4 - ci) / 36 * growth * (0.6 + noise(day, pi, qi, ci)))
                    if not impressions:
                        continue
                    position = 3 + qi * 4 + pi * 1.5 + noise(day, pi, qi, ci, "p") * 3
                    clicks = int(impressions * max(0.01, 0.3 - position / 100) + noise(day, pi, qi, ci, "c"))
                    values = {"date": str(day), "page": SITE + page, "query": query, "country": country}
                    if only_page and values["page"] != only_page:
                        continue
                    key = tuple(values[d] for d in dims)
                    total = rows.setdefault(key, [0, 0, 0.0])
                    total[0] += clicks
                    total[1] += impressions
                    total[2] += position * impressions
    ordered = sorted(rows.items(), key=lambda item: -item[1][0])
    start, limit = int(req.get("startRow", 0)), int(req.get("rowLimit", 1000))
    return {"rows": [{"keys": list(key), "clicks": c, "impressions": i, "ctr": c / i if i else 0, "position": p / i if i else 0} for key, (c, i, p) in ordered[start:start + limit]]}


def jwt(payload):
    enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")
    return f"{enc({'alg': 'none'})}.{enc(payload)}.sig"


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body, headers=None):
        data = json.dumps(body).encode()
        self.send_response(code)
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        raw = self.rfile.read(int(self.headers.get("content-length") or 0))
        return raw.decode()

    def authorized(self):
        return (self.headers.get("authorization") or "").startswith("Bearer mock-access-")

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/oauth/authorize":
            q = parse_qs(url.query)
            target = f"{q['redirect_uri'][0]}?code=mock-code&state={quote(q['state'][0])}"
            self.send_response(302)
            self.send_header("location", target)
            self.end_headers()
            return
        if not self.authorized():
            return self.reply(401, {"error": {"message": "Request had invalid authentication credentials.", "status": "UNAUTHENTICATED"}})
        if url.path == "/analyticsadmin/v1beta/accountSummaries":
            return self.reply(200, {"accountSummaries": [
                {"displayName": "Sunny Roofing", "propertySummaries": [{"property": "properties/111", "displayName": "sunnyroofing.test - GA4"}]},
                {"displayName": "Another client", "propertySummaries": [{"property": "properties/222", "displayName": "another-site.example"}]},
            ]})
        if url.path.startswith("/analyticsadmin/v1beta/properties/"):
            return self.reply(200, {"createTime": f"{GA4_START}T10:00:00Z", "timeZone": "America/Los_Angeles"})
        if url.path == "/webmasters/v3/sites":
            return self.reply(200, {"siteEntry": [
                {"siteUrl": "sc-domain:sunnyroofing.test", "permissionLevel": "siteOwner"},
                {"siteUrl": "https://unverified.example/", "permissionLevel": "siteUnverifiedUser"},
            ]})
        self.reply(404, {"error": {"message": "Not found"}})

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/oauth/token":
            form = parse_qs(self.body())
            grant = form.get("grant_type", [""])[0]
            if grant == "authorization_code" and form.get("code") == ["mock-code"]:
                return self.reply(200, {"access_token": "mock-access-1", "refresh_token": "mock-refresh", "expires_in": 3600,
                                        "id_token": jwt({"email": "owner@sunnyroofing.test", "name": "Test Owner"})})
            if grant == "refresh_token" and form.get("refresh_token") == ["mock-refresh"]:
                return self.reply(200, {"access_token": "mock-access-2", "expires_in": 3600})
            return self.reply(400, {"error": "invalid_grant", "error_description": "Token has been expired or revoked."})
        if url.path == "/oauth/revoke":
            return self.reply(200, {})
        if not self.authorized():
            return self.reply(401, {"error": {"message": "Request had invalid authentication credentials.", "status": "UNAUTHENTICATED"}})
        payload = json.loads(self.body() or "{}")
        if url.path.endswith(":runReport"):
            return self.reply(200, ga4_report(payload))
        if url.path.endswith(":batchRunReports"):
            return self.reply(200, {"reports": [ga4_report(r) for r in payload.get("requests", [])]})
        match = re.match(r"^/webmasters/v3/sites/([^/]+)/searchAnalytics/query$", url.path)
        if match and unquote(match.group(1)) == "sc-domain:sunnyroofing.test":
            return self.reply(200, gsc_report(payload))
        self.reply(404, {"error": {"message": "Not found"}})

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 4400), Handler).serve_forever()
