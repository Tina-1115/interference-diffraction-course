/* 教師專區：分頁、素材／詞彙篩選、驗收記錄、全站學習資料管理（呼叫 IOD API）。純原生 JS。 */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function iod() { return window.IOD || null; }
  function sget(k, d) { var I = iod(); try { return I ? I.store.get(k, d) : d; } catch (e) { return d; } }
  function sset(k, v) { var I = iod(); try { if (I) I.store.set(k, v); } catch (e) {} }
  function toast(m) { var I = iod(); if (I) I.toast(m); }

  /* ---------- 分頁 ---------- */
  var tabs = $$('[role=tab]'), panels = $$('.tabpanel');
  function showTab(key, focus) {
    tabs.forEach(function (t) { var on = t.getAttribute('data-tab') === key; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    panels.forEach(function (p) { p.hidden = (p.id !== 'tab-' + key); });
    if (key === 'data') renderData();
  }
  function go(hash, noScroll) {
    var id = (hash || '').replace(/^#/, '');
    if (!id) { showTab('map'); return; }
    var el = document.getElementById(id); if (!el) return;
    var p = el.classList.contains('tabpanel') ? el : el.closest('.tabpanel');
    if (p) showTab(p.id.replace('tab-', ''));
    if (!noScroll) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { var k = t.getAttribute('data-tab'); showTab(k); try { history.replaceState(null, '', '#tab-' + k); } catch (e) {} window.scrollTo(0, 0); });
    t.addEventListener('keydown', function (e) {
      var n = i; if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1; else return;
      e.preventDefault(); showTab(tabs[n].getAttribute('data-tab'), true);
    });
  });
  // 分頁內以 # 開頭的連結（含跨分頁）
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    var id = a.getAttribute('href').slice(1), el = document.getElementById(id);
    if (!el) return;
    e.preventDefault(); go('#' + id); try { history.replaceState(null, '', '#' + id); } catch (er) {}
  });
  window.addEventListener('hashchange', function () { go(location.hash); });

  /* ---------- 素材篩選 ---------- */
  (function () {
    var q = $('#as-q'), rows = $$('#as-tbl tbody tr'), g = 'all', n = $('#as-n');
    function apply() {
      var s = (q.value || '').trim().toLowerCase(), c = 0;
      rows.forEach(function (r) {
        var ok = (g === 'all' || r.getAttribute('data-g') === g) && (!s || r.textContent.toLowerCase().indexOf(s) >= 0);
        r.classList.toggle('hide', !ok); if (ok) c++;
      });
      n.textContent = '顯示 ' + c + ' / ' + rows.length + ' 件';
    }
    q.addEventListener('input', apply);
    $$('#as-f button').forEach(function (b) { b.addEventListener('click', function () { g = b.getAttribute('data-g'); $$('#as-f button').forEach(function (x) { x.classList.toggle('on', x === b); }); apply(); }); });
    apply();
  })();

  /* ---------- 詞彙表篩選 ---------- */
  (function () {
    var q = $('#g-q'), items = $$('#g-list .g'), g = 'all', n = $('#g-n');
    function apply() {
      var s = (q.value || '').trim().toLowerCase(), c = 0;
      items.forEach(function (it) {
        var ok = (g === 'all' || it.getAttribute('data-g') === g) && (!s || it.textContent.toLowerCase().indexOf(s) >= 0);
        it.hidden = !ok; if (ok) c++;
      });
      n.textContent = '顯示 ' + c + ' / ' + items.length + ' 條';
    }
    q.addEventListener('input', apply);
    $$('#g-f button').forEach(function (b) { b.addEventListener('click', function () { g = b.getAttribute('data-g'); $$('#g-f button').forEach(function (x) { x.classList.toggle('on', x === b); }); apply(); }); });
    apply();
  })();

  /* ---------- 勾選清單（交付檢核、待確認事項） ---------- */
  $$('.checklist, .chk-wrap').forEach(function (ul) {
    var key = 'teacher:chk:' + ul.getAttribute('data-chk'), st = sget(key, {}) || {};
    $$('input[type=checkbox]', ul).forEach(function (cb) {
      var k = cb.getAttribute('data-k'); cb.checked = !!st[k]; cb.closest('li, tr').classList.toggle('on', cb.checked);
      cb.addEventListener('change', function () { st[k] = cb.checked; sset(key, st); cb.closest('li, tr').classList.toggle('on', cb.checked); });
    });
  });

  /* ---------- 通用表格篩選：input[data-filter="選擇器"]，篩選符合選擇器的表格列 ---------- */
  $$('input[data-filter]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var s = (inp.value || '').trim().toLowerCase();
      $$(inp.getAttribute('data-filter')).forEach(function (tb) {
        $$('tbody tr', tb).forEach(function (r) { r.classList.toggle('hide', !!s && r.textContent.toLowerCase().indexOf(s) < 0); });
      });
    });
  });

  /* ---------- 整合驗收 ---------- */
  var ACC_KEY = 'teacher:acc';
  var SCN = { sc1: '正常操作', sc2: 'Q4 未填完整', sc3: '索取答案後仍卡住', sc4: '斷網／逾時', sc5: '重新開啟／下載' };
  function accGet() { var d = sget(ACC_KEY, null); return d && typeof d === 'object' ? d : { items: {}, sign: {} }; }
  function accRender() {
    var d = accGet(), pass = 0, fix = 0;
    $$('.acc').forEach(function (card) {
      var id = card.getAttribute('data-sc'), it = d.items[id] || {};
      $$('input[type=radio]', card).forEach(function (r) { r.checked = (r.value === (it.status || '')); });
      var nt = $('input[type=text]', card); if (nt && document.activeElement !== nt) nt.value = it.note || '';
      var ts = $('.ts', card); ts.textContent = it.ts ? '最後更新 ' + new Date(it.ts).toLocaleString('zh-TW', { hour12: false }) : '';
      card.classList.toggle('pass', it.status === 'pass'); card.classList.toggle('fix', it.status === 'fix');
      if (it.status === 'pass') pass++; else if (it.status === 'fix') fix++;
    });
    $('#sign-t').value = (d.sign && d.sign.teacher) || ''; $('#sign-e').value = (d.sign && d.sign.engineer) || '';
    $('#acc-sum').innerHTML = '<span class="ok">通過 ' + pass + '</span><span class="bad">待修 ' + fix + '</span><span>未測 ' + (5 - pass - fix) + '</span><span>' + (pass === 5 ? '五項皆通過' : '共 5 項') + '</span>';
  }
  function accSave(id, patch) {
    var d = accGet(); d.items = d.items || {}; d.items[id] = Object.assign(d.items[id] || {}, patch, { ts: new Date().toISOString() });
    sset(ACC_KEY, d); accRender();
  }
  $$('.acc').forEach(function (card) {
    var id = card.getAttribute('data-sc');
    $$('input[type=radio]', card).forEach(function (r) { r.addEventListener('change', function () { if (r.checked) accSave(id, { status: r.value }); }); });
    var nt = $('input[type=text]', card);
    nt.addEventListener('input', function () { var d = accGet(); d.items = d.items || {}; d.items[id] = Object.assign(d.items[id] || {}, { note: nt.value, ts: new Date().toISOString() }); sset(ACC_KEY, d); $('.ts', card).textContent = '已儲存'; });
  });
  ['sign-t', 'sign-e'].forEach(function (id) {
    $('#' + id).addEventListener('input', function () { var d = accGet(); d.sign = d.sign || {}; d.sign[id === 'sign-t' ? 'teacher' : 'engineer'] = this.value; sset(ACC_KEY, d); });
  });
  $('#acc-json').addEventListener('click', function () {
    var I = iod(), d = accGet(), out = { exported_at: new Date().toISOString(), source: '08 數位教材整合規劃表 驗收情境', site_version: I ? I.version : '', scenarios: [], sign: d.sign || {} };
    Object.keys(SCN).forEach(function (k) { var it = (d.items || {})[k] || {}; out.scenarios.push({ id: k, name: SCN[k], status: it.status || 'untested', note: it.note || '', updated: it.ts || '' }); });
    if (I) I.download('iod_acceptance_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(out, null, 2), 'application/json;charset=utf-8');
  });
  $('#acc-print').addEventListener('click', function () { document.body.classList.add('print-acc'); window.print(); setTimeout(function () { document.body.classList.remove('print-acc'); }, 500); });
  $('#acc-reset').addEventListener('click', function () { if (window.confirm('清除所有驗收情境的結果、備註與簽核？')) { sset(ACC_KEY, { items: {}, sign: {} }); accRender(); toast('已清除驗收紀錄'); } });

  /* ---------- 學習資料管理 ---------- */
  var PAGE_NAME = {};
  function pn(id) { return PAGE_NAME[id] || id; }
  function rows() { var I = iod(); try { return I ? I.allAnswers() : []; } catch (e) { return []; } }
  function trunc(v, n) { v = v == null ? '' : String(v); return v.length > n ? v.slice(0, n) + '…' : v; }
  function renderData() {
    var I = iod(); if (!I) { $('#d-stats').innerHTML = '<p class="bad-t">找不到 IOD API（site.js 未載入）。</p>'; return; }
    I.pages.forEach(function (p) { PAGE_NAME[p.id] = p.title; });
    var all = rows(), o = I.overall(), last = all.length ? all[all.length - 1].timestamp : '', hint = 0, hand = 0, rub = 0;
    var byPage = {};
    all.forEach(function (r) {
      var b = byPage[r.page] = byPage[r.page] || { n: 0, h: { L1: 0, L2: 0, L3: 0 } };
      b.n++;
      var m = /^hint_(L[123])$/.exec(r.field); if (m) { b.h[m[1]]++; hint++; }
      if (r.field === 'ai_handoff' && String(r.value) === '1') hand++;
      if (r.field === 'rubric') rub++;
    });
    $('#d-stats').innerHTML =
      '<div class="stat"><small>學生代碼</small><b>' + esc(I.studentId()) + '</b></div>' +
      '<div class="stat"><small>作答紀錄筆數</small><b>' + all.length + '</b></div>' +
      '<div class="stat"><small>主線完成</small><b>' + o.done + ' / ' + o.total + '</b></div>' +
      '<div class="stat"><small>提示展開次數</small><b>' + hint + '</b></div>' +
      '<div class="stat"><small>AI 接手標記</small><b>' + hand + '</b></div>' +
      '<div class="stat"><small>自評規準筆數</small><b>' + rub + '</b></div>' +
      '<div class="stat"><small>最近更新</small><b style="font-size:.95rem">' + (last ? esc(new Date(last).toLocaleString('zh-TW', { hour12: false })) : '尚無') + '</b></div>' +
      '<div class="stat"><small>教材版本</small><b style="font-size:.95rem">' + esc(I.version) + '</b></div>';
    var tb = $('#d-bypage tbody'), h = '';
    I.pages.forEach(function (p) {
      var b = byPage[p.id] || { n: 0, h: { L1: 0, L2: 0, L3: 0 } }, pg = I.getProgress(p.id);
      h += '<tr><td><a href="' + p.href + '">' + esc(p.title) + '</a></td><td>' + b.n + '</td><td>' + pg.pct + '%' + (pg.done ? ' <span class="ok-t">已完成</span>' : '') + '</td><td>' + b.h.L1 + '／' + b.h.L2 + '／' + b.h.L3 + '</td></tr>';
    });
    tb.innerHTML = h;
    var sel = $('#p-page'), cur = sel.value; sel.innerHTML = '<option value="">全部</option>' + Object.keys(byPage).map(function (k) { return '<option value="' + esc(k) + '">' + esc(pn(k)) + '（' + byPage[k].n + '）</option>'; }).join(''); sel.value = cur;
    renderPreview(all);
  }
  function renderPreview(all) {
    all = all || rows();
    var pg = $('#p-page').value, q = ($('#p-q').value || '').toLowerCase(), c = 0, h = '';
    all.slice().reverse().forEach(function (r) {
      if (pg && r.page !== pg) return;
      if (q && (r.qid + ' ' + r.field + ' ' + r.value + ' ' + r.activity).toLowerCase().indexOf(q) < 0) return;
      c++; if (c <= 80) h += '<tr><td>' + esc(pn(r.page)) + '</td><td>' + esc(r.activity) + '</td><td>' + esc(r.qid) + '</td><td>' + esc(r.field) + '</td><td>' + esc(trunc(r.value, 60)) + '</td><td>' + r.revisions + '</td><td class="small">' + esc((r.timestamp || '').replace('T', ' ').slice(0, 19)) + '</td></tr>';
    });
    $('#d-prev tbody').innerHTML = h || '<tr><td colspan="7" class="muted">沒有符合的紀錄（先到各單元作答後再回來）。</td></tr>';
    $('#p-n').textContent = '符合 ' + c + ' 筆' + (c > 80 ? '（只列最新 80 筆）' : '');
  }
  $('#p-page').addEventListener('change', function () { renderPreview(); });
  $('#p-q').addEventListener('input', function () { renderPreview(); });
  $('#d-refresh').addEventListener('click', function () { renderData(); toast('已重新整理'); });
  $('#d-csv').addEventListener('click', function () { var I = iod(); if (!I) return; if (!rows().length) { toast('目前沒有作答紀錄，仍會下載只有表頭的 CSV'); } I.exportCSV(); });
  $('#d-json').addEventListener('click', function () { var I = iod(); if (I) I.exportJSON(); });
  $('#d-clear').addEventListener('click', function () { var I = iod(); if (I) I.clearAll(); });
  $('#d-chk').addEventListener('click', function () {
    var out = $('#data-check-out'), a = rows().filter(function (r) { return r.activity === 'ACT01'; });
    if (!a.length) { out.innerHTML = '<span class="bad-t">找不到 activity＝ACT01 的紀錄。</span>請先到第2節完成 ACT01 的初稿與修訂。'; return; }
    var q4 = a.filter(function (r) { return r.qid === 'Q4'; }), d = q4.filter(function (r) { return /^d_/.test(r.field); }), rv = q4.filter(function (r) { return /^r_/.test(r.field); }), ob = q4.filter(function (r) { return /^o_/.test(r.field); });
    var rev = q4.filter(function (r) { return r.revisions > 0; }), hand = q4.filter(function (r) { return r.field === 'ai_handoff'; });
    function yn(b) { return b ? '<span class="ok-t">有</span>' : '<span class="bad-t">無</span>'; }
    out.innerHTML = '<ul><li>ACT01 紀錄共 ' + a.length + ' 筆；其中 qid＝Q4：' + q4.length + ' 筆。</li><li>初稿欄位（d_）：' + yn(d.length) + '（' + d.length + '）　修訂欄位（r_）：' + yn(rv.length) + '（' + rv.length + '）　觀察欄位（o_）：' + yn(ob.length) + '（' + ob.length + '）</li><li>含修訂歷程（revisions &gt; 0）：' + yn(rev.length) + '（' + rev.length + ' 筆）；ai_handoff 欄：' + yn(hand.length) + (hand.length ? '（值＝' + esc(hand[0].value) + '）' : '') + '</li></ul>';
  });

  /* ---------- 合併班級資料 ---------- */
  var merged = [];
  function csvCell(v) { var s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  $('#c-files').addEventListener('change', function (e) {
    var files = Array.prototype.slice.call(e.target.files || []), out = $('#c-out'), tbl = $('#c-tbl'), tb = $('#c-tbl tbody');
    merged = []; tb.innerHTML = ''; var pending = files.length, bad = [];
    if (!pending) { tbl.hidden = true; $('#c-dl').disabled = true; out.textContent = ''; return; }
    var stats = [];
    files.forEach(function (f) {
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var j = JSON.parse(String(fr.result).replace(/^\uFEFF/, ''));
          if (!j || !Array.isArray(j.answers)) throw new Error('缺少 answers');
          var sid = j.student_id || '(未知)', hint = 0, hand = 0, rub = 0, done = 0;
          j.answers.forEach(function (r) {
            merged.push({ student_id: r.student_id || sid, activity: r.activity || '', page: r.page, qid: r.qid, field: r.field, value: r.value, timestamp: r.timestamp, revisions: r.revisions, version: r.version || j.version || '', source_file: f.name });
            if (/^hint_L[123]$/.test(r.field)) hint++; if (r.field === 'ai_handoff' && String(r.value) === '1') hand++; if (r.field === 'rubric') rub++;
          });
          if (j.progress) Object.keys(j.progress).forEach(function (k) { if (j.progress[k] && j.progress[k].done) done++; });
          stats.push({ sid: sid, file: f.name, n: j.answers.length, done: done, hint: hint, hand: hand, rub: rub });
        } catch (er) { bad.push(f.name + '（' + er.message + '）'); }
        if (--pending === 0) finish();
      };
      fr.onerror = function () { bad.push(f.name + '（讀取失敗）'); if (--pending === 0) finish(); };
      fr.readAsText(f, 'utf-8');
    });
    function finish() {
      stats.sort(function (a, b) { return a.sid < b.sid ? -1 : 1; });
      tb.innerHTML = stats.map(function (s) { return '<tr><td>' + esc(s.sid) + '</td><td class="small">' + esc(s.file) + '</td><td>' + s.n + '</td><td>' + s.done + '</td><td>' + s.hint + '</td><td>' + s.hand + '</td><td>' + s.rub + '</td></tr>'; }).join('');
      tbl.hidden = !stats.length;
      var ids = {}; stats.forEach(function (s) { ids[s.sid] = (ids[s.sid] || 0) + 1; });
      var dup = Object.keys(ids).filter(function (k) { return ids[k] > 1; });
      out.innerHTML = '已合併 ' + stats.length + ' 份檔案、' + merged.length + ' 筆紀錄。' + (bad.length ? '<br><span class="bad-t">無法讀取：' + esc(bad.join('、')) + '（請選擇本站匯出的 JSON）</span>' : '') + (dup.length ? '<br><span class="bad-t">重複的學生代碼：' + esc(dup.join('、')) + '（可能是同一人多次匯出）</span>' : '');
      $('#c-dl').disabled = !merged.length;
    }
  });
  $('#c-dl').addEventListener('click', function () {
    var I = iod(); if (!I || !merged.length) return;
    var cols = ['student_id', 'activity', 'page', 'qid', 'field', 'value', 'timestamp', 'revisions', 'version', 'source_file'], lines = [cols.join(',')];
    merged.forEach(function (r) { lines.push(cols.map(function (c) { return csvCell(r[c]); }).join(',')); });
    I.download('iod_class_merged_' + new Date().toISOString().slice(0, 10) + '.csv', '\uFEFF' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  });

  /* ---------- 初始化 ---------- */
  accRender();
  if (location.hash && document.getElementById(location.hash.slice(1))) go(location.hash); else showTab('map');
  tabs.forEach(function (t) { t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1; });
})();
