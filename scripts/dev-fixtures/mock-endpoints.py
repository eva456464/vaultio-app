import base64, json, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
LOG = open('/tmp/mock-endpoints.log', 'a')
class H(BaseHTTPRequestHandler):
    def reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code); self.send_header('content-type', 'application/json'); self.send_header('content-length', str(len(data))); self.end_headers(); self.wfile.write(data)
    def body(self):
        n = int(self.headers.get('content-length') or 0); return json.loads(self.rfile.read(n) or b'{}')
    def wp_ok(self):
        auth = self.headers.get('authorization', '')
        return auth == 'Basic ' + base64.b64encode(b'editor:abcdabcdabcdabcdabcdabcd').decode()
    def do_GET(self):
        if self.path.startswith('/wp-json/wp/v2/users/me'):
            return self.reply(200, {'id': 1, 'name': 'editor'}) if self.wp_ok() else self.reply(401, {'message': 'Invalid credentials'})
        self.reply(404, {})
    def do_POST(self):
        if self.path == '/hook':
            ok = self.headers.get('authorization') == 'Bearer test-token-123'
            payload = self.body(); LOG.write('webhook ' + json.dumps({k: payload.get(k) for k in ('id', 'title', 'slug')}) + '\n'); LOG.flush()
            return self.reply(200, {'success': True, 'link': f"http://sunnyroofing.test/blog/{payload.get('slug')}"} if ok else {'success': False, 'error': 'Bad token'})
        if self.path == '/wp-json/wp/v2/posts':
            if not self.wp_ok(): return self.reply(401, {'message': 'Invalid credentials'})
            payload = self.body(); LOG.write('wordpress ' + json.dumps({k: payload.get(k) for k in ('title', 'slug', 'status')}) + '\n'); LOG.flush()
            return self.reply(201, {'id': 99, 'link': f"http://localhost:4300/{payload.get('slug')}/"})
        self.reply(404, {})
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
