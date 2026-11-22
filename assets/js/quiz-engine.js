/* 前測／後測共用引擎：渲染題目、計分、分項結果、前後測比較。依賴 site.js 的 window.IOD。 */
(function () {
  'use strict';
  var C = window.QUIZ_CFG; if (!C) return;
  var GOALS = { 1: '目標1 以疊加解釋繩波與水波', 2: '目標2 解釋雙狹縫亮暗紋', 3: '目標3 比較干涉、繞射與薄膜反射', 4: '目標4 引用光學證據論證、查核回饋並修訂' };
  var GSHORT = { 1: '目標1 疊加', 2: '目標2 雙狹縫', 3: '目標3 繞射與薄膜', 4: '目標4 證據與查核' };
  var NODES = { '01': '節點01 波的疊加與水波干涉', '02': '節點02 雙狹縫干涉', '03': '節點03 單狹縫繞射', '04': '節點04 薄膜干涉與單元統整' };
  var LEVELS = ['記憶', '了解', '應用', '分析', '評鑑', '創造'];
  var UNIT = { 1: ['unit1.html', '第1節 波的疊加與水波干涉'], 2: ['unit2.html', '第2節 雙狹縫干涉'], 3: ['unit3.html', '第3節 單狹縫繞射、薄膜干涉與應用'], 4: ['unit3.html', '第3節（含 Q5 證據論證）'] };
  var L1 = {
    1: '提示 L1：先追蹤「同一個」脈衝，比較它在相遇前、重疊時、通過後的樣子；位移要看同一位置、同一時刻，振幅要看一個完整週期。',
    2: '提示 L1：兩列光波是否都到達了屏幕？到達時它們的振動步調（相位）相同或相反，會讓亮度如何變化？',
    3: '提示 L1：這個現象裡，是哪些次波源（或哪兩路反射光）在重疊？直進模型原本預測什麼、實際看到什麼？',
    4: '提示 L1：這個說法的證據是什麼？來源可以回查嗎？它是實拍、還是模型／類比？'
  };
  var PN = ['a', 'b', 'c', 'd', 'e'];
  var PRE = C.mode === 'pre';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function ptsOf(it) { return it.parts.reduce(function (s, p) { return s + (p.pts || 1); }, 0); }

  /* ---------- 圖 ---------- */
  function pulseFig(f) {
    var u = 22, base = 90, h1 = f.a * u, h2 = f.b * u, i, g = '';
    function tri(cx, h, cls) { return '<polygon class="' + cls + '" points="' + (cx - 38) + ',' + base + ' ' + cx + ',' + (base - h) + ' ' + (cx + 38) + ',' + base + '"/>'; }
    for (i = -3; i <= 3; i++) g += '<line class="fg-grid" x1="10" x2="430" y1="' + (base - i * u) + '" y2="' + (base - i * u) + '"/>';
    return '<svg viewBox="0 0 440 180" role="img" aria-label="t1 時刻繩上兩個脈衝：A 向右傳播，高度 ' + f.a + ' 格；B 向左傳播，高度 ' + f.b + ' 格（負值表示向下）">' + g +
      '<line class="fg-axis" x1="10" x2="430" y1="' + base + '" y2="' + base + '"/>' + tri(100, h1, 'fg-a') + tri(340, h2, 'fg-b') +
      '<text class="fg-txt" x="100" y="' + (f.a > 0 ? base + 16 : base - 8) + '" text-anchor="middle">A →（向右）</text>' +
      '<text class="fg-txt" x="340" y="' + (f.b > 0 ? base + 16 : base - 8) + '" text-anchor="middle">← B（向左）</text>' +
      '<text class="fg-txt" x="12" y="14">t₁：相遇前（虛線間隔 = 1 格）</text></svg>';
  }
  function dispFig() {
    var out = '<svg viewBox="0 0 440 230" role="img" aria-label="甲、乙兩個位置的位移—時間圖：甲上下起伏幅度大，乙幾乎不動">';
    [['甲', 2, 62], ['乙', 0.35, 172]].forEach(function (s) {
      var mid = s[2], d = '', t;
      out += '<line class="fg-grid" x1="40" x2="430" y1="' + (mid - 36) + '" y2="' + (mid - 36) + '"/><line class="fg-grid" x1="40" x2="430" y1="' + (mid + 36) + '" y2="' + (mid + 36) + '"/><line class="fg-axis" x1="40" x2="430" y1="' + mid + '" y2="' + mid + '"/>';
      for (t = 0; t <= 4.001; t += 0.05) d += (d ? 'L' : 'M') + r1(40 + t * 97) + ' ' + r1(mid - s[1] * 18 * Math.sin(2 * Math.PI * t / 2)) + ' ';
      out += '<path class="fg-curve" d="' + d + '"/><text class="fg-txt" x="6" y="' + (mid + 4) + '">' + s[0] + '</text><text class="fg-txt" x="428" y="' + (mid - 40) + '" text-anchor="end">+2 cm</text><text class="fg-txt" x="428" y="' + (mid + 50) + '" text-anchor="end">−2 cm</text>';
    });
    out += '<text class="fg-txt" x="40" y="224">時間 0 → 4 s（兩圖縱軸比例相同）</text></svg>';
    return out;
  }
  function curve(type, oy, H, cls) {
    var d = '', i, x, I, u;
    for (i = 0; i <= 260; i++) {
      x = -6 + 12 * i / 260;
      u = 1.1 * x; var sc = Math.abs(u) < 1e-6 ? 1 : Math.sin(u) / u;
      if (type === 'single') I = sc * sc;
      else { u = 0.4 * x; var s2 = Math.abs(u) < 1e-6 ? 1 : Math.sin(u) / u; I = Math.pow(Math.cos(2.4 * x), 2) * s2 * s2; }
      d += (i ? 'L' : 'M') + r1(30 + i * 400 / 260) + ' ' + r1(oy - I * H) + ' ';
    }
    return '<path class="' + cls + '" d="' + d + '"/>';
  }
  function intFig(f) {
    var n = f.panels.length, h = 110, out = '<svg viewBox="0 0 440 ' + (n * h + 24) + '" role="img" aria-label="' + esc(f.alt) + '">';
    f.panels.forEach(function (p, k) {
      var oy = k * h + 92;
      out += '<line class="fg-axis" x1="30" x2="430" y1="' + oy + '" y2="' + oy + '"/><line class="fg-axis" x1="30" x2="30" y1="' + (oy - 80) + '" y2="' + oy + '"/>' + curve(p, oy, 78, k ? 'fg-curve2' : 'fg-curve') +
        '<text class="fg-txt" x="36" y="' + (oy - 66) + '">' + esc(f.labels[k]) + '</text>';
    });
    return out + '<text class="fg-txt" x="30" y="' + (n * h + 18) + '">橫軸：屏幕上的位置　縱軸：光強度（相對值）</text></svg>';
  }
  function fig(f) {
    if (!f) return '';
    var s = f.type === 'pulse' ? pulseFig(f) : f.type === 'disp' ? dispFig() : intFig(f);
    return '<figure class="qfig">' + s + '<figcaption>示意圖<span class="badge-add"></span>整合者依題意自繪（理想化模型，非實拍、非 07A 素材）。</figcaption></figure>';
  }

  /* ---------- 渲染題目 ---------- */
  function render() {
    var box = $('#quiz-items'), html = '';
    C.items.forEach(function (it) {
      var h = '<section class="qcard quiz-item" id="q' + it.no + '" data-qid="Q' + it.no + '" data-act="' + C.act + '">' +
        '<div class="q-head"><span class="q-no">第 ' + it.no + ' 題</span></div>' +
        '<div class="chips"><span class="chip lv">認知層次：' + it.level + '</span><span class="chip">' + NODES[it.node] + (it.node2 ? '、節點' + it.node2 : '') + '</span><span class="chip">' + GSHORT[it.goal] + '</span><span class="chip pts">' + ptsOf(it) + ' 分</span></div>' +
        '<p class="q-stem">' + it.stem + '</p>' + fig(it.fig) + '<form onsubmit="return false">';
      it.parts.forEach(function (p, i) {
        var nm = PN[i], inline = p.opts.every(function (o) { return o.length <= 6; });
        h += '<div class="part" data-part="' + nm + '">' + (p.lead ? '<p class="lead">' + p.lead + (it.parts.length > 1 && (p.pts || 1) > 1 ? '（' + p.pts + ' 分）' : '') + '</p>' : '') + '<div class="opts' + (inline ? ' inline' : '') + '">';
        p.opts.forEach(function (o, j) { h += '<label class="opt" data-v="' + j + '"><input type="radio" name="' + nm + '" value="' + j + '"> ' + (inline ? '' : '(' + 'ABCDE'.charAt(j) + ') ') + o + '</label>'; });
        h += '</div><div class="fb"></div></div>';
      });
      h += '</form><div class="score"></div><div class="saved" aria-live="polite"></div><p class="src">題目來源：' + it.src + (it.added ? '<span class="badge-add"></span>整合補充題' : '') + '</p></section>';
      html += h;
    });
    box.innerHTML = html;
  }

  /* ---------- 計分 ---------- */
  function chosen(it) {
    var card = $('[data-qid="Q' + it.no + '"]');
    return it.parts.map(function (p, i) { var el = card.querySelector('input[name="' + PN[i] + '"]:checked'); return el ? +el.value : null; });
  }
  function grade() {
    var res = { total: 0, max: 0, items: {} };
    C.items.forEach(function (it) {
      var sel = chosen(it), got = 0, max = 0, ps = [];
      it.parts.forEach(function (p, i) { var pt = p.pts || 1; max += pt; var ok = sel[i] === p.ans; if (ok) got += pt; ps.push(sel[i] === null ? -1 : (ok ? 1 : 0)); });
      res.items[it.no] = { got: got, max: max, parts: ps };
      res.total += got; res.max += max;
    });
    return res;
  }
  function agg(res, key) {
    var m = {};
    C.items.forEach(function (it) { var k = it[key], r = res.items[it.no]; (m[k] = m[k] || { got: 0, max: 0, n: 0 }); m[k].got += r.got; m[k].max += r.max; m[k].n++; });
    return m;
  }
  function aggFromSaved(saved, key) {
    var m = {};
    (saved.cfgItems || []).forEach(function (it) { var r = saved.items[it.no]; if (!r) return; var k = it[key]; (m[k] = m[k] || { got: 0, max: 0, n: 0 }); m[k].got += r.got; m[k].max += r.max; m[k].n++; });
    return m;
  }
  function pct(o) { return o && o.max ? Math.round(100 * o.got / o.max) : 0; }
  function cls(p) { return p >= 80 ? 'hi' : p >= 50 ? 'mid' : 'low'; }

  function markCards(res) {
    C.items.forEach(function (it) {
      var card = $('[data-qid="Q' + it.no + '"]'), r = res.items[it.no];
      card.classList.add('graded');
      card.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      it.parts.forEach(function (p, i) {
        var part = card.querySelector('[data-part="' + PN[i] + '"]'), fb = part.querySelector('.fb'), st = r.parts[i], sel = chosen(it)[i];
        part.querySelectorAll('label.opt').forEach(function (l) {
          l.classList.remove('right', 'wrong', 'key');
          var v = +l.getAttribute('data-v');
          if (v === sel) l.classList.add(v === p.ans ? 'right' : 'wrong');
          else if (!PRE && v === p.ans && st !== 1) l.classList.add('key');
        });
        fb.className = 'fb ' + (st === 1 ? 'ok' : 'no');
        if (st === 1) fb.innerHTML = '答對了。' + (PRE ? '' : p.why || '');
        else if (PRE) fb.innerHTML = (st === -1 ? '尚未作答。' : '這一小題還不太對。') + (it.l1 || L1[it.goal]) + ' 回看：<a href="' + UNIT[it.goal][0] + '">' + UNIT[it.goal][1] + '</a>。（前測不顯示正解，學完後在後測再試。）';
        else fb.innerHTML = (st === -1 ? '尚未作答。' : '修正回饋：') + '正確答案是 ' + '(' + 'ABCDE'.charAt(p.ans) + ') ' + esc(p.opts[p.ans]) + '。' + (p.why || '') + ' 想複習：<a href="' + UNIT[it.goal][0] + '">' + UNIT[it.goal][1] + '</a>；迷思可查 <a href="misconceptions.html">迷思速查</a>。';
      });
      card.querySelector('.score').textContent = '本題得分：' + r.got + ' / ' + r.max;
    });
  }

  /* ---------- 結果 ---------- */
  function bars(map, order, labelFn, preMap) {
    var h = '<div class="bars">';
    order.forEach(function (k) {
      if (!map[k] && !(preMap && preMap[k])) return;
      var o = map[k] || { got: 0, max: 0, n: 0 }, p = pct(o);
      if (preMap) {
        var q = preMap[k], pp = q ? pct(q) : null, d = pp === null ? null : p - pp;
        h += '<div class="brow two"><span>' + labelFn(k) + '<br><span class="small muted">前測 ' + (q ? q.got + '/' + q.max : '—') + '　後測 ' + (map[k] ? o.got + '/' + o.max : '—') + '</span></span><span class="mset"><span class="meter"><i class="pre" style="width:' + (pp || 0) + '%"></i></span><span class="meter"><i class="' + cls(p) + '" style="width:' + p + '%"></i></span></span><span class="num">' + (pp === null ? '' : pp + '→') + p + '%' + (d === null ? '' : '<br><span class="delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'eq') + '">' + (d > 0 ? '+' : '') + d + '</span>') + '</span></div>';
      } else {
        h += '<div class="brow"><span>' + labelFn(k) + '<br><span class="small muted">' + o.n + ' 題・' + o.got + '/' + o.max + ' 分</span></span><span class="meter"><i class="' + cls(p) + '" style="width:' + p + '%"></i></span><span class="num">' + p + '%</span></div>';
      }
    });
    return h + '</div>';
  }
  function loadPre() {
    if (PRE || !C.compare) return null;
    var raw = IOD.getAnswer(C.compare, '_meta', 'first'); if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function renderResult(res) {
    var box = $('#quiz-result'), tp = pct({ got: res.total, max: res.max });
    var G = agg(res, 'goal'), N = agg(res, 'node'), L = agg(res, 'level');
    var pre = loadPre(), PG, PN_, PL, h = '';
    h += '<h2 id="result-h">' + (PRE ? '前測結果' : '後測結果') + '</h2><div class="res-total"><b>' + res.total + '</b> / ' + res.max + ' 分（' + tp + '%）<div class="small muted">' + (PRE ? '前測用來診斷起點，不列成績；各題回饋在上方題目中。' : '各題的修正回饋已顯示在上方題目中。') + '</div></div>';
    h += '<h3>依學習目標的分項結果</h3>' + bars(G, [1, 2, 3, 4], function (k) { return GOALS[k]; });
    h += '<h3>依知識節點</h3>' + bars(N, ['01', '02', '03', '04'], function (k) { return NODES[k]; });
    h += '<h3>依認知層次</h3>' + bars(L, LEVELS, function (k) { return k; });
    var weak = [1, 2, 3, 4].filter(function (k) { return G[k] && pct(G[k]) < 70; });
    h += '<h3>' + (PRE ? '接下來建議' : '還想加強的地方') + '</h3>';
    if (weak.length) { h += '<ul class="sug">'; weak.forEach(function (k) { h += '<li>' + GOALS[k] + '（' + pct(G[k]) + '%）：' + (PRE ? '上課時特別留意' : '回頭複習') + ' <a href="' + UNIT[k][0] + '">' + UNIT[k][1] + '</a>。</li>'; }); h += '</ul>'; }
    else h += '<p>各目標得分率都在 70% 以上，表現穩定。' + (PRE ? '仍建議照順序完成三節課。' : '可前往延伸學習。') + '</p>';
    if (!PRE) {
      h += '<h2>前後測比較</h2>';
      if (!pre) h += '<div class="card">尚未找到你的前測紀錄（同一瀏覽器、同一學生代碼才會比對）。請先到 <a href="pretest.html">前測</a> 作答；或若你在別的裝置做前測，則無法比較。</div>';
      else {
        PG = aggFromSaved(pre, 'goal'); PN_ = aggFromSaved(pre, 'node'); PL = aggFromSaved(pre, 'level');
        var pp = pct({ got: pre.total, max: pre.max }), d = tp - pp;
        h += '<div class="res-total">前測 <b>' + pre.total + '</b>/' + pre.max + '（' + pp + '%）　→　後測 <b>' + res.total + '</b>/' + res.max + '（' + tp + '%）<div>得分率變化 <span class="delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'eq') + '">' + (d > 0 ? '+' : '') + d + ' 個百分點</span></div></div>';
        h += '<div class="legend-row"><span><i style="background:#9fb3cc"></i>前測</span><span><i style="background:var(--c-ok)"></i>後測</span></div>';
        h += '<h3>各學習目標</h3>' + bars(G, [1, 2, 3, 4], function (k) { return GOALS[k]; }, PG);
        h += '<h3>各知識節點</h3>' + bars(N, ['01', '02', '03', '04'], function (k) { return NODES[k]; }, PN_);
        h += '<h3>各認知層次</h3>' + bars(L, LEVELS, function (k) { return k; }, PL);
        h += '<h3>同題號對照</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">題號</th><th>前測（層次／目標）</th><th class="c">前測得分</th><th>後測（層次／目標）</th><th class="c">後測得分</th><th class="c">變化</th></tr></thead><tbody>';
        C.items.forEach(function (it) {
          var a = (pre.cfgItems || []).filter(function (x) { return x.no === it.no; })[0], b = res.items[it.no], pa = pre.items[it.no];
          if (!a || !pa) return;
          var dd = b.got - pa.got;
          h += '<tr><td class="c">' + it.no + '</td><td>' + a.level + '／目標' + a.goal + '</td><td class="c">' + pa.got + '/' + pa.max + '</td><td>' + it.level + '／目標' + it.goal + '</td><td class="c">' + b.got + '/' + b.max + '</td><td class="c"><span class="delta ' + (dd > 0 ? 'up' : dd < 0 ? 'down' : 'eq') + '">' + (dd > 0 ? '+' : '') + dd + '</span></td></tr>';
        });
        h += '</tbody></table></div><p class="small muted">說明：前後測依 06 雙向細目表配置，各目標／層次的題數與配分不盡相同，故以「得分率」比較；同題號並非逐題平行題（情境不同，部分題的層次或目標也不同，已並列於下表）；各目標的前後測題組不同（例如目標2 前測 13 分、後測僅 1 分），分項比較只供參考，較可比的是整體得分率與題組相近的項目。以第一次提交的紀錄作比較。</p>';
      }
    }
    box.innerHTML = h;
    var a = $('.quiz-actions'); a.querySelector('[data-act-submit]').style.display = 'none'; a.querySelector('[data-act-retry]').style.display = '';
  }
  function save(res) {
    var items = {}, cfgItems = C.items.map(function (it) { return { no: it.no, level: it.level, goal: it.goal, node: it.node }; });
    Object.keys(res.items).forEach(function (k) { items[k] = res.items[k]; });
    var json = JSON.stringify({ page: C.page, ts: new Date().toISOString(), total: res.total, max: res.max, items: items, cfgItems: cfgItems });
    IOD.saveAnswer(C.page, '_meta', 'latest', json, C.act);
    if (!IOD.getAnswer(C.page, '_meta', 'first')) IOD.saveAnswer(C.page, '_meta', 'first', json, C.act);
    IOD.saveAnswer(C.page, '_meta', 'submitted', '1', C.act);
  }
  function submit() {
    var n = 0;
    C.items.forEach(function (it) { chosen(it).forEach(function (v) { if (v === null) n++; }); });
    if (n && !window.confirm('還有 ' + n + ' 個小題尚未作答（以 0 分計）。仍要提交嗎？')) return;
    var res = grade(); markCards(res); renderResult(res); save(res); IOD.markDone(C.page);
    var rh = $('#result-h'); if (rh) rh.scrollIntoView();
  }
  function retry() {
    if (!window.confirm('要清除這次選擇、重新作答嗎？（首次提交的紀錄仍會保留，用於前後測比較。）')) return;
    C.items.forEach(function (it) { it.parts.forEach(function (p, i) { IOD.saveAnswer(C.page, 'Q' + it.no, PN[i], '', C.act); }); });
    IOD.saveAnswer(C.page, '_meta', 'submitted', '0', C.act);
    location.reload();
  }
  function bpTable() {
    var b = C.blueprint, h = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>學習目標與知識節點（06 列名）</th>' + LEVELS.map(function (l) { return '<th class="c">' + l + '</th>'; }).join('') + '<th class="c">題數</th><th class="c">配分</th><th class="c">占分比</th></tr></thead><tbody>';
    b.rows.forEach(function (r) { h += '<tr><td>' + r[0] + '</td>' + [1, 2, 3, 4, 5, 6].map(function (i) { return '<td class="c">' + (r[1][i - 1] || '---') + '</td>'; }).join('') + '<td class="c">' + r[2] + '</td><td class="c">' + r[3] + '</td><td class="c">' + r[4] + '</td></tr>'; });
    h += '<tr><th>合計</th>' + b.sum.map(function (s) { return '<th class="c">' + s + '</th>'; }).join('') + '<th class="c">14</th><th class="c">30</th><th class="c">100%</th></tr></tbody></table></div>';
    var el = $('#blueprint'); if (el) el.innerHTML = h;
  }
  function init() {
    render(); bpTable();
    var a = $('.quiz-actions');
    a.querySelector('[data-act-submit]').addEventListener('click', submit);
    a.querySelector('[data-act-retry]').addEventListener('click', retry);
    a.querySelector('[data-act-retry]').style.display = 'none';
    C.items.forEach(function (it) { if (ptsOf(it) !== it.pts) console.warn('配分不符', it.no, ptsOf(it), it.pts); });
  }
  init(); // defer 腳本執行時 DOM 已就緒，先渲染，site.js 的 init 之後才綁定自動儲存
  function restore() {
    if (IOD.getAnswer(C.page, '_meta', 'submitted') === '1') { var res = grade(); markCards(res); renderResult(res); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(restore, 0); }); else setTimeout(restore, 0);
})();
