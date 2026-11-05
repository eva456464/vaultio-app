"""Offline stand-in for the Anthropic Messages API, for clicking through AI features in development.

    python3 scripts/dev-fixtures/mock-anthropic.py 4950

Run the app with ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://localhost:4950. Structured
answers are built from the request's JSON schema (with sensible text for the editor's fields);
streamed answers return a short markdown article. It's a test double, not a model: answers are canned.
Requests are listed at GET /test/log.
"""
import json, re, sys, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4950
LOG = []


def text_of(content):
    if isinstance(content, str):
        return content
    return " ".join(part.get("text", "") for part in content if isinstance(part, dict))


def sample(schema, name, context):
    kind = schema.get("type")
    if "anyOf" in schema:
        return sample(schema["anyOf"][0], name, context)
    if kind == "object":
        return {key: sample(value, key, context) for key, value in schema.get("properties", {}).items()}
    if kind == "array":
        if name == "proposals":
            first = re.search(r"\[0\] (<p>.*?</p>)", context)
            return [{"blockIndex": 0, "html": "<p>Most roofs last 20 to 30 years, and the material matters most.</p>", "reason": "A shorter, answer-first opening."}] if first else []
        return [sample(schema.get("items", {}), name, context) for _ in range(max(1, schema.get("minItems", 1)))]
    if kind == "boolean":
        return True
    if kind in ("integer", "number"):
        return 1
    if name == "html":
        if "<table" in context or "table" in context.lower() and "Turn this content" in context:
            return "<table><thead><tr><th>Material</th><th>Lifespan</th></tr></thead><tbody><tr><td>Asphalt</td><td>20–30 years</td></tr><tr><td>Metal</td><td>40–70 years</td></tr></tbody></table>"
        if "inline HTML only" in context:
            return "<strong>clearer</strong> wording"
        if "bulleted list" in context:
            return "<ul><li>First point</li><li>Second point</li></ul>"
        return "<p>A clearer, shorter version of this passage.</p>"
    if name == "answer":
        return "The article answers its main question in the first paragraph and is well structured. The opening could be a little shorter."
    return f"Sample {name}"


class Handler(BaseHTTPRequestHandler):
    def reply(self, body, status=200):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/test/log":
            return self.reply({"log": LOG})
        self.reply({"error": "not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("content-length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        if not self.path.startswith("/v1/messages"):
            return self.reply({"type": "error", "error": {"type": "not_found_error", "message": self.path}}, 404)
        system = text_of(body.get("system", ""))
        prompt = " ".join(text_of(message.get("content", "")) for message in body.get("messages", []))
        context = f"{system}\n{prompt}"
        schema = (body.get("output_config") or {}).get("format", {}).get("schema")
        text = json.dumps(sample(schema, "", context)) if schema else "## Overview\n\nA short sample article from the offline stand-in.\n"
        LOG.append({"schema": sorted((schema or {}).get("properties", {}).keys()), "stream": bool(body.get("stream")), "prompt": prompt[:300]})
        message = {
            "id": f"msg_{uuid.uuid4().hex[:24]}",
            "type": "message",
            "role": "assistant",
            "model": body.get("model", "mock"),
            "content": [{"type": "text", "text": text}],
            "stop_reason": "end_turn",
            "stop_sequence": None,
            "usage": {"input_tokens": 10, "output_tokens": 10},
        }
        if not body.get("stream"):
            return self.reply(message)
        events = [
            ("message_start", {"type": "message_start", "message": {**message, "content": [], "stop_reason": None}}),
            ("content_block_start", {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}),
            ("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text}}),
            ("content_block_stop", {"type": "content_block_stop", "index": 0}),
            ("message_delta", {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None}, "usage": {"output_tokens": 10}}),
            ("message_stop", {"type": "message_stop"}),
        ]
        self.send_response(200)
        self.send_header("content-type", "text/event-stream")
        self.end_headers()
        for name, data in events:
            self.wfile.write(f"event: {name}\ndata: {json.dumps(data)}\n\n".encode())

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"Anthropic mock on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
