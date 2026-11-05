#!/usr/bin/env python3
"""Local preview with clean URLs (/en/projects -> en/projects.html), like the production host.
Usage: python3 serve.py [port]   then open http://localhost:8000/"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def translate_path(self, path):
        p = super().translate_path(path)
        clean = urlsplit(path).path
        if not os.path.isfile(p) and not clean.endswith('/') and os.path.isfile(p + '.html'):
            return p + '.html'
        return p


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print('Serving http://localhost:%d/' % port)
    ThreadingHTTPServer(('', port), Handler).serve_forever()
