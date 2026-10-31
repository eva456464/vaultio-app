import base64, json, re, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
LOG = open('/tmp/mock-endpoints.log', 'a')
class H(BaseHTTPRequestHandler):
    media_id = 500
    posts = {}  # slug -> html, so published posts can be fetched like a live site
    def reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code); self.send_header('content-type', 'application/json'); self.send_header('content-length', str(len(data))); self.end_headers(); self.wfile.write(data)
    def body(self):
        n = int(self.headers.get('content-length') or 0); return json.loads(self.rfile.read(n) or b'{}')
    def wp_ok(self):
        auth = self.headers.get('authorization', '')
        return auth == 'Basic ' + base64.b64encode(b'editor:abcdabcdabcdabcdabcdabcd').decode()
    def do_GET(self):
        slug = self.path.strip('/')
        if slug in H.posts:
            data = f"<!doctype html><html><body><article>{H.posts[slug]}</article></body></html>".encode()
            self.send_response(200); self.send_header('content-type', 'text/html'); self.send_header('content-length', str(len(data))); self.end_headers(); self.wfile.write(data)
            return
        if self.path.startswith('/wp-json/wp/v2/users/me'):
            return self.reply(200, {'id': 1, 'name': 'editor'}) if self.wp_ok() else self.reply(401, {'message': 'Invalid credentials'})
        self.reply(404, {})
    def do_POST(self):
        if self.path == '/hook':
            ok = self.headers.get('authorization') == 'Bearer test-token-123'
            payload = self.body(); LOG.write('webhook ' + json.dumps({k: payload.get(k) for k in ('id', 'title', 'slug')}) + '\n'); LOG.flush()
            return self.reply(200, {'success': True, 'link': f"http://sunnyroofing.test/blog/{payload.get('slug')}"} if ok else {'success': False, 'error': 'Bad token'})
        if self.path.startswith('/wp-json/wp/v2/media'):
            if not self.wp_ok(): return self.reply(401, {'message': 'Invalid credentials'})
            n = int(self.headers.get('content-length') or 0); data = self.rfile.read(n)
            H.media_id += 1
            LOG.write('wordpress-media ' + json.dumps({'id': H.media_id, 'bytes': len(data), 'type': self.headers.get('content-type'), 'disposition': self.headers.get('content-disposition'), 'query': self.path.split('?', 1)[-1][:120]}) + '\n'); LOG.flush()
            return self.reply(201, {'id': H.media_id, 'source_url': f"http://localhost:4300/wp-content/uploads/{H.media_id}.webp"})
        post = re.match(r'^/wp-json/wp/v2/posts(?:/(\d+))?$', self.path)
        if post:
            if not self.wp_ok(): return self.reply(401, {'message': 'Invalid credentials'})
            payload = self.body()
            post_id = int(post.group(1)) if post.group(1) else 99
            H.posts[payload.get('slug') or str(post_id)] = payload.get('content') or ''
            images = re.findall(r'<img[^>]+src="([^"]+)"', payload.get('content') or '')
            LOG.write(('wordpress-update ' if post.group(1) else 'wordpress ') + json.dumps({'id': post_id, **{k: payload.get(k) for k in ('title', 'slug', 'status', 'featured_media')}, 'images': images, 'cards': (payload.get('content') or '').count('vaultio-cta')}) + '\n'); LOG.flush()
            return self.reply(200 if post.group(1) else 201, {'id': post_id, 'link': f"http://localhost:4300/{payload.get('slug')}/"})
        self.reply(404, {})
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
