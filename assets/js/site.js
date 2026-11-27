/* 干涉與繞射線上教材 共用腳本（純原生 JS，file:// 可用）。公開 API：window.IOD */
(function () {
  'use strict';
  var VERSION = 'v1.0-2026-11';
  var PREFIX = 'iod:';

  /* ---------- 頁面登錄表（順序即學習路徑） ---------- */
  var PAGES = [
    { id: 'index', href: 'index.html', title: '學習地圖', group: 'main' },
    { id: 'pretest', href: 'pretest.html', title: '前測', group: 'main' },
    { id: 'unit1', href: 'unit1.html', title: '1-1 波的疊加', group: 'main' },
    { id: 'unit2', href: 'unit2.html', title: '1-2 雙狹縫干涉', group: 'main' },
    { id: 'unit3', href: 'unit3.html', title: '1-3 繞射與應用', group: 'main' },
    { id: 'posttest', href: 'posttest.html', title: '後測', group: 'main' },
    { id: 'resources', href: 'resources.html', title: '延伸閱讀', group: 'main' },
    { id: 'misconceptions', href: 'misconceptions.html', title: '迷思速查', group: 'aux' },
    { id: 'assessment', href: 'assessment.html', title: '評量地圖', group: 'aux' },
    { id: 'report', href: 'report.html', title: '專案報告', group: 'aux' },
    { id: 'teacher', href: 'teacher.html', title: '教師專區', group: 'aux', teacherOnly: true },
    { id: 'dashboard', href: 'dashboard.html', title: '教師後台', group: 'aux', teacherOnly: true }
  ];
  var MAIN = PAGES.filter(function (p) { return p.group === 'main'; });

  /* ---------- localStorage 封裝（失敗時退回記憶體） ---------- */
  var mem = {};
  var store = {
    get: function (k, d) {
      var raw = null;
      try { raw = window.localStorage.getItem(PREFIX + k); } catch (e) { raw = mem[PREFIX + k] || null; }
      if (raw == null) return d === undefined ? null : d;
      try { return JSON.parse(raw); } catch (e2) { return d === undefined ? null : d; }
    },
    set: function (k, v) {
      var s = JSON.stringify(v);
      try { window.localStorage.setItem(PREFIX + k, s); } catch (e) { mem[PREFIX + k] = s; }
    },
    remove: function (k) {
      try { window.localStorage.removeItem(PREFIX + k); } catch (e) { delete mem[PREFIX + k]; }
    },
    keys: function () {
      var out = [], i, k;
      try {
        for (i = 0; i < window.localStorage.length; i++) {
          k = window.localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
        }
      } catch (e) { Object.keys(mem).forEach(function (m) { out.push(m.slice(PREFIX.length)); }); }
      return out;
    }
  };

  /* ---------- 變更通知（供 sync.js 等模組掛接） ---------- */
  var listeners = [];
  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function fire(kind, info) { listeners.forEach(function (fn) { try { fn(kind, info); } catch (e) {} }); }

  /* ---------- 教師模式（通行碼驗證；靜態網站僅為顯示分離，不是加密） ---------- */
  var TKEY = 'iod-teacher-token';
  function teacherToken() { try { return window.sessionStorage.getItem(TKEY) || ''; } catch (e) { return mem[TKEY] || ''; } }
  function setTeacherToken(t) {
    try { if (t) window.sessionStorage.setItem(TKEY, t); else window.sessionStorage.removeItem(TKEY); } catch (e) { mem[TKEY] = t || ''; }
    applyTeacherMode();
  }
  function isTeacher() { return !!teacherToken(); }
  function isLocalDev() { return /^(file:|)$/.test(location.protocol) || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }
  function applyTeacherMode() {
    var on = isTeacher();
    document.documentElement.classList.toggle('teacher-mode', on);
    var b = document.querySelector('.tm-btn');
    if (b) b.textContent = on ? '教師模式：開（點此關閉）' : '教師登入';
    var g = document.querySelector('.t-gate');
    var needs = document.body && document.body.hasAttribute('data-teacher-only');
    if (needs) {
      var main = document.getElementById('main');
      if (main) main.hidden = !on;
      if (!on && !g) {
        g = document.createElement('div'); g.className = 't-gate';
        g.innerHTML = '<h1>教師專用頁面</h1><p>這一頁包含教案、答案要素與全班資料，請先登入教師模式。</p><p><button type="button" class="tm-open">教師登入</button></p>';
        document.body.insertBefore(g, document.getElementById('main') || null);
        g.querySelector('.tm-open').addEventListener('click', teacherDialog);
      }
      if (on && g) g.remove();
    }
  }
  function teacherLogin(code) {
    return fetch('/api/teacher/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passcode: code }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok && x.j.token) { setTeacherToken(x.j.token); return { ok: true }; } return { ok: false, msg: '通行碼不正確' }; })
      .catch(function () {
        if (isLocalDev()) { setTeacherToken('local-preview'); return { ok: true, local: true }; }
        return { ok: false, msg: '無法連線到伺服器，暫時無法驗證' };
      });
  }
  function teacherDialog() {
    if (isTeacher()) { setTeacherToken(''); toast('已關閉教師模式'); return; }
    var d = document.querySelector('.tm-dialog');
    if (!d) {
      d = document.createElement('dialog'); d.className = 'tm-dialog';
      d.innerHTML = '<form method="dialog"><h2>教師登入</h2><label>通行碼<br><input type="password" class="tm-code" autocomplete="off"></label><p class="tm-msg small" role="alert"></p><div class="tm-row"><button value="ok" class="tm-ok">登入</button> <button value="cancel" type="button" class="tm-cancel">取消</button></div></form>';
      document.body.appendChild(d);
      d.querySelector('.tm-cancel').addEventListener('click', function () { d.close(); });
      d.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var code = d.querySelector('.tm-code').value, msg = d.querySelector('.tm-msg');
        msg.textContent = '驗證中…';
        teacherLogin(code).then(function (r) {
          if (r.ok) { d.close(); d.querySelector('.tm-code').value = ''; toast(r.local ? '教師模式（本機預覽，未經伺服器驗證）' : '已開啟教師模式'); }
          else msg.textContent = r.msg;
        });
      });
    }
    d.querySelector('.tm-msg').textContent = '';
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    d.querySelector('.tm-code').focus();
  }
  function renderTeacherBtn() {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tm-btn';
    b.addEventListener('click', teacherDialog);
    document.body.appendChild(b);
    applyTeacherMode();
  }

  /* ---------- 學生匿名代碼 ---------- */
  function studentId() {
    var id = store.get('student');
    if (!id) {
      var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = '', i;
      var arr = null;
      try { arr = window.crypto.getRandomValues(new Uint8Array(6)); } catch (e) {}
      for (i = 0; i < 6; i++) s += abc.charAt((arr ? arr[i] : Math.floor(Math.random() * 256)) % abc.length);
      id = 'S-' + s;
      store.set('student', id);
    }
    return id;
  }

  /* ---------- 工具 ---------- */
  function now() { return new Date().toISOString(); }
  function pageId() { return document.body.getAttribute('data-page') || 'unknown'; }
  function pageInfo(id) { return PAGES.filter(function (p) { return p.id === id; })[0]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  /* ---------- 作答紀錄 ---------- */
  // 結構：iod:ans:<page>:<qid>:<field> = {value, ts, history:[{value,ts}], activity}
  function ansKey(page, qid, field) { return 'ans:' + page + ':' + qid + ':' + field; }
  function saveAnswer(page, qid, field, value, activity) {
    var k = ansKey(page, qid, field), rec = store.get(k) || { history: [] };
    if (rec.value === value) return rec;
    if (rec.value !== undefined && rec.value !== '') rec.history.push({ value: rec.value, ts: rec.ts });
    rec.value = value; rec.ts = now(); rec.activity = activity || rec.activity || '';
    store.set(k, rec);
    touchProgress(page);
    fire('answer', { page: page, qid: qid, field: field });
    return rec;
  }
  function getAnswer(page, qid, field) {
    var r = store.get(ansKey(page, qid, field));
    return r ? r.value : null;
  }
  function logEvent(page, qid, field, value, activity) { // 單向事件（例如開啟提示），僅記最新時間
    return saveAnswer(page, qid, field, value, activity);
  }
  function allAnswers() {
    var rows = [];
    store.keys().forEach(function (k) {
      if (k.indexOf('ans:') !== 0) return;
      var p = k.split(':'), rec = store.get(k);
      if (!rec) return;
      rows.push({
        student_id: studentId(), activity: rec.activity || '', page: p[1], qid: p[2], field: p.slice(3).join(':'),
        value: rec.value, timestamp: rec.ts, revisions: (rec.history || []).length, history: rec.history || [], version: VERSION
      });
    });
    rows.sort(function (a, b) { return a.timestamp < b.timestamp ? -1 : 1; });
    return rows;
  }

  /* ---------- 完成度 ---------- */
  function getProgress(page) { return store.get('prog:' + page) || { pct: 0, done: false, visits: 0 }; }
  function setProgress(page, pct, done) {
    var p = getProgress(page);
    p.pct = Math.max(0, Math.min(100, Math.round(pct)));
    if (done !== undefined) p.done = !!done;
    if (p.done) p.pct = 100;
    p.ts = now(); store.set('prog:' + page, p);
    renderProgress();
    fire('progress', { page: page });
    return p;
  }
  function markDone(page) { return setProgress(page || pageId(), 100, true); }
  function touchProgress(page) { // 依本頁題卡作答比例計算（至少 10%）
    if (page !== pageId()) return;
    var cards = document.querySelectorAll('.qcard[data-qid]'), n = 0, total = cards.length;
    cards.forEach(function (c) { if (cardAnswered(c)) { n++; c.classList.add('is-done'); } else c.classList.remove('is-done'); });
    var p = getProgress(page);
    var pct = total ? 10 + 90 * n / total : Math.max(p.pct, 10);
    if (!p.done) setProgress(page, Math.max(pct, 10), false);
  }
  function cardAnswered(card) {
    var qid = card.getAttribute('data-qid'), page = pageId(), ok = false;
    card.querySelectorAll('[name]').forEach(function (el) {
      if (el.name === 'rubric') return;
      var v = getAnswer(page, qid, el.name);
      if (v !== null && v !== '') ok = true;
    });
    return ok;
  }
  function overall() {
    var done = 0; MAIN.forEach(function (p) { if (getProgress(p.id).done) done++; });
    return { done: done, total: MAIN.length, pct: Math.round(100 * done / MAIN.length) };
  }

  /* ---------- 匯出 ---------- */
  function download(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return true;
    } catch (e) { toast('此瀏覽器無法下載，請改用其他瀏覽器'); return false; }
  }
  function csvCell(v) { var s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  var CSV_COLS = ['student_id', 'activity', 'page', 'qid', 'field', 'value', 'timestamp', 'revisions', 'version'];
  function toCSV() {
    var lines = [CSV_COLS.join(',')];
    allAnswers().forEach(function (r) { lines.push(CSV_COLS.map(function (c) { return csvCell(r[c]); }).join(',')); });
    return '﻿' + lines.join('\r\n');
  }
  function toJSON() {
    var prog = {}; PAGES.forEach(function (p) { prog[p.id] = getProgress(p.id); });
    return JSON.stringify({ student_id: studentId(), version: VERSION, exported_at: now(), progress: prog, answers: allAnswers() }, null, 2);
  }
  function stamp() { return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); }
  function exportCSV() { if (download('iod_' + studentId() + '_' + stamp() + '.csv', toCSV(), 'text/csv;charset=utf-8')) toast('已下載 CSV'); }
  function exportJSON() { if (download('iod_' + studentId() + '_' + stamp() + '.json', toJSON(), 'application/json;charset=utf-8')) toast('已下載 JSON'); }
  function clearAll() {
    if (!window.confirm('將清除本機上所有作答與進度（學生代碼也會重新產生）。建議先下載紀錄。確定清除？')) return false;
    store.keys().forEach(function (k) { store.remove(k); });
    mem = {};
    toast('已清除本機資料'); setTimeout(function () { location.reload(); }, 600);
    return true;
  }

  /* ---------- 元件渲染 ---------- */
  /* ---------- 頂列（麵包屑）＋固定目錄側欄 ---------- */
  var GROUPS = [
    { label: '開始', ids: ['index', 'pretest'] },
    { label: '第1章 干涉與繞射', ids: ['unit1', 'unit2', 'unit3'] },
    { label: '評量與延伸', ids: ['posttest', 'resources'] },
    { label: '輔助', ids: ['misconceptions', 'assessment', 'report', 'teacher', 'dashboard'] }
  ];
  function groupOf(id) { var g = GROUPS.filter(function (x) { return x.ids.indexOf(id) >= 0; })[0]; return g ? g.label : ''; }
  function shortTitle(p) { return p.title; }
  function uiGet(k, d) { var v = store.get('ui:' + k); return v == null ? d : v; }
  var root = document.documentElement;
  function isDesktop() { return window.matchMedia('(min-width:1024px)').matches; }

  function applyTheme(t) {
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    var b = document.querySelector('[data-theme-btn]');
    if (b) b.textContent = '外觀：' + (t === 'light' ? '淺色' : t === 'dark' ? '深色' : '自動');
  }
  function cycleTheme() {
    var cur = uiGet('theme', 'auto'), nx = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
    store.set('ui:theme', nx); applyTheme(nx); toast('外觀：' + (nx === 'light' ? '淺色' : nx === 'dark' ? '深色' : '跟隨系統'));
  }
  function setSide(open) { // 桌面：收合/展開；窄螢幕：抽屜開關
    if (isDesktop()) {
      root.classList.toggle('side-collapsed', !open); store.set('ui:side', open ? 'open' : 'closed');
    } else {
      root.classList.toggle('side-open', open);
      var t = document.querySelector('.nav-toggle-m'); if (t) t.setAttribute('aria-expanded', open);
      if (open) { var c = document.querySelector('.side-close'); if (c) c.focus(); }
      else if (t && document.activeElement && document.activeElement.closest && document.activeElement.closest('.side')) t.focus();
    }
    var d = document.querySelector('.nav-toggle-d');
    if (d) { var o = !root.classList.contains('side-collapsed'); d.setAttribute('aria-expanded', o); d.querySelector('.lbl').textContent = o ? '收合目錄' : '展開目錄'; }
  }
  function renderNav() {
    var cur = pageId(), info = pageInfo(cur), grp = groupOf(cur);
    var crumbs = (cur !== 'index' ? '<li><a href="index.html">首頁</a></li>' : '') + (grp && !/^unit/.test(cur) && cur !== 'index' ? '<li><span>' + esc(grp) + '</span></li>' : '') +
      '<li><span aria-current="page">' + esc(info ? info.title : document.title) + '</span></li>';
    var html = '<div class="nav-in">' +
      '<button class="nav-btn nav-toggle-m" type="button" aria-expanded="false" aria-controls="iod-side"><span class="ico" aria-hidden="true">☰</span>目錄</button>' +
      '<button class="nav-btn nav-toggle-d" type="button" aria-expanded="true" aria-controls="iod-side"><span class="ico" aria-hidden="true">☰</span><span class="lbl">收合目錄</span></button>' +
      '<nav class="crumbs" aria-label="麵包屑"><ol>' + crumbs + '</ol></nav>' +
      '<div class="nav-right"><button class="nav-btn" type="button" data-theme-btn title="切換淺色／深色／自動">外觀</button></div>' +
      '<div class="read-bar" aria-hidden="true"></div></div>';
    var nav = document.getElementById('iod-nav');
    if (!nav) { nav = document.createElement('div'); nav.id = 'iod-nav'; document.body.insertBefore(nav, document.body.firstChild); }
    nav.className = 'site-nav'; nav.removeAttribute('aria-label'); nav.innerHTML = html;
    nav.querySelector('.nav-toggle-m').addEventListener('click', function () { setSide(!root.classList.contains('side-open')); });
    nav.querySelector('.nav-toggle-d').addEventListener('click', function () { setSide(root.classList.contains('side-collapsed')); });
    nav.querySelector('[data-theme-btn]').addEventListener('click', cycleTheme);
  }

  var tocItems = [];
  function buildToc() {
    var main = document.querySelector('main'), li = document.querySelector('.s-item.cur'); if (!main || !li) return;
    var old = li.querySelector('.toc, .toc-empty'); if (old) old.remove();
    var hs = Array.prototype.slice.call(main.querySelectorAll('h2, h3')).filter(function (h) {
      if (h.closest('.qcard, .pane, dialog, details, .poe-panel, .card, [hidden], .tabpanel')) return h.tagName === 'H2' && !h.closest('dialog, [hidden]');
      return true;
    });
    tocItems = [];
    var qsel = 'main .qcard[data-qid]';
    if (!hs.length) hs = Array.prototype.slice.call(main.querySelectorAll(qsel)); // 無標題頁（前／後測）：以題卡當章節
    var used = {}; Array.prototype.forEach.call(document.querySelectorAll('[id]'), function (e) { used[e.id] = 1; });
    var n = 0, out = '';
    hs.forEach(function (h) {
      var c = h.cloneNode(true), isQ = !/^H[1-6]$/.test(h.tagName);
      Array.prototype.forEach.call(c.querySelectorAll('.sect-time,.badge-add,.asset-tag,small,.u3-time,.docno,.demo-flag,script'), function (x) { x.remove(); });
      var text = isQ ? ((h.querySelector('.q-no') || {}).textContent || h.getAttribute('data-qid') || '') : c.textContent;
      text = text.replace(/\s+/g, ' ').trim(); if (!text) return;
      if (!h.id) { do { n++; } while (used['sec-' + n]); h.id = 'sec-' + n; used[h.id] = 1; }
      tocItems.push({ el: h, id: h.id });
      out += '<li><a class="' + (h.tagName === 'H3' ? 'l3' : 'l2') + '" href="#' + esc(h.id) + '">' + esc(text) + '</a></li>';
    });
    var box = document.createElement(tocItems.length ? 'ol' : 'p');
    if (tocItems.length) { box.className = 'toc'; box.setAttribute('aria-label', '本頁章節'); box.innerHTML = out; box.style.listStyle = 'none'; }
    else { box.className = 'toc-empty'; box.textContent = '本頁沒有章節標題'; }
    li.appendChild(box);
    updateSpy();
  }
  function updateSpy() {
    var bar = document.querySelector('.read-bar'), tt = document.querySelector('.to-top');
    var y = window.pageYOffset || document.documentElement.scrollTop, h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? Math.min(100, 100 * y / h) : 0) + '%';
    if (tt) tt.classList.toggle('show', y > 600);
    if (!tocItems.length) return;
    var act = -1, i, lim = 80;
    for (i = 0; i < tocItems.length; i++) { if (tocItems[i].el.getBoundingClientRect().top <= lim) act = i; else break; }
    if (h > 0 && y >= h - 4) act = tocItems.length - 1;
    var links = document.querySelectorAll('.toc a'), sideNav = document.querySelector('.side-nav'), onEl = null;
    Array.prototype.forEach.call(links, function (a, k) {
      var on = k === act; a.classList.toggle('on', on);
      if (on) { a.setAttribute('aria-current', 'location'); onEl = a; } else a.removeAttribute('aria-current');
    });
    if (onEl && sideNav && onEl !== updateSpy.last) {
      updateSpy.last = onEl;
      var r = onEl.getBoundingClientRect(), s = sideNav.getBoundingClientRect();
      if (r.top < s.top + 20) sideNav.scrollTop -= (s.top + 20 - r.top);
      else if (r.bottom > s.bottom - 20) sideNav.scrollTop += (r.bottom - s.bottom + 20);
    }
  }
  function updateSide() {
    var o = overall(), box = document.querySelector('.side-overall');
    if (box) {
      box.querySelector('.t').textContent = '整體完成 ' + o.done + ' / ' + o.total + '（主線 ' + o.pct + '%）';
      box.querySelector('.bar i').style.width = o.pct + '%';
    }
    PAGES.forEach(function (p) {
      var li = document.querySelector('.s-item[data-id="' + p.id + '"]'); if (!li) return;
      var g = getProgress(p.id), st = li.querySelector('.s-stat'), pct = g.done ? 100 : (g.pct || 0);
      if (g.done) { st.className = 's-stat done'; st.textContent = '✓ 完成'; }
      else if (g.visits || pct > 0) { st.className = 's-stat partial'; st.textContent = pct + '%'; }
      else { st.className = 's-stat'; st.textContent = '未開始'; }
      li.classList.toggle('has-bar', pct > 0 && !g.done);
      li.querySelector('.s-bar i').style.width = (g.done ? 100 : pct) + '%';
    });
  }
  function renderSide() {
    var cur = pageId(), html = '<div class="side-head"><a class="side-brand" href="index.html"><span class="side-logo" aria-hidden="true">∿</span><span>干涉與繞射<small>線上教材</small></span></a>' +
      '<button class="side-close" type="button">關閉目錄</button></div>' +
      '<div class="side-overall"><span class="t"></span><div class="bar"><i></i></div></div><nav class="side-nav" aria-label="教材目錄">';
    GROUPS.forEach(function (g) {
      html += '<div class="s-group" id="sg-' + esc(g.ids[0]) + '">' + esc(g.label) + '</div><ul class="s-list" aria-labelledby="sg-' + esc(g.ids[0]) + '">';
      g.ids.forEach(function (id) {
        var p = pageInfo(id); if (!p) return;
        var t = /^unit/.test(id) ? shortTitle(p) : p.title;
        html += '<li class="s-item' + (p.teacherOnly ? ' t-only' : '') + (id === cur ? ' cur' : '') + '" data-id="' + id + '"><a class="s-link" href="' + p.href + '"' + (id === cur ? ' aria-current="page"' : '') +
          '><span class="s-title">' + esc(t) + '</span><span class="s-stat"></span></a><div class="s-bar"><i></i></div></li>';
      });
      html += '</ul>';
    });
    html += '</nav><div class="side-foot"><span>代碼 ' + esc(studentId()) + '</span><button type="button" data-theme-btn>外觀</button></div>';
    var side = document.getElementById('iod-side');
    if (!side) { side = document.createElement('aside'); side.id = 'iod-side'; document.body.insertBefore(side, document.body.firstChild); }
    side.className = 'side'; side.setAttribute('aria-label', '教材目錄側欄'); side.innerHTML = html;
    var bd = document.querySelector('.side-backdrop');
    if (!bd) { bd = document.createElement('div'); bd.className = 'side-backdrop'; document.body.insertBefore(bd, side.nextSibling); }
    bd.addEventListener('click', function () { setSide(false); });
    side.querySelector('.side-close').addEventListener('click', function () { setSide(false); });
    side.querySelector('[data-theme-btn]').addEventListener('click', cycleTheme);
    side.addEventListener('click', function (e) { if (!isDesktop() && e.target.closest && e.target.closest('a')) root.classList.remove('side-open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('side-open')) setSide(false); });
    updateSide(); buildToc();
    var main = document.querySelector('main');
    if (main && window.MutationObserver) {
      var t = null, obs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { var sig = main.querySelectorAll('h2,h3,.qcard[data-qid]').length; if (sig !== renderSide.sig) { renderSide.sig = sig; buildToc(); } }, 400); });
      renderSide.sig = main.querySelectorAll('h2,h3,.qcard[data-qid]').length;
      obs.observe(main, { childList: true, subtree: true });
    }
  }
  function renderTop() {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'to-top'; b.textContent = '↑ 回到頂端';
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(b);
    var tick = false;
    window.addEventListener('scroll', function () { if (tick) return; tick = true; requestAnimationFrame(function () { tick = false; updateSpy(); }); }, { passive: true });
    window.addEventListener('resize', function () {
      if (isDesktop()) root.classList.remove('side-open');
      var d = document.querySelector('.nav-toggle-d .lbl'); if (d) d.textContent = root.classList.contains('side-collapsed') ? '展開目錄' : '收合目錄';
      updateSpy();
    });
  }
  function renderProgress() {
    var cur = pageId(), box = document.getElementById('iod-progress'), idx = -1, i;
    for (i = 0; i < MAIN.length; i++) if (MAIN[i].id === cur) idx = i;
    if (!box) {
      box = document.createElement('div'); box.id = 'iod-progress';
      var nav = document.getElementById('iod-nav'); nav.parentNode.insertBefore(box, nav.nextSibling);
    }
    box.className = 'progress';
    var o = overall(), here = getProgress(cur);
    var pos = idx >= 0 ? '本頁位置：第 ' + (idx + 1) + ' / ' + MAIN.length + ' 站（' + esc(MAIN[idx].title) + '）' : '輔助頁（可隨時回到學習路徑）';
    var steps = MAIN.map(function (p, j) {
      return '<b class="' + (getProgress(p.id).done ? 'done' : (j === idx ? 'cur' : '')) + '" title="' + esc(p.title) + '"></b>';
    }).join('');
    box.innerHTML = '<div class="p-in"><span>' + pos + '　整體完成 ' + o.done + '/' + o.total + '　本頁完成度 ' + here.pct + '%　<span class="muted">學生代碼 ' +
      esc(studentId()) + '</span></span><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + o.pct +
      '"><i style="width:' + o.pct + '%"></i></div><div class="steps">' + steps + '</div></div>';
    if (typeof updateSide === 'function') updateSide();
  }
  function renderPager() {
    var b = document.body, prev = b.getAttribute('data-prev'), next = b.getAttribute('data-next');
    var box = document.getElementById('iod-pager');
    if (!box) { box = document.createElement('div'); box.id = 'iod-pager'; var f = document.querySelector('.site-footer'); f ? f.parentNode.insertBefore(box, f) : document.body.appendChild(box); }
    box.className = 'pager'; box.setAttribute('aria-label', '上一步與下一步');
    function title(h) { var p = PAGES.filter(function (x) { return x.href === h; })[0]; return p ? p.title : h; }
    box.innerHTML = (prev ? '<a class="prev" href="' + esc(prev) + '"><small>← 上一步</small>' + esc(title(prev)) + '</a>' : '<span class="spacer"></span>') +
      (next ? '<a class="next" href="' + esc(next) + '"><small>下一步 →</small>' + esc(title(next)) + '</a>' : '<span class="spacer"></span>');
    if (next) box.querySelector('.next').addEventListener('click', function () {
      if (MAIN.some(function (p) { return p.id === pageId(); })) { var pg = getProgress(pageId()); if (pg.pct >= 10 && !pg.done) setProgress(pageId(), pg.pct, true); }
    });
  }

  /* ---------- 互動綁定 ---------- */
  function bindCards() {
    var page = pageId();
    document.querySelectorAll('.qcard[data-qid]').forEach(function (card) {
      var qid = card.getAttribute('data-qid'), act = card.getAttribute('data-act') || '';
      var savedEl = card.querySelector('.saved');
      card.querySelectorAll('input[name],textarea[name],select[name]').forEach(function (el) {
        var field = el.name;
        if (field === 'rubric') return;
        var v = getAnswer(page, qid, field);
        if (v !== null) {
          if (el.type === 'radio') el.checked = (el.value === v);
          else if (el.type === 'checkbox') el.checked = (v === '1');
          else el.value = v;
        }
        var h = function () {
          var val = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
          if (el.type === 'radio' && !el.checked) return;
          saveAnswer(page, qid, field, val, act);
          if (savedEl) savedEl.textContent = '已儲存 ' + new Date().toLocaleTimeString('zh-TW', { hour12: false });
          touchProgress(page);
        };
        el.addEventListener(el.tagName === 'TEXTAREA' || el.type === 'text' ? 'input' : 'change', h);
      });
      card.querySelectorAll('.rubric input[type=radio]').forEach(function (r) {
        var f = 'rubric'; var sv = getAnswer(page, qid, f);
        if (sv !== null) r.checked = (r.value === sv);
        r.addEventListener('change', function () { saveAnswer(page, qid, f, r.value, act); toast('已記錄自評'); });
      });
      card.querySelectorAll('.hints details').forEach(function (d) {
        var lv = (d.className.match(/L[123]/) || ['L?'])[0];
        d.addEventListener('toggle', function () { if (d.open) logEvent(page, qid, 'hint_' + lv, now(), act); });
      });
    });
    touchProgress(page);
  }
  function bindButtons() {
    document.querySelectorAll('[data-iod-export="csv"]').forEach(function (b) { b.addEventListener('click', exportCSV); });
    document.querySelectorAll('[data-iod-export="json"]').forEach(function (b) { b.addEventListener('click', exportJSON); });
    document.querySelectorAll('[data-iod-clear]').forEach(function (b) { b.addEventListener('click', clearAll); });
    document.querySelectorAll('[data-iod-complete]').forEach(function (b) {
      b.addEventListener('click', function () { markDone(); toast('已標記本頁完成'); });
    });
    document.querySelectorAll('[data-iod-student]').forEach(function (el) { el.textContent = studentId(); });
  }

  /* ---------- 動態載入雲端同步模組（可選；API 不可用時不影響離線使用） ---------- */
  function loadSync() {
    if (document.querySelector('script[data-iod-sync]')) return;
    var base = (document.currentScript && document.currentScript.src) || '';
    var el = document.createElement('script');
    el.src = 'assets/js/sync.js'; el.defer = true; el.setAttribute('data-iod-sync', '1');
    el.onerror = function () { /* sync.js 尚未存在或載入失敗：忽略 */ };
    document.body.appendChild(el);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    var page = pageId(), p = getProgress(page);
    p.visits = (p.visits || 0) + 1; if (!p.pct) p.pct = 10; store.set('prog:' + page, p);
    root.classList.add('has-side');
    if (uiGet('side', 'open') === 'closed' && isDesktop()) root.classList.add('side-collapsed');
    applyTheme(uiGet('theme', 'auto'));
    renderNav(); renderProgress(); renderSide(); renderPager(); renderTop(); bindCards(); bindButtons(); renderTeacherBtn(); loadSync();
    setSide(!root.classList.contains('side-collapsed') && isDesktop());
    updateSpy();
    document.title = (pageInfo(page) ? pageInfo(page).title + '｜' : '') + '干涉與繞射線上教材';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.IOD = {
    version: VERSION, pages: PAGES,
    store: store, studentId: studentId,
    saveAnswer: saveAnswer, getAnswer: getAnswer, logEvent: logEvent, allAnswers: allAnswers,
    getProgress: getProgress, setProgress: setProgress, markDone: markDone, overall: overall,
    exportCSV: exportCSV, exportJSON: exportJSON, toCSV: toCSV, toJSON: toJSON, download: download,
    clearAll: clearAll, toast: toast,
    onChange: onChange, isTeacher: isTeacher, teacherToken: teacherToken, teacherLogin: teacherLogin, teacherDialog: teacherDialog, isLocalDev: isLocalDev
  };
})();
