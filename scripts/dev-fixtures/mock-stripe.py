"""Offline stand-in for the parts of Stripe Vaultio uses, for development only.

Products, prices (with lookup keys), customers, Checkout (a local "Pay" page), subscriptions
(price changes, pause, cancel at period end), invoices, the customer portal, and signed webhooks
sent to the app. All data is in memory and fake.

    STRIPE_WEBHOOK_SECRET=whsec_test APP_WEBHOOK_URL=http://localhost:3000/api/stripe/webhook \
      python3 scripts/dev-fixtures/mock-stripe.py 4600

App env: STRIPE_SECRET_KEY=sk_test_mock STRIPE_API_BASE=http://localhost:4600 STRIPE_WEBHOOK_SECRET=whsec_test

Test helpers: POST /test/renew/<sub_id> bills the next period (paid invoice),
POST /test/fail/<sub_id> makes the subscription past_due.
"""
import hashlib, hmac, json, os, re, sys, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qsl, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4600
SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_test")
WEBHOOK = os.environ.get("APP_WEBHOOK_URL", "http://localhost:3000/api/stripe/webhook")
BASE = f"http://localhost:{PORT}"
DB = {"products": {}, "prices": {}, "customers": {}, "sessions": {}, "subscriptions": {}, "invoices": {}, "coupons": {}}
COUNTER = [0]
LOCK = threading.Lock()
LOG = []
# POST /test/decline/on makes "end trial now" fail as if the card was declined.
DECLINE = [False]


def new_id(prefix):
    COUNTER[0] += 1
    return f"{prefix}_mock{COUNTER[0]:05d}"


def now():
    return int(time.time())


def nested(pairs):
    """Stripe-style form keys (a[b][0][c]=v) to nested dicts/lists."""
    root = {}
    counters = {}
    for key, value in pairs:
        if key.endswith("[]"):  # a[]=x&a[]=y -> a[0], a[1]
            base = key[:-2]
            counters[base] = counters.get(base, -1) + 1
            key = f"{base}[{counters[base]}]"
        parts = re.findall(r"[^\[\]]+", key)
        node = root
        for i, part in enumerate(parts):
            last = i == len(parts) - 1
            nxt = parts[i + 1] if not last else None
            if last:
                node[part] = value
            else:
                if part not in node:
                    node[part] = {}
                node = node[part]
    return listify(root)


def listify(node):
    if isinstance(node, dict):
        node = {k: listify(v) for k, v in node.items()}
        if node and all(k.isdigit() for k in node):
            return [node[k] for k in sorted(node, key=int)]
    return node


def price_obj(price_id, expand_product=False):
    price = dict(DB["prices"][price_id])
    if expand_product:
        price["product"] = DB["products"][price["product"]]
    return price


def sub_obj(sub_id, expand_invoice=False):
    sub = json.loads(json.dumps(DB["subscriptions"][sub_id]))
    for item in sub["items"]["data"]:
        item["price"] = price_obj(item["price"])
    if expand_invoice and sub.get("latest_invoice"):
        sub["latest_invoice"] = DB["invoices"][sub["latest_invoice"]]
    return sub


def sign_and_send(event_type, obj):
    event = {"id": new_id("evt"), "object": "event", "type": event_type, "created": now(), "livemode": False, "api_version": "2026-10-28.endive", "data": {"object": obj}}
    payload = json.dumps(event)
    ts = now()
    signature = hmac.new(SECRET.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(WEBHOOK, data=payload.encode(), method="POST", headers={"content-type": "application/json", "stripe-signature": f"t={ts},v1={signature}"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            LOG.append(f"{event_type} -> {response.status}")
    except Exception as error:  # noqa: BLE001
        LOG.append(f"{event_type} -> {error}")


def send_later(events):
    def run():
        for event_type, obj in events:
            sign_and_send(event_type, obj)
    threading.Thread(target=run, daemon=True).start()


def make_invoice(sub_id, amount, reason):
    sub = DB["subscriptions"][sub_id]
    invoice_id = new_id("in")
    invoice = {
        "id": invoice_id, "object": "invoice", "customer": sub["customer"], "status": "paid", "number": f"MOCK-{COUNTER[0]:04d}",
        "amount_due": amount, "amount_paid": amount, "currency": "usd", "created": now(), "billing_reason": reason,
        "status_transitions": {"finalized_at": now(), "paid_at": now()},
        "invoice_pdf": f"{BASE}/invoices/{invoice_id}.pdf", "hosted_invoice_url": f"{BASE}/invoices/{invoice_id}",
        "parent": {"type": "subscription_details", "subscription_details": {"subscription": sub_id, "metadata": dict(sub["metadata"])}},
    }
    DB["invoices"][invoice_id] = invoice
    sub["latest_invoice"] = invoice_id
    return invoice


def discounted(sub, amount):
    """The amount after the subscription's percent-off coupons."""
    for coupon_id in sub.get("discount_coupons", []):
        coupon = DB["coupons"].get(coupon_id)
        if coupon and coupon.get("percent_off"):
            amount = round(amount * (100 - float(coupon["percent_off"])) / 100)
    return amount


def create_subscription(session):
    price_id = session["line_items"][0]["price"]
    price = DB["prices"][price_id]
    data = session.get("subscription_data", {})
    trial_days = int(data.get("trial_period_days", 0) or 0)
    start = now()
    period_days = 365 if price["recurring"]["interval"] == "year" else 30
    sub_id = new_id("sub")
    DB["subscriptions"][sub_id] = {
        "id": sub_id, "object": "subscription", "customer": session["customer"], "status": "trialing" if trial_days else "active",
        "metadata": data.get("metadata", {}), "cancel_at_period_end": False, "cancel_at": None, "pause_collection": None,
        "trial_end": start + trial_days * 86400 if trial_days else None, "created": start, "latest_invoice": None,
        "items": {"object": "list", "data": [{"id": new_id("si"), "object": "subscription_item", "price": price_id, "quantity": 1,
                                               "current_period_start": start, "current_period_end": start + (trial_days or period_days) * 86400}]},
        "discount_coupons": [entry["coupon"] for entry in session.get("discounts") or [] if entry.get("coupon")],
    }
    sub = DB["subscriptions"][sub_id]
    sub["discounts"] = [f"di_{coupon}" for coupon in sub["discount_coupons"]]
    invoice = make_invoice(sub_id, 0 if trial_days else discounted(sub, price["unit_amount"]), "subscription_create")
    return sub_id, invoice


class Handler(BaseHTTPRequestHandler):
    def reply(self, body, status=200, content_type="application/json"):
        data = (json.dumps(body) if content_type == "application/json" else body).encode()
        self.send_response(status)
        self.send_header("content-type", content_type)
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def redirect(self, location):
        self.send_response(303)
        self.send_header("location", location)
        self.end_headers()

    def params(self):
        url = urlparse(self.path)
        pairs = parse_qsl(url.query, keep_blank_values=True)
        if self.command == "POST":
            length = int(self.headers.get("content-length") or 0)
            pairs += parse_qsl(self.rfile.read(length).decode(), keep_blank_values=True)
        return url.path, nested(pairs)

    def authorized(self):
        return self.headers.get("authorization", "").startswith("Bearer sk_test")

    def do_GET(self):
        path, params = self.params()
        with LOCK:
            if path.startswith("/checkout/"):
                session = DB["sessions"].get(path.split("/")[2])
                if not session:
                    return self.reply("Unknown session", 404, "text/plain")
                price = DB["prices"][session["line_items"][0]["price"]]
                trial = session.get("subscription_data", {}).get("trial_period_days")
                html = (f"<html><body style='font-family:sans-serif;padding:40px'><h1>Mock Stripe Checkout</h1>"
                        f"<p>{DB['products'][price['product']]['name']}: ${price['unit_amount']/100:.2f}/{price['recurring']['interval']}"
                        f"{f' after a {trial}-day free trial' if trial else ''}</p>"
                        + "".join(f"<p>Discount: {DB['coupons'][d['coupon']]['percent_off']:g}% off ({d['coupon']})</p>" for d in session.get("discounts") or [] if d.get("coupon") in DB["coupons"]) +
                        f"<form method='post' action='/checkout/{session['id']}/pay'><button id='pay'>Pay</button></form>"
                        f"<a href='{session['cancel_url']}'>Back</a></body></html>")
                return self.reply(html, 200, "text/html")
            if path == "/portal":
                return self.reply("<html><body><h1>Mock customer portal</h1></body></html>", 200, "text/html")
            if path.startswith("/invoices/"):
                return self.reply("<html><body><h1>Mock invoice</h1></body></html>", 200, "text/html")
            if path == "/log":
                return self.reply({"events": LOG})
            if not self.authorized():
                return self.reply({"error": {"message": "Invalid API key"}}, 401)
            expand = params.get("expand", [])
            match = re.match(r"^/v1/coupons/([^/]+)$", path)
            if match:
                coupon = DB["coupons"].get(match.group(1))
                if not coupon:
                    return self.reply({"error": {"type": "invalid_request_error", "code": "resource_missing", "message": f"No such coupon: '{match.group(1)}'"}}, 404)
                return self.reply(coupon)
            if path == "/v1/prices":
                keys = params.get("lookup_keys", [])
                data = [price_obj(p["id"], "data.product" in expand) for p in DB["prices"].values() if p["lookup_key"] in keys and (params.get("active") != "true" or p["active"])]
                return self.reply({"object": "list", "data": data, "has_more": False, "url": "/v1/prices"})
            match = re.match(r"^/v1/checkout/sessions/([^/]+)$", path)
            if match and match.group(1) in DB["sessions"]:
                session = dict(DB["sessions"][match.group(1)])
                if session.get("subscription") and any(e.startswith("subscription") for e in expand):
                    session["subscription"] = sub_obj(session["subscription"], "subscription.latest_invoice" in expand)
                return self.reply(session)
            match = re.match(r"^/v1/subscriptions/([^/]+)$", path)
            if match and match.group(1) in DB["subscriptions"]:
                return self.reply(sub_obj(match.group(1)))
        return self.reply({"error": {"message": f"No such route {path}"}}, 404)

    def do_DELETE(self):
        path, params = self.params()
        with LOCK:
            if not self.authorized():
                return self.reply({"error": {"message": "Invalid API key"}}, 401)
            match = re.match(r"^/v1/subscriptions/([^/]+)$", path)
            if match and match.group(1) in DB["subscriptions"]:
                sub_id = match.group(1)
                sub = DB["subscriptions"][sub_id]
                sub["status"] = "canceled"
                sub["canceled_at"] = now()
                LOG.append({"canceled": sub_id, "prorate": params.get("prorate"), "invoice_now": params.get("invoice_now")})
                send_later([("customer.subscription.deleted", sub_obj(sub_id))])
                return self.reply(sub_obj(sub_id))
        return self.reply({"error": {"message": f"No such route {path}"}}, 404)

    def do_POST(self):
        path, params = self.params()
        with LOCK:
            match = re.match(r"^/checkout/([^/]+)/pay$", path)
            if match:
                session = DB["sessions"][match.group(1)]
                sub_id, invoice = create_subscription(session)
                session.update({"status": "complete", "payment_status": "paid", "subscription": sub_id})
                send_later([("checkout.session.completed", dict(session)), ("customer.subscription.created", sub_obj(sub_id)), ("invoice.paid", invoice)])
                return self.redirect(session["success_url"].replace("{CHECKOUT_SESSION_ID}", session["id"]))
            match = re.match(r"^/test/decline/(on|off)$", path)
            if match:
                DECLINE[0] = match.group(1) == "on"
                return self.reply({"decline": DECLINE[0]})
            match = re.match(r"^/test/(renew|fail)/([^/]+)$", path)
            if match:
                action, sub_id = match.groups()
                sub = DB["subscriptions"][sub_id]
                item = sub["items"]["data"][0]
                if action == "renew":
                    price = DB["prices"][item["price"]]
                    item["current_period_start"] = item["current_period_end"]
                    item["current_period_end"] += (365 if price["recurring"]["interval"] == "year" else 30) * 86400
                    sub["status"] = "active"
                    invoice = make_invoice(sub_id, discounted(sub, price["unit_amount"]), "subscription_cycle")
                    send_later([("customer.subscription.updated", sub_obj(sub_id)), ("invoice.paid", invoice)])
                else:
                    sub["status"] = "past_due"
                    send_later([("customer.subscription.updated", sub_obj(sub_id))])
                return self.reply({"ok": True})
            if not self.authorized():
                return self.reply({"error": {"message": "Invalid API key"}}, 401)
            if path == "/v1/customers":
                customer = {"id": new_id("cus"), "object": "customer", "email": params.get("email"), "name": params.get("name"), "metadata": params.get("metadata", {})}
                DB["customers"][customer["id"]] = customer
                return self.reply(customer)
            if path == "/v1/products":
                product = {"id": new_id("prod"), "object": "product", "name": params.get("name"), "active": True, "metadata": params.get("metadata", {})}
                DB["products"][product["id"]] = product
                return self.reply(product)
            if path == "/v1/prices":
                price = {"id": new_id("price"), "object": "price", "product": params["product"], "currency": params.get("currency", "usd"), "unit_amount": int(params["unit_amount"]),
                         "recurring": {"interval": params["recurring"]["interval"]}, "lookup_key": params.get("lookup_key"), "active": True, "metadata": params.get("metadata", {})}
                DB["prices"][price["id"]] = price
                return self.reply(price)
            if path == "/v1/checkout/sessions":
                session_id = new_id("cs")
                session = {"id": session_id, "object": "checkout.session", "mode": "subscription", "status": "open", "customer": params.get("customer"),
                           "client_reference_id": params.get("client_reference_id"), "line_items": params["line_items"], "metadata": params.get("metadata", {}),
                           "subscription_data": params.get("subscription_data", {}), "success_url": params["success_url"], "cancel_url": params["cancel_url"],
                           "discounts": params.get("discounts") or [], "allow_promotion_codes": params.get("allow_promotion_codes") == "true",
                           "subscription": None, "url": f"{BASE}/checkout/{session_id}"}
                if session["discounts"] and session["allow_promotion_codes"]:
                    return self.reply({"error": {"type": "invalid_request_error", "message": "You may only specify one of these parameters: allow_promotion_codes, discounts."}}, 400)
                for entry in session["discounts"]:
                    if entry.get("coupon") not in DB["coupons"]:
                        return self.reply({"error": {"type": "invalid_request_error", "message": f"No such coupon: '{entry.get('coupon')}'"}}, 400)
                DB["sessions"][session_id] = session
                LOG.append({"checkout": session_id, "discounts": session["discounts"], "allow_promotion_codes": session["allow_promotion_codes"]})
                return self.reply(session)
            if path == "/v1/coupons":
                coupon = {"id": params.get("id") or new_id("co"), "object": "coupon", "percent_off": float(params["percent_off"]) if params.get("percent_off") else None,
                          "duration": params.get("duration", "once"), "name": params.get("name"), "valid": True}
                if coupon["id"] in DB["coupons"]:
                    return self.reply({"error": {"type": "invalid_request_error", "message": "Coupon already exists."}}, 400)
                DB["coupons"][coupon["id"]] = coupon
                return self.reply(coupon)
            if path == "/v1/billing_portal/sessions":
                return self.reply({"id": new_id("bps"), "object": "billing_portal.session", "url": f"{BASE}/portal", "return_url": params.get("return_url")})
            match = re.match(r"^/v1/subscriptions/([^/]+)$", path)
            if match and match.group(1) in DB["subscriptions"]:
                sub_id = match.group(1)
                sub = DB["subscriptions"][sub_id]
                events = []
                if "cancel_at_period_end" in params:
                    sub["cancel_at_period_end"] = params["cancel_at_period_end"] == "true"
                if "pause_collection" in params:
                    sub["pause_collection"] = params["pause_collection"] or None
                if "metadata" in params:
                    sub["metadata"].update(params["metadata"])
                if "cancellation_details" in params:
                    sub["cancellation_details"] = params["cancellation_details"]
                    LOG.append({"cancellation_details": params["cancellation_details"]})
                if "discounts" in params:
                    sub["discounts"] = params["discounts"]
                    sub["discount_coupons"] = [entry["coupon"] for entry in params["discounts"] or [] if isinstance(entry, dict) and entry.get("coupon")]
                    LOG.append({"discounts": params["discounts"]})
                if params.get("trial_end") == "now":
                    amount = discounted(sub, DB["prices"][sub["items"]["data"][0]["price"]]["unit_amount"])
                    sub["trial_end"] = None
                    if DECLINE[0]:
                        sub["status"] = "past_due"
                        invoice = make_invoice(sub_id, amount, "subscription_cycle")
                        invoice["status"] = "open"
                        invoice["paid"] = False
                    else:
                        sub["status"] = "active"
                        invoice = make_invoice(sub_id, amount, "subscription_cycle")
                    invoice["hosted_invoice_url"] = f"{BASE}/invoice/{invoice['id']}"
                    sub["latest_invoice"] = invoice["id"]
                    events.append(("invoice.paid" if not DECLINE[0] else "invoice.payment_failed", invoice))
                if "items" in params:
                    item = sub["items"]["data"][0]
                    old = DB["prices"][item["price"]]["unit_amount"]
                    item["price"] = params["items"][0]["price"]
                    new = DB["prices"][item["price"]]["unit_amount"]
                    if params.get("proration_behavior") == "always_invoice" and new > old:
                        events.append(("invoice.paid", make_invoice(sub_id, new - old, "subscription_update")))
                send_later([("customer.subscription.updated", sub_obj(sub_id))] + events)
                return self.reply(sub_obj(sub_id, expand_invoice="latest_invoice" in json.dumps(params.get("expand", ""))))
        return self.reply({"error": {"message": f"No such route {path}"}}, 404)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"Stripe mock on {BASE} (webhooks to {WEBHOOK})")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
