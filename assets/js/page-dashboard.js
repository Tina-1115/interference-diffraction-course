/* 教師後台：讀 /api/teacher/*，呈現進度、迷思、前後測增益、單一學生檢視、匯出與刪除。純原生 JS。 */
(function () {
  'use strict';
  var IOD = window.IOD;
  var MIS = { M1: '波像物體碰撞', M2: '位移等於振幅', M3: '暗紋等於無光', M4: '模型當成實拍', M5: '干涉繞射無關' };
  var GOALS = { 1: '目標1 疊加', 2: '目標2 雙狹縫', 3: '目標3 繞射與薄膜', 4: '目標4 證據與查核' };
  var NODES = { '01': '節點01 波的疊加', '02': '節點02 雙狹縫干涉', '03': '節點03 單狹縫繞射', '04': '節點04 薄膜與統整' };
  var data = null, cls = '';
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function r0(x) { return Math.round(x); }
  function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function fmt(x) { return x == null ? '—' : r0(x) + '%'; }
  function pageTitle(id) { var p = IOD && IOD.pages.filter(function (x) { return x.id === id; })[0]; return p ? p.title : id; }
  function pageOrder(id) { var i = -1; (IOD ? IOD.pages : []).forEach(function (p, k) { if (p.id === id) i = k; }); return i < 0 ? 99 : i; }
  function mainPages() { return IOD.pages.filter(function (p) { return p.group === 'main'; }); }

  /* ---------- 連線 ---------- */
  function msg(html, kind) {
    var m = $('#d-msg'); m.className = 'callout ' + (kind || 'warn'); m.innerHTML = html; m.hidden = !html;
  }
  function api(path, opts) {
    opts = opts || {}; var h = opts.headers || {}; h.Authorization = 'Bearer ' + IOD.teacherToken(); opts.headers = h;
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || r.status); e.status = r.status; throw e; } return j; });
    });
  }
  function onErr(e) {
    $('#d-body').hidden = true; setStatus('');
    if (e.status === 401) {
      msg('教師登入已失效，或這是「本機預覽」登入（未經伺服器驗證）。請重新登入：<button type="button" class="btn" id="d-relogin">重新登入</button>');
      $('#d-relogin').addEventListener('click', function () { IOD.teacherDialog(); IOD.teacherDialog(); waitLogin(); });
    } else if (e.status === 404 || e.status === 405 || e.status === 501 || e instanceof TypeError) {
      msg('無法連到後端 API（<code>/api/teacher/…</code>）。若用 <code>file://</code> 或單純靜態伺服器開啟，後台沒有資料來源；請用 <code>python3 devserver.py</code> 在本機測試，或部署到 Vercel。');
    } else msg('讀取失敗：' + esc(e.message));
  }
  function waitLogin() {
    var t0 = IOD.teacherToken(), n = 0, iv = setInterval(function () {
      n++; var t = IOD.teacherToken();
      if (t && t !== t0 && t !== 'local-preview') { clearInterval(iv); load(); } else if (n > 300) clearInterval(iv);
    }, 1000);
  }
  function setStatus(s) { $('#d-status').textContent = s || ''; }

  /* ---------- 載入 ---------- */
  function loadClasses(keep) {
    setStatus('讀取班級…');
    return api('/api/teacher/classes').then(function (j) {
      var sel = $('#d-class'), list = j.classes || [];
      sel.innerHTML = list.map(function (c) { return '<option value="' + esc(c.class_code) + '">' + esc(c.class_code) + '（' + c.students + ' 人）</option>'; }).join('');
      if (!list.length) { sel.innerHTML = '<option value="">（尚無資料）</option>'; msg('伺服器上還沒有任何班級資料。學生端開啟教材並作答後，約 3 秒內會同步到這裡。', 'tip'); $('#d-body').hidden = true; setStatus(''); return null; }
      if (keep && list.some(function (c) { return c.class_code === keep; })) sel.value = keep;
      return sel.value;
    });
  }
  function loadClass(code) {
    if (!code) return;
    cls = code; setStatus('讀取 ' + code + '…');
    return api('/api/teacher/class?class=' + encodeURIComponent(code)).then(function (j) {
      data = j.students || []; msg(''); render(); setStatus('已讀取 ' + data.length + ' 位學生，' + new Date().toLocaleTimeString('zh-TW', { hour12: false }));
    });
  }
  function load() { loadClasses(cls).then(loadClass).catch(onErr); }

  /* ---------- 資料整理 ---------- */
  function ansMap(s) { // 'page|qid|field' -> row
    var m = {}; (s.answers || []).forEach(function (r) { m[r.page + '|' + r.qid + '|' + r.field] = r; }); return m;
  }
  function misOf(v) { return String(v || '').split(',').map(function (x) { return x.trim().toUpperCase(); }).filter(function (x) { return /^M[1-9]$/.test(x); }); }
  function parseMeta(s, page) {
    var r = ansMap(s)[page + '|_meta|first']; if (!r || !r.value) return null;
    try { var o = JSON.parse(r.value); return o && o.items && o.cfgItems ? o : null; } catch (e) { return null; }
  }
  function aggBy(meta, key) {
    var m = {}; meta.cfgItems.forEach(function (it) { var r = meta.items[it.no]; if (!r) return; var k = it[key]; m[k] = m[k] || { got: 0, max: 0 }; m[k].got += r.got; m[k].max += r.max; });
    return m;
  }
  function pctOf(o) { return o && o.max ? 100 * o.got / o.max : null; }

  /* ---------- 繪製 ---------- */
  function render() {
    $('#d-body').hidden = false;
    $('#d-csv').disabled = $('#d-json').disabled = !data.length;
    summary(); progress(); misconceptions(); gain(); studentSelect();
  }
  function summary() {
    var mp = mainPages(), done = 0, pcts = [];
    data.forEach(function (s) { var p = s.progress || {}; var d = 0, t = 0; mp.forEach(function (x) { var g = p[x.id] || {}; if (g.done) d++; t += g.done ? 100 : (g.pct || 0); }); done += d === mp.length ? 1 : 0; pcts.push(t / mp.length); });
    var hints = 0; data.forEach(function (s) { (s.answers || []).forEach(function (r) { if (/^hint_/.test(r.field)) hints++; }); });
    var last = data.map(function (s) { return s.received_at || ''; }).sort().pop();
    $('#d-summary').innerHTML = kpi(data.length, '學生數（快照）') + kpi(fmt(mean(pcts)), '主線平均完成度') + kpi(done + ' / ' + data.length, '主線全部完成') + kpi(hints, '提示展開次數（L1–L3）') + kpi(last ? last.slice(5, 16).replace('T', ' ') : '—', '最近一次同步（UTC）');
  }
  function kpi(v, l) { return '<div><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>'; }
  function progress() {
    var mp = mainPages(), h = '';
    mp.forEach(function (p) {
      var vals = data.map(function (s) { var g = (s.progress || {})[p.id] || {}; return g.done ? 100 : (g.pct || 0); });
      var nd = data.filter(function (s) { return ((s.progress || {})[p.id] || {}).done; }).length, avg = mean(vals);
      h += '<div class="drow"><span class="lbl">' + esc(p.title) + '</span><span class="dbar" role="img" aria-label="平均完成度 ' + fmt(avg) + '"><i class="' + (avg >= 80 ? 'ok' : '') + '" style="width:' + (avg || 0) + '%"></i></span><span class="num">平均 ' + fmt(avg) + '・完成 ' + nd + '/' + data.length + '</span></div>';
    });
    $('#d-progress').innerHTML = h;
    var t = '<table class="tbl"><thead><tr><th>學生</th>' + mp.map(function (p) { return '<th class="c">' + esc(p.title) + '</th>'; }).join('') + '</tr></thead><tbody>';
    data.forEach(function (s) {
      t += '<tr><td><code>' + esc(s.student_id) + '</code>' + (flagged(s.student_id) ? ' <span class="flagged">接手</span>' : '') + '</td>' + mp.map(function (p) {
        var g = (s.progress || {})[p.id] || {}, v = g.done ? 100 : (g.pct || 0);
        return '<td class="dtd-n ' + (g.done ? 'cell-done' : v ? 'cell-part' : 'cell-0') + '">' + (g.done ? '✓' : v ? v + '%' : '—') + '</td>';
      }).join('') + '</tr>';
    });
    $('#d-matrix').innerHTML = t + '</tbody></table>';
  }
  function misconceptions() {
    var now = {}, ever = {}, where = {}, any = 0;
    Object.keys(MIS).forEach(function (k) { now[k] = {}; ever[k] = {}; where[k] = {}; });
    data.forEach(function (s) {
      (s.answers || []).forEach(function (r) {
        if (r.field !== 'mis') return; any++;
        misOf(r.value).forEach(function (m) { if (!now[m]) { now[m] = {}; ever[m] = {}; where[m] = {}; } now[m][s.student_id] = 1; ever[m][s.student_id] = 1; var w = r.page + ' ' + r.qid; where[m][w] = (where[m][w] || 0) + 1; });
        (r.history || []).forEach(function (hh) { misOf(hh.value).forEach(function (m) { if (!ever[m]) { now[m] = {}; ever[m] = {}; where[m] = {}; } ever[m][s.student_id] = 1; }); });
      });
    });
    var n = data.length || 1, h = '';
    if (!any) h += '<div class="callout tip">目前這個班級還沒有任何 <code>mis</code> 作答紀錄（題目尚未接上，或學生還沒答到相關題目）。</div>';
    Object.keys(now).sort().forEach(function (m) {
      var a = Object.keys(now[m]), b = Object.keys(ever[m]);
      h += '<div class="mrow"><h3>' + esc(m) + (MIS[m] ? '　' + esc(MIS[m]) : '') + ' <a class="small" href="misconceptions.html#' + esc(m.toLowerCase()) + '">迷思速查</a></h3>' +
        '<div class="drow"><span class="lbl">目前 ' + a.length + ' / ' + data.length + ' 人</span><span class="dbar"><i class="mis" style="width:' + 100 * a.length / n + '%"></i></span><span class="num">' + r0(100 * a.length / n) + '%</span></div>' +
        '<div class="drow"><span class="lbl">曾出現 ' + b.length + ' / ' + data.length + ' 人</span><span class="dbar"><i class="pre" style="width:' + 100 * b.length / n + '%"></i></span><span class="num">' + r0(100 * b.length / n) + '%</span></div>' +
        '<details><summary class="small">哪些題、哪些學生</summary><p class="small">題目（次數）：' + (Object.keys(where[m]).map(function (w) { return esc(w) + '×' + where[m][w]; }).join('、') || '—') + '</p><p class="small ids">目前帶有：' + (a.map(esc).join('、') || '—') + '</p></details></div>';
    });
    $('#d-mis').innerHTML = h;
  }
  function gain() {
    var rows = [];
    data.forEach(function (s) { var a = parseMeta(s, 'pretest'), b = parseMeta(s, 'posttest'); if (a && b) rows.push({ s: s, a: a, b: b }); });
    var npre = data.filter(function (s) { return parseMeta(s, 'pretest'); }).length, npost = data.filter(function (s) { return parseMeta(s, 'posttest'); }).length;
    var h = '<p class="small">前測已提交 ' + npre + ' 人、後測已提交 ' + npost + ' 人、<b>兩者都有 ' + rows.length + ' 人</b>。</p>';
    if (!rows.length) { $('#d-gain').innerHTML = h + '<div class="callout tip">還沒有學生同時有前測與後測的第一次提交紀錄，暫時無法計算增益。</div>'; return; }
    function block(title, key, labels, order) {
      var out = '<h3>' + title + '</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + title.replace(/^依/, '') + '</th><th class="c">前測平均</th><th class="c">後測平均</th><th class="c">增益（百分點）</th><th class="c">標準化增益</th><th>示意</th><th class="c">人數</th></tr></thead><tbody>';
      order.forEach(function (k) {
        var pre = [], post = [];
        rows.forEach(function (r) { var pa = key ? pctOf(aggBy(r.a, key)[k]) : pctOf({ got: r.a.total, max: r.a.max }), pb = key ? pctOf(aggBy(r.b, key)[k]) : pctOf({ got: r.b.total, max: r.b.max }); if (pa != null && pb != null) { pre.push(pa); post.push(pb); } });
        if (!pre.length) return;
        var mp = mean(pre), mq = mean(post), d = mq - mp, g = mp >= 100 ? null : d / (100 - mp);
        out += '<tr><td>' + esc(labels[k]) + '</td><td class="c">' + fmt(mp) + '</td><td class="c">' + fmt(mq) + '</td><td class="c"><span class="delta ' + (d > 0.5 ? 'up' : d < -0.5 ? 'down' : 'eq') + '">' + (d > 0 ? '+' : '') + (Math.round(d * 10) / 10) + '</span></td><td class="c">' + (g == null ? '—' : (Math.round(g * 100) / 100)) + '</td><td style="min-width:140px"><span class="dbar two"><i class="pre" style="width:' + mp + '%"></i></span><span class="dbar two"><i class="ok" style="width:' + mq + '%"></i></span></td><td class="c">' + pre.length + '</td></tr>';
      });
      return out + '</tbody></table></div>';
    }
    h += block('整體', null, { all: '全部題目' }, ['all']);
    h += block('依學習目標', 'goal', GOALS, [1, 2, 3, 4]);
    h += block('依知識節點', 'node', NODES, ['01', '02', '03', '04']);
    h += '<p class="small muted">標準化增益＝（後測平均−前測平均）÷（100−前測平均），為班級層級的平均得分率計算。</p>';
    h += '<details class="card"><summary><b>每位學生的前後測整體得分率</b></summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>學生</th><th class="c">前測</th><th class="c">後測</th><th class="c">變化</th></tr></thead><tbody>' + rows.map(function (r) {
      var a = pctOf({ got: r.a.total, max: r.a.max }), b = pctOf({ got: r.b.total, max: r.b.max }), d = b - a;
      return '<tr><td><code>' + esc(r.s.student_id) + '</code></td><td class="c">' + fmt(a) + '</td><td class="c">' + fmt(b) + '</td><td class="c"><span class="delta ' + (d > 0.5 ? 'up' : d < -0.5 ? 'down' : 'eq') + '">' + (d > 0 ? '+' : '') + r0(d) + '</span></td></tr>';
    }).join('') + '</tbody></table></div></details>';
    $('#d-gain').innerHTML = h;
  }

  /* ---------- 單一學生 ---------- */
  function flagKey(id) { return 'dash:flag:' + cls + ':' + id; }
  function flagged(id) { return !!IOD.store.get(flagKey(id)); }
  function studentSelect() {
    var sel = $('#d-student'), cur = sel.value;
    sel.innerHTML = data.map(function (s) { return '<option value="' + esc(s.student_id) + '">' + esc(s.student_id) + (flagged(s.student_id) ? '（接手）' : '') + '</option>'; }).join('');
    if (cur && data.some(function (s) { return s.student_id === cur; })) sel.value = cur;
    oneStudent();
  }
  function cur() { var id = $('#d-student').value; return data.filter(function (s) { return s.student_id === id; })[0]; }
  function oneStudent() {
    var s = cur(), box = $('#d-one');
    $('#d-flag').disabled = $('#d-del').disabled = !s;
    if (!s) { box.innerHTML = '<p class="muted">沒有學生資料。</p>'; return; }
    $('#d-flag').textContent = flagged(s.student_id) ? '取消「教師接手」標記' : '標記「教師接手」';
    var hintOnly = $('#d-hintonly').checked, rows = (s.answers || []).slice().sort(function (a, b) { return pageOrder(a.page) - pageOrder(b.page) || (a.qid < b.qid ? -1 : a.qid > b.qid ? 1 : 0) || (a.timestamp < b.timestamp ? -1 : 1); });
    var hints = rows.filter(function (r) { return /^hint_/.test(r.field); });
    var h = '<p class="small">班級 <b>' + esc(s.class_code) + '</b>・版本 ' + esc(s.version) + '・最後同步 ' + esc(s.received_at || '') + '・作答欄位 ' + rows.length + ' 筆・提示展開 ' + hints.length + ' 次' + (flagged(s.student_id) ? '・<span class="flagged">已標記教師接手</span>' : '') + '</p>';
    h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>頁</th><th>題</th><th>欄位</th><th>內容</th><th class="c">修訂</th><th>時間</th></tr></thead><tbody>';
    var shown = 0;
    rows.forEach(function (r) {
      var isH = /^hint_/.test(r.field), isM = r.field === 'mis';
      if (hintOnly && !isH && !isM) return; shown++;
      var v = r.value == null ? '' : String(r.value), short = v.length > 120 ? v.slice(0, 120) + '…' : v;
      var hist = (r.history || []).length ? '<details><summary>修訂歷程（' + r.history.length + '）</summary>' + r.history.map(function (x) { return '<div>' + esc(String(x.ts || '').slice(5, 19).replace('T', ' ')) + '：' + esc(String(x.value).slice(0, 200)) + '</div>'; }).join('') + '</details>' : '';
      h += '<tr><td>' + esc(pageTitle(r.page)) + '</td><td>' + esc(r.qid) + '</td><td class="' + (isH ? 'hintcell' : '') + '"><code>' + esc(r.field) + '</code></td><td class="valcell">' + esc(short) + (v.length > 120 ? '<details><summary>全文</summary>' + esc(v) + '</details>' : '') + hist + '</td><td class="c">' + (r.revisions || 0) + '</td><td class="small">' + esc(String(r.timestamp || '').slice(5, 19).replace('T', ' ')) + '</td></tr>';
    });
    h += '</tbody></table></div>' + (shown ? '' : '<p class="muted">沒有符合條件的欄位。</p>');
    box.innerHTML = h;
  }

  /* ---------- 匯出／刪除 ---------- */
  var COLS = ['class_code', 'student_id', 'activity', 'page', 'qid', 'field', 'value', 'timestamp', 'revisions', 'version', 'history_json'];
  function csvCell(v) { var s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function stamp() { return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12); }
  function exportCSV() {
    var lines = [COLS.join(',')];
    data.forEach(function (s) { (s.answers || []).forEach(function (r) { var o = { class_code: s.class_code, student_id: s.student_id, history_json: JSON.stringify(r.history || []) }; lines.push(COLS.map(function (c) { return csvCell(o[c] !== undefined ? o[c] : r[c]); }).join(',')); }); });
    IOD.download('iod_class_' + cls + '_' + stamp() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function exportJSON() {
    IOD.download('iod_class_' + cls + '_' + stamp() + '.json', JSON.stringify({ class_code: cls, exported_at: new Date().toISOString(), students: data }, null, 2), 'application/json;charset=utf-8');
  }
  function delStudent() {
    var s = cur(); if (!s) return;
    if (!window.confirm('要永久刪除學生 ' + s.student_id + '（班級 ' + cls + '）在伺服器上的資料嗎？此動作無法復原。\n（學生本機瀏覽器內的資料不受影響，若他再次作答，快照會重新同步上來。）')) return;
    api('/api/teacher/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ class: cls, student_id: s.student_id }) })
      .then(function () { IOD.toast('已刪除 ' + s.student_id); load(); }).catch(onErr);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (!IOD) return;
    $('#d-reload').addEventListener('click', load);
    $('#d-class').addEventListener('change', function () { loadClass(this.value).catch(onErr); });
    $('#d-student').addEventListener('change', oneStudent);
    $('#d-hintonly').addEventListener('change', oneStudent);
    $('#d-csv').addEventListener('click', exportCSV);
    $('#d-json').addEventListener('click', exportJSON);
    $('#d-del').addEventListener('click', delStudent);
    $('#d-flag').addEventListener('click', function () { var s = cur(); if (!s) return; if (flagged(s.student_id)) IOD.store.remove(flagKey(s.student_id)); else IOD.store.set(flagKey(s.student_id), new Date().toISOString()); progress(); studentSelect(); });
    if (IOD.isTeacher()) load();
    // 登入後（site.js 的對話框）再載入
    var wasT = IOD.isTeacher(); setInterval(function () { var t = IOD.isTeacher(); if (t && !wasT) load(); wasT = t; }, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
