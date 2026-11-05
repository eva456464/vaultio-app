import http.server, os, sys
root = sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
    def map_path(self):
        p = self.path.split('?')[0]
        if not os.path.splitext(p)[1] and p != '/' and os.path.exists(os.path.join(root, p.lstrip('/') + '.html')):
            self.path = p + '.html'
    def do_GET(self):
        self.map_path()
        return super().do_GET()
    def do_HEAD(self):
        self.map_path()
        return super().do_HEAD()
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2]) if len(sys.argv) > 2 else 4100), H).serve_forever()
