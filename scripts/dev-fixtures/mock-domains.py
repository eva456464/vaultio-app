"""Offline stand-in for Vercel's project-domain API and Resend's domain + email APIs, for development only.

    python3 scripts/dev-fixtures/mock-domains.py 4700

App env: VERCEL_TOKEN=test VERCEL_PROJECT_ID=prj_test VERCEL_API_BASE=http://localhost:4700
         RESEND_API_KEY=re_test RESEND_API_BASE=http://localhost:4700

Domains stay unverified until their DNS is "added": POST /test/dns/<domain> (hosting) or
POST /test/email-dns/<domain> (sending). Sent emails are listed at GET /test/emails.
"""
import json, re, sys, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4700
PROJECT_DOMAINS, DNS_READY = {}, set()
EMAIL_DOMAINS, EMAIL_READY, SENT = {}, set(), []


def apex(domain):
    return ".".join(domain.split(".")[-2:])


def project_domain(name):
    ready = name in DNS_READY
    body = {"name": name, "apexName": apex(name), "projectId": "prj_test", "verified": ready}
    if not ready:
        body["verification"] = [{"type": "TXT", "domain": f"_vercel.{apex(name)}", "value": f"vc-domain-verify={name},mock123", "reason": "pending_domain_verification"}]
    return body


def email_domain(domain_id):
    domain = EMAIL_DOMAINS[domain_id]
    ready = domain["name"] in EMAIL_READY
    sub = domain["name"].split(".")[0]
    status = "verified" if ready else domain["status"]
    records = [
        {"record": "SPF", "name": f"send.{sub}", "type": "MX", "ttl": "Auto", "status": "verified" if ready else "pending", "value": "feedback-smtp.us-east-1.amazonses.com", "priority": 10},
        {"record": "SPF", "name": f"send.{sub}", "type": "TXT", "ttl": "Auto", "status": "verified" if ready else "pending", "value": "v=spf1 include:amazonses.com ~all"},
        {"record": "DKIM", "name": f"resend._domainkey.{sub}", "type": "TXT", "ttl": "Auto", "status": "verified" if ready else "pending", "value": "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADmock"},
    ]
    return {"object": "domain", "id": domain_id, "name": domain["name"], "status": status, "created_at": domain["created_at"], "region": "us-east-1", "records": records}


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
        return json.loads(self.rfile.read(length) or b"{}") if length else {}

    def route(self, method):
        path = unquote(urlparse(self.path).path)
        if path == "/test/emails":
            return self.reply({"emails": SENT})
        if not self.headers.get("authorization", "").startswith("Bearer "):
            if not path.startswith("/test/"):
                return self.reply({"error": {"message": "unauthorized"}}, 401)
        m = re.match(r"^/test/(dns|email-dns)/(.+)$", path)
        if m and method == "POST":
            (DNS_READY if m.group(1) == "dns" else EMAIL_READY).add(m.group(2))
            return self.reply({"ok": True})
        # Vercel
        if re.match(r"^/v10/projects/[^/]+/domains$", path) and method == "POST":
            name = self.body()["name"]
            if name in PROJECT_DOMAINS:
                return self.reply({"error": {"code": "domain_already_in_use", "message": "Domain already added"}}, 409)
            PROJECT_DOMAINS[name] = True
            return self.reply(project_domain(name))
        m = re.match(r"^/v9/projects/[^/]+/domains/([^/]+)(/verify)?$", path)
        if m:
            name = m.group(1)
            if name not in PROJECT_DOMAINS:
                return self.reply({"error": {"code": "not_found", "message": "Domain not found"}}, 404)
            if method == "DELETE":
                PROJECT_DOMAINS.pop(name, None)
                return self.reply({})
            if m.group(2) and name not in DNS_READY:
                return self.reply({"error": {"code": "missing_txt_record", "message": "TXT record not found"}}, 400)
            return self.reply(project_domain(name))
        m = re.match(r"^/v6/domains/([^/]+)/config$", path)
        if m:
            ready = m.group(1) in DNS_READY
            return self.reply({"configuredBy": "CNAME" if ready else None, "misconfigured": not ready, "recommendedCNAME": [{"rank": 1, "value": "mock4f2a.vercel-dns-016.com."}, {"rank": 2, "value": "cname.vercel-dns.com."}]})
        # Resend
        if path == "/domains" and method == "POST":
            name = self.body()["name"]
            for domain_id, domain in EMAIL_DOMAINS.items():
                if domain["name"] == name:
                    return self.reply({"name": "validation_error", "message": "Domain already exists"}, 403)
            domain_id = str(uuid.uuid4())
            EMAIL_DOMAINS[domain_id] = {"name": name, "status": "not_started", "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
            return self.reply(email_domain(domain_id))
        if path == "/domains" and method == "GET":
            return self.reply({"object": "list", "data": [email_domain(i) for i in EMAIL_DOMAINS]})
        m = re.match(r"^/domains/([^/]+)(/verify)?$", path)
        if m and m.group(1) in EMAIL_DOMAINS:
            domain_id = m.group(1)
            if method == "DELETE":
                EMAIL_DOMAINS.pop(domain_id)
                return self.reply({"object": "domain", "id": domain_id, "deleted": True})
            if m.group(2):
                EMAIL_DOMAINS[domain_id]["status"] = "pending"
                return self.reply({"object": "domain", "id": domain_id})
            return self.reply(email_domain(domain_id))
        if path == "/emails" and method == "POST":
            email = self.body()
            SENT.append({"from": email.get("from"), "to": email.get("to"), "subject": email.get("subject"), "html": email.get("html", "")[:4000]})
            return self.reply({"id": str(uuid.uuid4())})
        return self.reply({"message": f"No route {method} {path}"}, 404)

    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def do_DELETE(self):
        self.route("DELETE")

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"Vercel/Resend domain mock on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
