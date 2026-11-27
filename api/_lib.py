"""干涉與繞射線上教材：後端共用邏輯（Vercel Python Functions 與 devserver.py 共用同一份）。

端點（由 api/*.py 的薄殼呼叫 serve()）：
  POST   /api/submit                學生同步（匿名代碼＋作答；伺服端依 student_id+class_code 覆寫最新快照）
  POST   /api/teacher/verify        {passcode} -> {token}（無狀態 HMAC token）
  GET    /api/teacher/classes       列出班級（需 Bearer token）
  GET    /api/teacher/class?class=X 取得該班全部學生快照（需 Bearer token）
  POST|DELETE /api/teacher/delete   {class, student_id} 刪除單一學生資料（需 Bearer token）

環境變數：
  TEACHER_PASSCODE      教師通行碼（必填；未設定則 verify 一律拒絕）
  TOKEN_SECRET          選填；token 與路徑命名空間的簽章金鑰。未設定時由 TEACHER_PASSCODE 衍生
  BLOB_READ_WRITE_TOKEN 設定時使用 Vercel Blob（官方 Python SDK `vercel.blob.sync`）；未設定則寫本機 .data/
  BLOB_ACCESS           'private'（預設）或 'public'，須與 Blob store 的存取模式一致
"""
import base64
import hashlib
import hmac
import json
import os
import re
import time
import urllib.parse

MAX_BODY = 512 * 1024          # 單次請求上限（位元組）
MAX_ANSWERS = 3000             # answers 列數上限
MAX_VALUE_CHARS = 20000        # 單一 value 長度上限
MAX_HISTORY = 100              # 單列 history 筆數上限
TOKEN_TTL = 12 * 3600          # 教師 token 有效秒數
ID_RE = re.compile(r'^[A-Za-z0-9_-]{3,40}$')
CLASS_RE = re.compile(r'^[A-Za-z0-9_-]{1,32}$')
SHORT_RE = re.compile(r'^[A-Za-z0-9_.:\-]{1,120}$')   # page / qid / field 的字元集
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class ApiError(Exception):
    def __init__(self, status, msg):
        Exception.__init__(self, msg)
        self.status, self.msg = status, msg


# ---------------------------------------------------------------- 設定與簽章
def _secret():
    s = os.environ.get('TOKEN_SECRET') or os.environ.get('TEACHER_PASSCODE') or ''
    return ('iod-v1|' + s).encode('utf-8')


def _b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode('ascii')


def _unb64(s):
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def make_token(now=None):
    payload = _b64(json.dumps({'exp': int((now or time.time()) + TOKEN_TTL)}, separators=(',', ':')).encode())
    sig = _b64(hmac.new(_secret(), payload.encode('ascii'), hashlib.sha256).digest())
    return payload + '.' + sig


def check_token(tok):
    if not os.environ.get('TEACHER_PASSCODE') or not tok or tok.count('.') != 1:
        return False
    payload, sig = tok.split('.')
    good = _b64(hmac.new(_secret(), payload.encode('ascii', 'ignore'), hashlib.sha256).digest())
    if not hmac.compare_digest(sig.encode('ascii', 'ignore'), good.encode('ascii')):
        return False
    try:
        return json.loads(_unb64(payload)).get('exp', 0) > time.time()
    except Exception:
        return False


def _ns():
    """路徑命名空間：由祕密衍生的不可猜測片段（深度防禦；即使 store 被誤設為 public，也無法由班級代碼猜出路徑）。"""
    return hmac.new(_secret(), b'namespace', hashlib.sha256).hexdigest()[:20]


def _prefix(cls=None):
    return 'iod/' + _ns() + '/' + (cls + '/' if cls else '')


# ---------------------------------------------------------------- 儲存層轉接器
class LocalStore(object):
    """沒有 BLOB_READ_WRITE_TOKEN 時：寫到專案下 .data/（已在 .gitignore）。"""
    kind = 'local'

    def __init__(self, base=None):
        self.base = os.path.abspath(base or os.environ.get('IOD_DATA_DIR') or os.path.join(ROOT, '.data'))

    def _p(self, path):
        full = os.path.abspath(os.path.join(self.base, path))
        if not full.startswith(self.base + os.sep):
            raise ApiError(400, 'bad path')
        return full

    def put(self, path, data):
        full = self._p(path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        tmp = full + '.tmp%d' % os.getpid()
        with open(tmp, 'wb') as f:
            f.write(data)
        os.replace(tmp, full)

    def get(self, path):
        try:
            with open(self._p(path), 'rb') as f:
                return f.read()
        except FileNotFoundError:
            return None

    def list(self, prefix):
        d = self._p(prefix.rstrip('/'))
        out = []
        for root, _dirs, files in os.walk(d):
            for fn in files:
                if fn.endswith('.json'):
                    out.append(os.path.relpath(os.path.join(root, fn), self.base).replace(os.sep, '/'))
        return sorted(out)

    def delete(self, path):
        try:
            os.remove(self._p(path))
            return True
        except FileNotFoundError:
            return False


class BlobStore(object):
    """Vercel Blob（官方 Python SDK，vercel>=0.5；未驗證：本機沒有 token，未實際連線測過）。"""
    kind = 'blob'

    def __init__(self):
        from vercel.blob import sync as blob   # 延遲匯入：本機模式不需要安裝 SDK
        self.blob = blob
        self.access = os.environ.get('BLOB_ACCESS', 'private')

    def put(self, path, data):
        self.blob.put_blob(path, data, access=self.access, allow_overwrite=True,
                           add_random_suffix=False, content_type='application/json',
                           cache_control_max_age=60)

    def get(self, path):
        try:
            return self.blob.get_blob(path, access=self.access).body
        except self.blob.BlobNotFoundError:
            return None

    def list(self, prefix):
        return sorted(i.pathname for i in self.blob.query_blobs(prefix=prefix) if i.pathname.endswith('.json'))

    def delete(self, path):
        self.blob.delete_blob(path)
        return True


def get_store():
    if os.environ.get('BLOB_READ_WRITE_TOKEN'):
        return BlobStore()
    return LocalStore()


# ---------------------------------------------------------------- 驗證
def norm_class(v):
    v = ('' if v is None else str(v)).strip().upper()
    if not v:
        return 'DEFAULT'
    if not CLASS_RE.match(v):
        raise ApiError(400, 'invalid class_code')
    return v


def _scalar(v, limit=MAX_VALUE_CHARS):
    if v is None or isinstance(v, (bool, int, float)):
        return v
    if isinstance(v, str) and len(v) <= limit:
        return v
    raise ApiError(400, 'invalid value')


def validate_submit(d):
    if not isinstance(d, dict):
        raise ApiError(400, 'body must be an object')
    sid = d.get('student_id')
    if not isinstance(sid, str) or not ID_RE.match(sid):
        raise ApiError(400, 'invalid student_id')
    cls = norm_class(d.get('class_code'))
    ver = d.get('version', '')
    if not isinstance(ver, str) or len(ver) > 64:
        raise ApiError(400, 'invalid version')
    ts = d.get('ts', '')
    if not isinstance(ts, str) or len(ts) > 40:
        raise ApiError(400, 'invalid ts')
    ans = d.get('answers')
    if not isinstance(ans, list) or len(ans) > MAX_ANSWERS:
        raise ApiError(400, 'invalid answers')
    clean = []
    for r in ans:
        if not isinstance(r, dict):
            raise ApiError(400, 'invalid answer row')
        row = {}
        for k in ('page', 'qid', 'field'):
            if not isinstance(r.get(k), str) or not SHORT_RE.match(r[k]):
                raise ApiError(400, 'invalid answer key ' + k)
            row[k] = r[k]
        row['value'] = _scalar(r.get('value'))
        for k in ('activity', 'timestamp', 'version'):
            v = r.get(k, '')
            if not isinstance(v, str) or len(v) > 80:
                raise ApiError(400, 'invalid ' + k)
            row[k] = v
        rev = r.get('revisions', 0)
        row['revisions'] = rev if isinstance(rev, int) and not isinstance(rev, bool) and 0 <= rev < 100000 else 0
        hist = r.get('history', [])
        if not isinstance(hist, list) or len(hist) > MAX_HISTORY:
            raise ApiError(400, 'invalid history')
        row['history'] = []
        for h in hist:
            if not isinstance(h, dict):
                raise ApiError(400, 'invalid history item')
            row['history'].append({'value': _scalar(h.get('value')), 'ts': _scalar(h.get('ts'), 80)})
        clean.append(row)
    prog = d.get('progress', {})
    if not isinstance(prog, dict) or len(prog) > 40:
        raise ApiError(400, 'invalid progress')
    cprog = {}
    for k, v in prog.items():
        if not isinstance(k, str) or not SHORT_RE.match(k) or not isinstance(v, dict):
            raise ApiError(400, 'invalid progress entry')
        pct = v.get('pct', 0)
        cprog[k] = {
            'pct': pct if isinstance(pct, (int, float)) and not isinstance(pct, bool) and 0 <= pct <= 100 else 0,
            'done': bool(v.get('done')),
            'visits': v.get('visits') if isinstance(v.get('visits'), int) and not isinstance(v.get('visits'), bool) else 0,
            'ts': _scalar(v.get('ts', ''), 80),
        }
    return {'student_id': sid, 'class_code': cls, 'version': ver, 'ts': ts, 'answers': clean, 'progress': cprog}


# ---------------------------------------------------------------- 端點
def _json_body(body):
    try:
        return json.loads(body.decode('utf-8'))
    except Exception:
        raise ApiError(400, 'invalid JSON')


def ep_submit(req):
    snap = validate_submit(_json_body(req['body']))
    snap['received_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    path = _prefix(snap['class_code']) + snap['student_id'] + '.json'
    get_store().put(path, json.dumps(snap, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    return 200, {'ok': True, 'received_at': snap['received_at'], 'class_code': snap['class_code']}


def ep_verify(req):
    d = _json_body(req['body'])
    code = d.get('passcode') if isinstance(d, dict) else None
    want = os.environ.get('TEACHER_PASSCODE', '')
    if not want:
        raise ApiError(503, 'TEACHER_PASSCODE is not configured')
    ok = isinstance(code, str) and hmac.compare_digest(
        hashlib.sha256(code.encode('utf-8')).digest(), hashlib.sha256(want.encode('utf-8')).digest())
    if not ok:
        time.sleep(0.6)   # 減緩暴力猜測（無狀態，無法真正限流；建議於 Vercel 防火牆設定速率限制）
        raise ApiError(401, 'invalid passcode')
    return 200, {'token': make_token(), 'expires_in': TOKEN_TTL}


def _need_teacher(req):
    auth = req['headers'].get('authorization', '')
    if not auth.lower().startswith('bearer ') or not check_token(auth[7:].strip()):
        raise ApiError(401, 'teacher token required')


def ep_classes(req):
    _need_teacher(req)
    counts = {}
    pre = _prefix()
    for p in get_store().list(pre):
        parts = p[len(pre):].split('/')
        if len(parts) == 2:
            counts[parts[0]] = counts.get(parts[0], 0) + 1
    return 200, {'classes': [{'class_code': k, 'students': counts[k]} for k in sorted(counts)]}


def ep_class(req):
    _need_teacher(req)
    cls = norm_class((req['query'].get('class') or [''])[0])
    st = get_store()
    paths = st.list(_prefix(cls))
    out = []
    for p in paths:
        raw = st.get(p)
        if raw:
            try:
                out.append(json.loads(raw.decode('utf-8')))
            except Exception:
                pass
    return 200, {'class_code': cls, 'count': len(out), 'students': out}


def ep_delete(req):
    _need_teacher(req)
    q = {k: v[0] for k, v in req['query'].items() if v}
    d = {}
    if req['body']:
        d = _json_body(req['body'])
        d = d if isinstance(d, dict) else {}
    cls = norm_class(d.get('class', q.get('class')))
    sid = d.get('student_id', q.get('student_id'))
    if not isinstance(sid, str) or not ID_RE.match(sid):
        raise ApiError(400, 'invalid student_id')
    existed = get_store().delete(_prefix(cls) + sid + '.json')
    return 200, {'ok': True, 'deleted': bool(existed)}


ROUTES = {
    ('POST', '/api/submit'): ep_submit,
    ('POST', '/api/teacher/verify'): ep_verify,
    ('GET', '/api/teacher/classes'): ep_classes,
    ('GET', '/api/teacher/class'): ep_class,
    ('POST', '/api/teacher/delete'): ep_delete,
    ('DELETE', '/api/teacher/delete'): ep_delete,
}


def dispatch(method, rawpath, headers, body):
    """純函式：回傳 (status, dict)。headers 為小寫鍵 dict；body 為 bytes。"""
    u = urllib.parse.urlsplit(rawpath)
    path = u.path.rstrip('/') or '/'
    try:
        fn = ROUTES.get((method, path))
        if not fn:
            if any(p == path for (_m, p) in ROUTES):
                raise ApiError(405, 'method not allowed')
            raise ApiError(404, 'not found')
        return fn({'headers': headers, 'body': body, 'query': urllib.parse.parse_qs(u.query)})
    except ApiError as e:
        return e.status, {'error': e.msg}
    except Exception:   # 不把內部錯誤細節回給呼叫端
        import sys, traceback
        traceback.print_exc(file=sys.stderr)
        return 500, {'error': 'internal error'}


def serve(h):
    """以 BaseHTTPRequestHandler 實例 h 處理請求（Vercel 薄殼與 devserver 共用）。"""
    method = h.command
    headers = {k.lower(): v for k, v in h.headers.items()}
    body = b''
    status, out = None, None
    if method in ('POST', 'PUT', 'DELETE'):
        cl = headers.get('content-length')
        if cl is None:
            if method == 'POST':
                status, out = 411, {'error': 'content-length required'}
        else:
            try:
                n = int(cl)
            except ValueError:
                n = -1
            if n < 0:
                status, out = 400, {'error': 'bad content-length'}
            elif n > MAX_BODY:
                status, out = 413, {'error': 'payload too large (max %d bytes)' % MAX_BODY}
            else:
                body = h.rfile.read(n)
    if status is None:
        status, out = dispatch(method, h.path, headers, body)
    data = json.dumps(out, ensure_ascii=False).encode('utf-8')
    h.send_response(status)
    h.send_header('Content-Type', 'application/json; charset=utf-8')
    h.send_header('Content-Length', str(len(data)))
    h.send_header('Cache-Control', 'no-store')
    h.send_header('X-Content-Type-Options', 'nosniff')
    if status == 413:
        h.send_header('Connection', 'close')
        h.close_connection = True
    h.end_headers()
    if method != 'HEAD':
        h.wfile.write(data)
