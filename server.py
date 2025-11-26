
import http.server
import socketserver

PORT = 8000

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.extensions_map.update({
            '.html': 'text/html; charset=UTF-8',
            '.js': 'application/javascript; charset=UTF-8',
        })

Handler = MyHttpRequestHandler

socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
