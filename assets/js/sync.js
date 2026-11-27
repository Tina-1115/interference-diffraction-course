/* 學生端雲端同步（可選）。由 site.js 動態載入；依賴 window.IOD。
   - 只同步「匿名學生代碼＋作答＋各頁完成度」，不蒐集姓名。
   - 每次送出的是目前完整快照（伺服端覆寫最新一份），所以「佇列」只需要一個 dirty 旗標，失敗時保留，之後補傳。
   - file:// 或沒有 /api 的靜態伺服器：靜默停用，不報錯、不顯示介面。 */
(function () {
  'use strict';
  var IOD = window.IOD;
  if (!IOD || location.protocol === 'file:') return;
  if (document.body && document.body.getAttribute('data-page') === 'dashboard') return; // 教師後台不上傳

  var THROTTLE = 3000, MAX_BACKOFF = 300000, MAX_BYTES = 480 * 1024;
  var st = { state: 'idle', timer: null, inflight: false, fails: 0, last: IOD.store.get('sync:last') || '', disabled: false };

  function cls() { return IOD.store.get('sync:class') || 'DEFAULT'; }
  function off() { return IOD.store.get('sync:off') === '1'; }
  function dirty() { return IOD.store.get('sync:dirty') !== '0'; } // 預設視為 dirty：第一次載入就會同步
  function setDirty(v) { IOD.store.set('sync:dirty', v ? '1' : '0'); }
  function normClass(v) {
    v = String(v || '').trim().toUpperCase();
    if (!v) return 'DEFAULT';
    return /^[A-Z0-9_-]{1,32}$/.test(v) ? v : null;
  }

  /* ---------- 組快照 ---------- */
  function snapshot(slim) {
    var prog = {};
    IOD.pages.forEach(function (p) { prog[p.id] = IOD.getProgress(p.id); });
    var rows = IOD.allAnswers();
    if (slim) rows = rows.map(function (r) { var c = {}; for (var k in r) c[k] = r[k]; c.history = (r.history || []).slice(-5); return c; });
    return { student_id: IOD.studentId(), class_code: cls(), version: IOD.version, answers: rows, progress: prog, ts: new Date().toISOString() };
  }

  /* ---------- 送出 ---------- */
  function send(opts) {
    opts = opts || {};
    if (st.disabled || off() || IOD.isTeacher()) return;
    if (st.inflight) { st.again = true; return; }
    if (!navigator.onLine) { setState('offline'); return; }
    var body = JSON.stringify(snapshot(false));
    if (body.length > MAX_BYTES) body = JSON.stringify(snapshot(true));
    if (body.length > 500 * 1024) { setState('error', '資料過大，暫停同步'); st.disabled = true; return; }
    st.inflight = true; setState('sending');
    var init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body };
    if (opts.keepalive && body.length < 60000) init.keepalive = true;
    fetch('/api/submit', init).then(function (r) {
      st.inflight = false;
      if (r.status === 404 || r.status === 405 || r.status === 501) { st.disabled = true; setState('none'); return; } // 沒有後端：靜默停用
      if (r.ok) {
        st.fails = 0; st.last = new Date().toISOString(); IOD.store.set('sync:last', st.last);
        if (!st.again) setDirty(false);
        setState('ok');
      } else if (r.status === 400 || r.status === 413) {
        st.disabled = true; setState('error', '伺服器拒絕此資料（' + r.status + '）');
      } else fail();
      if (st.again) { st.again = false; schedule(); }
    }).catch(function () { st.inflight = false; fail(); });
  }
  function fail() {
    st.fails++; setState(navigator.onLine ? 'retry' : 'offline');
    var wait = Math.min(MAX_BACKOFF, 10000 * Math.pow(2, st.fails - 1));
    clearTimeout(st.timer); st.timer = setTimeout(function () { send(); }, wait);
  }
  function schedule(delay) {
    if (st.disabled || off()) return;
    if (st.timer && !st.fails) return; // 已排程
    clearTimeout(st.timer);
    st.timer = setTimeout(function () { st.timer = null; send(); }, delay == null ? THROTTLE : delay);
  }

  /* ---------- 介面：右下角小型狀態＋設定對話框 ---------- */
  var chip = null, dlg = null;
  var LABEL = { idle: '同步', sending: '同步中…', ok: '已同步', retry: '同步失敗，稍後重試', offline: '離線，連線後補傳', error: '同步暫停', off: '同步已關閉' };
  function hhmm(iso) { try { return new Date(iso).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function setState(s, msg) {
    st.state = s; st.msg = msg || '';
    if (s === 'none') { removeUI(); return; }
    ensureChip();
    if (!chip) return;
    chip.setAttribute('data-state', off() ? 'off' : s);
    chip.querySelector('.t').textContent = (off() ? LABEL.off : LABEL[s] || '同步') + (s === 'ok' && st.last && !off() ? ' ' + hhmm(st.last) : '') + '・班級 ' + cls();
    chip.title = (msg || '') + ' 點此設定班級代碼與查看資料用途';
  }
  function removeUI() { if (chip) { chip.remove(); chip = null; } }
  function ensureChip() {
    if (chip || !document.body) return;
    if (document.body.hasAttribute('data-teacher-only') || IOD.isTeacher()) return;
    chip = document.createElement('button'); chip.type = 'button'; chip.className = 'sync-chip';
    chip.innerHTML = '<i class="dot" aria-hidden="true"></i><span class="t"></span>';
    chip.addEventListener('click', openDialog);
    document.body.appendChild(chip);
    injectCss();
  }
  function injectCss() {
    if (document.getElementById('sync-css')) return;
    var s = document.createElement('style'); s.id = 'sync-css';
    s.textContent = '.sync-chip{position:fixed;left:12px;bottom:44px;z-index:59;display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:.78rem;line-height:1.2;padding:4px 10px;border-radius:999px;border:1px solid var(--c-line);background:var(--c-surface);color:var(--c-muted);cursor:pointer;opacity:.85;max-width:calc(100vw - 100px)}' +
      '.sync-chip:hover,.sync-chip:focus-visible{opacity:1}.sync-chip .dot{width:8px;height:8px;border-radius:50%;background:var(--c-line-strong);flex:none}' +
      '.sync-chip[data-state=ok] .dot{background:var(--c-ok)}.sync-chip[data-state=sending] .dot{background:var(--c-primary)}.sync-chip[data-state=retry] .dot,.sync-chip[data-state=offline] .dot,.sync-chip[data-state=error] .dot{background:var(--c-accent)}' +
      '.sync-dlg{border:1px solid var(--c-line);border-radius:var(--r);padding:18px 22px;background:var(--c-surface);color:var(--c-text);max-width:min(520px,92vw)}.sync-dlg::backdrop{background:rgba(0,0,0,.4)}' +
      '.sync-dlg input[type=text]{margin:4px 0;padding:6px 8px;min-width:200px}.sync-dlg .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.sync-dlg .msg{color:var(--c-danger);min-height:1.4em}' +
      '@media print{.sync-chip{display:none}}';
    document.head.appendChild(s);
  }
  function openDialog() {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'sync-dlg';
      dlg.innerHTML = '<form method="dialog"><h2 style="margin-top:0">雲端同步設定</h2>' +
        '<p class="small">老師可在教師後台看到全班的作答情形，用來了解學習進度與常見迷思、調整教學。</p>' +
        '<p class="small"><b>會上傳：</b>隨機產生的匿名學生代碼（<code class="sid"></code>）、班級代碼、各題作答與修訂紀錄、各頁完成度。<br><b>不會蒐集：</b>姓名、學號、電子郵件或其他可直接識別你的資料。<br>請不要在作答欄位中寫入姓名或個人資料。資料保存期限與刪除方式依老師公告；你也可以請老師刪除你的代碼的資料。</p>' +
        '<label>班級代碼（由老師提供，可留空＝DEFAULT）<br><input type="text" class="sc-class" maxlength="32" autocomplete="off" spellcheck="false"></label>' +
        '<label style="display:block;margin-top:8px"><input type="checkbox" class="sc-on"> 啟用雲端同步</label>' +
        '<p class="msg" role="alert"></p><p class="small muted st"></p>' +
        '<div class="row"><button value="ok" class="btn sc-save">儲存並同步</button><button type="button" class="btn ghost sc-now">立即同步</button><button type="button" class="btn ghost sc-close">關閉</button></div></form>';
      document.body.appendChild(dlg);
      dlg.querySelector('.sc-close').addEventListener('click', function () { dlg.close(); });
      dlg.querySelector('.sc-now').addEventListener('click', function () { setDirty(true); st.disabled = false; st.fails = 0; send(); upd(); });
      dlg.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var c = normClass(dlg.querySelector('.sc-class').value), m = dlg.querySelector('.msg');
        if (c === null) { m.textContent = '班級代碼只能用英數字、底線或連字號（最多 32 字）。'; return; }
        m.textContent = '';
        IOD.store.set('sync:class', c);
        IOD.store.set('sync:off', dlg.querySelector('.sc-on').checked ? '0' : '1');
        IOD.store.set('sync:ack', '1');
        setDirty(true); st.disabled = false; st.fails = 0; setState(st.state);
        dlg.close(); if (!off()) send(); IOD.toast(off() ? '已關閉雲端同步' : '已設定班級 ' + c);
      });
    }
    dlg.querySelector('.sid').textContent = IOD.studentId();
    dlg.querySelector('.sc-class').value = cls() === 'DEFAULT' ? '' : cls();
    dlg.querySelector('.sc-on').checked = !off();
    dlg.querySelector('.msg').textContent = '';
    upd();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function upd() { if (dlg) dlg.querySelector('.st').textContent = '狀態：' + (off() ? LABEL.off : LABEL[st.state] || st.state) + (st.last ? '；上次成功 ' + hhmm(st.last) : '') + (st.msg ? '（' + st.msg + '）' : ''); }

  /* 第一次使用的簡短告知（可關閉；之後可從狀態標籤再開啟） */
  function notice() {
    if (IOD.store.get('sync:ack') === '1' || !chip) return;
    var n = document.createElement('div'); n.className = 'callout tip sync-note';
    n.setAttribute('role', 'note');
    n.style.cssText = 'position:fixed;left:12px;bottom:76px;z-index:58;max-width:min(360px,calc(100vw - 24px));font-size:.82rem;line-height:1.5;padding:10px 12px;background:var(--c-surface);border:1px solid var(--c-line);border-radius:var(--r);box-shadow:var(--shadow-2)';
    n.innerHTML = '本教材會把<b>匿名代碼</b>與你的作答同步給老師（不蒐集姓名）。<span style="display:block;margin-top:6px"><button type="button" class="btn ghost" data-a="set">設定班級</button> <button type="button" class="btn ghost" data-a="ok">知道了</button></span>';
    n.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return;
      IOD.store.set('sync:ack', '1'); n.remove(); if (a === 'set') openDialog();
    });
    document.body.appendChild(n);
  }

  /* ---------- 掛接 ---------- */
  function start() {
    if (off()) { setState('idle'); return; }
    setState(navigator.onLine ? 'idle' : 'offline');
    notice();
    if (dirty()) schedule(1500);
  }
  IOD.onChange(function () { if (IOD.isTeacher()) return; setDirty(true); schedule(); });
  window.addEventListener('online', function () { st.fails = 0; if (dirty()) schedule(500); });
  window.addEventListener('offline', function () { setState('offline'); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && dirty() && !st.disabled && !off()) send({ keepalive: true }); });
  window.addEventListener('pagehide', function () { if (dirty() && !st.disabled && !off()) send({ keepalive: true }); });
  window.IODSync = { flush: function () { setDirty(true); st.disabled = false; send(); }, state: function () { return st.state; }, classCode: cls };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
