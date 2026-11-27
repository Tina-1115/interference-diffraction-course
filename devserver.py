#!/usr/bin/env python3
"""本機測試伺服器：靜態檔案 + /api/*（呼叫 api/_lib.py 同一份邏輯）。
用法：python3 devserver.py [埠，預設 8802]
資料寫入 .data/（沒有 BLOB_READ_WRITE_TOKEN 時）。僅綁定 127.0.0.1。"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, 'api'))
import _lib  # noqa: E402

DEV_PASSCODE = 'DEV-ONLY-test-passcode'   # 僅本機測試用的明顯測試值；正式環境務必另設 TEACHER_PASSCODE
if not os.environ.get('TEACHER_PASSCODE'):
    os.environ['TEACHER_PASSCODE'] = DEV_PASSCODE
    sys.stderr.write('\n*** 警告：未設定 TEACHER_PASSCODE，devserver 使用測試值 "%s"。僅限本機測試！***\n\n' % DEV_PASSCODE)

BLOCKED = ('/.data', '/.git', '/.env', '/api/', '/devserver.py', '/vercel.json', '/requirements.txt')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        SimpleHTTPRequestHandler.__init__(self, *a, directory=ROOT, **kw)

    def _api(self):
        _lib.serve(self)

    def do_GET(self):
        if self.path.startswith('/api/'):
            return self._api()
        if self.path.lower().startswith(BLOCKED):
            return self.send_error(404)
        SimpleHTTPRequestHandler.do_GET(self)

    def do_HEAD(self):
        if self.path.startswith('/api/') or self.path.lower().startswith(BLOCKED):
            return self.send_error(404)
        SimpleHTTPRequestHandler.do_HEAD(self)

    def do_POST(self):
        self._api() if self.path.startswith('/api/') else self.send_error(405)

    def do_DELETE(self):
        self._api() if self.path.startswith('/api/') else self.send_error(405)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        SimpleHTTPRequestHandler.end_headers(self)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8802
    print('儲存：%s；網址 http://127.0.0.1:%d/' % (_lib.get_store().kind, port))
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
