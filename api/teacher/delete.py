"""Vercel Python Function 薄殼：實際邏輯在 api/_lib.py（與 devserver.py 共用）。"""
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')
import _lib  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        _lib.serve(self)

    def do_POST(self):
        _lib.serve(self)

    def do_DELETE(self):
        _lib.serve(self)

    def log_message(self, *a):
        pass
