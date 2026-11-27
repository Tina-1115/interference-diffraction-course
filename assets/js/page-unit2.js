/* unit2 專屬腳本：預測→觀察→解釋→修正；ACT01(Q4)整合頁；M01/M02/光的干涉模擬；素材庫。純原生、無外網。 */
(function () {
  'use strict';
  var PAGE = 'unit2';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function G(qid, f) { return window.IOD.getAnswer(PAGE, qid, f); }
  function S(qid, f, v, act) { return window.IOD.saveAnswer(PAGE, qid, f, v, act); }
  function hhmm(iso) { try { return new Date(iso).toLocaleTimeString('zh-TW', { hour12: false }); } catch (e) { return ''; } }
  function setupCanvas(cv, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = h * dpr;
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return c;
  }
  var timers = {};
  function debounce(k, fn, ms) { clearTimeout(timers[k]); timers[k] = setTimeout(fn, ms); }
  function logOps(qid, arr, act) { debounce('ops' + qid, function () { S(qid, 'ops_log', JSON.stringify(arr.slice(-60)), act); }, 700); }

  /* ================= SVG 素材 ================= */
  function svgWrap(vb, inner, label) {
    return '<svg viewBox="' + vb + '" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">' + inner + '</svg>';
  }
  function fringeSVG() { // M01 / 07A 實拍：站內自繪示意
    var s = '<rect width="600" height="200" fill="#0a0000"/>', i, p = 46, x, I, env, col;
    for (i = 0; i < 120; i++) {
      x = i * 5 + 2.5; var u = (x - 300) / p;
      I = Math.pow(Math.cos(Math.PI * u), 2); env = Math.exp(-Math.pow((x - 300) / 230, 2));
      I = Math.max(0, I * env);
      col = 'rgb(' + Math.round(255 * I) + ',' + Math.round(22 * I) + ',' + Math.round(14 * I) + ')';
      s += '<rect x="' + (i * 5) + '" y="30" width="5.2" height="140" fill="' + col + '"/>';
    }
    s += '<text x="8" y="18" fill="#bbb">屏幕上的亮度分布（站內自繪示意）</text><text x="8" y="192" fill="#bbb">中央附近：明暗交替、左右近似對稱</text>';
    return svgWrap('0 0 600 200', s, '雙狹縫紅光屏幕條紋（站內自繪示意，非原始照片）');
  }
  function huy(mode) {
    var s = '<rect width="420" height="220" fill="#fff"/>', x, r;
    s += '<g stroke="#1f5fa8" stroke-width="2">';
    [30, 55, 80, 105, 130].forEach(function (x0) { s += '<line x1="' + x0 + '" y1="12" x2="' + x0 + '" y2="208"/>'; });
    s += '</g><text x="22" y="224" fill="#1f5fa8">入射平面波面</text>';
    s += '<g fill="#333"><rect x="150" y="8" width="8" height="72"/><rect x="150" y="100" width="8" height="20"/><rect x="150" y="140" width="8" height="72"/></g>';
    s += '<g fill="none" stroke="#1f5fa8" stroke-width="1.6">';
    [90, 130].forEach(function (cy, k) {
      s += '<g stroke="' + (k ? '#e07a1f' : '#1f5fa8') + '">';
      (mode === 'frame' ? [30, 70] : [26, 52, 78, 104, 130]).forEach(function (rr) { s += '<path d="M158,' + (cy - rr) + ' A' + rr + ',' + rr + ' 0 0 1 158,' + (cy + rr) + '"/>'; });
      s += '</g>';
    });
    s += '</g><circle cx="158" cy="90" r="4" fill="#1f5fa8"/><circle cx="158" cy="130" r="4" fill="#e07a1f"/>';
    s += '<text x="164" y="84">S₁ 次波源</text><text x="164" y="148">S₂ 次波源</text>';
    s += '<text x="190" y="214" fill="#555">' + (mode === 'frame' ? '定格：窄縫處各點可視為發出次波的波源' : '次波圓弧是模型，不是肉眼看到的光路') + '</text>';
    return svgWrap('0 0 420 230', s, '惠更斯原理示意：平面波通過兩窄縫後，兩縫各成為次波源');
  }
  function setup(v) { // v: plain|parts|labels|mono|predict
    var mono = v === 'mono', ink = mono ? '#000' : '#1d2733', s = '<rect width="460" height="210" fill="#fff"/>';
    s += '<line x1="15" y1="172" x2="445" y2="172" stroke="' + ink + '" stroke-width="4"/>';
    s += '<rect x="30" y="118" width="62" height="34" fill="' + (mono ? '#ddd' : '#f2b8b0') + '" stroke="' + ink + '"/><text x="38" y="140">雷射光源</text>';
    s += '<rect x="215" y="78" width="7" height="30" fill="' + ink + '"/><rect x="215" y="116" width="7" height="12" fill="' + ink + '"/><rect x="215" y="136" width="7" height="30" fill="' + ink + '"/>';
    s += '<text x="196" y="68">雙狹縫片</text>';
    s += '<rect x="410" y="48" width="7" height="118" fill="' + (mono ? '#999' : '#889') + '"/><text x="400" y="40">屏幕</text>';
    s += '<line x1="60" y1="152" x2="60" y2="172" stroke="' + ink + '"/><line x1="218" y1="166" x2="218" y2="172" stroke="' + ink + '"/><line x1="413" y1="166" x2="413" y2="172" stroke="' + ink + '"/>';
    if (v === 'labels') {
      s += '<g stroke="' + ink + '" fill="' + ink + '"><line x1="222" y1="190" x2="410" y2="190"/><polygon points="222,190 230,186 230,194"/><polygon points="410,190 402,186 402,194"/></g><text x="285" y="204">屏距 L</text>';
      s += '<g stroke="' + ink + '"><line x1="258" y1="86" x2="258" y2="126"/></g><text x="262" y="110">縫距 d</text>';
    }
    if (v === 'parts') {
      s += '<text x="26" y="196">光源（教師操作）</text><text x="190" y="196">雙狹縫</text><text x="392" y="196">觀察屏</text><text x="120" y="164" fill="#555">光凳（固定器材位置）</text>';
    }
    if (v === 'predict') s += '<text x="418" y="112" font-size="26" fill="#b8650a">？</text><text x="60" y="30" fill="#555">依你的模型，屏幕上會看到什麼？</text>';
    s += '<text x="12" y="16" fill="#555">只標示器材位置，不畫光線路徑</text>';
    return svgWrap('0 0 460 210', s, '雙狹縫實驗架設空間位置示意（' + v + '）');
  }
  function bdModel() {
    var s = '<rect width="470" height="270" fill="#fff"/>';
    s += '<g fill="#333"><rect x="58" y="10" width="7" height="85"/><rect x="58" y="105" width="7" height="50"/><rect x="58" y="165" width="7" height="95"/></g>';
    s += '<text x="30" y="104">S₁</text><text x="30" y="164">S₂</text>';
    s += '<rect x="360" y="10" width="7" height="250" fill="#333"/>';
    s += '<g stroke="#1f5fa8" stroke-width="1.6"><line x1="65" y1="100" x2="360" y2="50"/><line x1="65" y1="160" x2="360" y2="50"/></g>';
    s += '<g stroke="#e07a1f" stroke-width="1.6" stroke-dasharray="6 4"><line x1="65" y1="100" x2="360" y2="150"/><line x1="65" y1="160" x2="360" y2="150"/></g>';
    s += '<circle cx="360" cy="50" r="5" fill="#1f5fa8"/><circle cx="360" cy="150" r="5" fill="#e07a1f"/>';
    s += '<text x="372" y="54">B 亮紋</text><text x="372" y="154">D 暗紋</text>';
    s += '<text x="90" y="30" fill="#1f5fa8">兩路同相到達 → 建設性 → 光強較強</text><text x="90" y="250" fill="#b8650a">兩路反相到達 → 破壞性 → 等振幅理想下為零</text>';
    s += '<path d="M440,10 C420,50 460,50 440,90 C420,130 460,130 440,170" fill="none" stroke="#999" stroke-dasharray="2 3"/>';
    s += '<text x="395" y="266" fill="#777">模型・未依比例</text>';
    return svgWrap('0 0 470 275', s, '雙狹縫亮暗條紋 B、D 模型圖');
  }

  var GAL = [
    { tag: '07A-2-01', t: '惠更斯原理示意圖解', f: '惠更斯原理_示意圖解說.png', svg: function () { return huy(); }, c: '概念圖解｜第2節解釋；連結狹縫與次波源模型。本教材自製（站內重繪）。' },
    { tag: '07A-2-02', t: '光凳器材組', f: '光凳器材組_Waifer-X_Cuesta-College_CC-BY-2.0.jpg', svg: function () { return setup('parts'); }, c: '器材照片｜實驗前器材辨認；不宣稱照片為本次實驗組。原圖：Waifer X／Cuesta College，CC BY 2.0。此為站內自繪示意代替，原圖請至 <a href="https://commons.wikimedia.org/wiki/File:Optical_Bench_educational_Kit_-_Cuesta_College.jpg" target="_blank" rel="noopener">Wikimedia 來源頁</a>。' },
    { tag: '07A-2-03', t: '光凳實際架設', f: '光凳實際架設_Cantons-de-lEst_CC-BY-SA-4.0.jpg', svg: function () { return setup('labels'); }, c: '架設照片｜建立空間配置概念。原圖：Cantons-de-l\'Est，CC BY-SA 4.0；此為站內自繪示意代替，原圖見 <a href="https://commons.wikimedia.org/wiki/File:Banc_optique_-_exemple_de_montage_01.jpg" target="_blank" rel="noopener">Wikimedia 來源頁</a>。' },
    { tag: '07A-2-04', t: '雙狹縫干涉紅光實拍（M01）', f: '雙狹縫干涉_紅光實拍_Bryan-Tong-Minh_PD.jpg', svg: function () { return fringeSVG(); }, zoom: true, c: '實拍｜632.8 nm 紅光；第2節觀察主要證據，先於理想模型呈現。原圖：Bryan Tong Minh，Public Domain，<a href="https://commons.wikimedia.org/wiki/File:Subwavelength_slits.JPG" target="_blank" rel="noopener">來源頁</a>。<strong>此處為站內自繪示意，不等同原始照片。</strong>' },
    { tag: '07A-2-05', t: '惠更斯原理關鍵畫面（紙本）', f: '紙本教材用/惠更斯原理_關鍵畫面.png', svg: function () { return huy('frame'); }, c: '紙本衍生圖｜定格說明，與示意圖概念一致。本教材自製（站內重繪）。' },
    { tag: '07A-2-06', t: '雙狹縫亮暗條紋 B、D（紙本模型）', f: '紙本教材用/雙狹縫_亮暗條紋_BD.png', svg: function () { return bdModel(); }, c: '紙本模型圖｜說明同相／反相到達與亮暗位置；理想模型，不是實拍。建議完成活動二再回看。' },
    { tag: '07A-2-07', t: '雙狹縫實驗架設空間位置示意（紙本輸出）', f: '紙本教材用/雙狹縫實驗架設_空間位置示意.svg.png', svg: function () { return setup('mono'); }, c: '紙本衍生圖｜只呈現器材位置，不畫光線路徑。黑白版適合列印。' },
    { tag: '07A-2-08', t: '雙狹縫實驗架設空間位置示意（向量，T01）', f: '雙狹縫實驗架設_空間位置示意.svg', svg: function () { return setup('plain'); }, c: '向量示意圖｜實驗操作前說明；可無損放大（即整合頁素材 T01）。' },
    { tag: '07A-2-09', t: '雙狹縫次波模型題圖', f: '雙狹縫次波模型_自製題圖.png', svg: function () { return huy(); }, extra: 'sub', c: '模型題圖｜要求學生區分證據與模型。下方小測驗：把三項歸類。' },
    { tag: '07A-2-10', t: '雙狹縫裝置預測題圖', f: '雙狹縫裝置_預測題圖.png', svg: function () { return setup('predict'); }, c: '預測題圖｜先保留自己的預測，再看實拍（即活動一的預測題圖）。' }
  ];

  /* ================= 縮放視窗 ================= */
  function zoomHTML(html) {
    var d = $('#zoomdlg'); if (!d) return;
    $('#zbody', d).innerHTML = html;
    if (typeof d.showModal === 'function') { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } else d.setAttribute('open', '');
  }
  function closeZoom() { var d = $('#zoomdlg'); if (!d) return; if (typeof d.close === 'function') { try { d.close(); } catch (e) { d.removeAttribute('open'); } } else d.removeAttribute('open'); }

  /* ================= 鎖定／閘門／階梯提示 ================= */
  var LOCKS = {
    q1: { qid: 'Q1', field: 'locked_at', card: '#card-q1', act: 'S2-01' },
    q4d: { qid: 'Q4', field: 'd_locked_at', card: '#card-q4d', act: 'ACT01' },
    sp: { qid: 'SIM', field: 'locked_at', card: '#card-sp', act: 'S2-04' }
  };
  function isLocked(id) { var L = LOCKS[id]; return !!(L && G(L.qid, L.field)); }
  function cardComplete(card) {
    var ok = true, seen = {};
    $$('[data-req]', card).forEach(function (el) {
      if (el.type === 'radio') { if (seen[el.name]) return; seen[el.name] = 1; if (!$('input[name="' + el.name + '"]:checked', card)) ok = false; }
      else if (!String(el.value).trim()) ok = false;
    });
    return ok;
  }
  function refreshGates() {
    $$('[data-gate]').forEach(function (g) { g.classList.toggle('open', isLocked(g.getAttribute('data-gate'))); });
  }
  function applyLock(id) {
    var L = LOCKS[id], card = $(L.card); if (!card) return;
    var on = isLocked(id), btn = $('.lockbtn', card), msg = $('.lockmsg', card), warn = $('.warn', card);
    card.classList.toggle('locked', on);
    $$('input,textarea,select,.cellrow button', card).forEach(function (el) { el.disabled = on; });
    if (on) {
      if (btn) { btn.disabled = true; btn.textContent = '已送出並鎖定'; }
      if (msg) { msg.textContent = '預測已鎖定（' + hhmm(G(L.qid, L.field)) + '），之後只能在「修正」步驟對照並修訂。'; msg.classList.add('on'); }
      if (warn) warn.textContent = '';
    } else {
      var ok = cardComplete(card);
      if (btn) btn.disabled = !ok;
      if (warn) warn.textContent = ok ? '' : '請先填完必填欄位（含理由／解釋），才能送出並鎖定。';
    }
    refreshGates();
  }
  function lock(id) {
    var L = LOCKS[id], card = $(L.card);
    if (isLocked(id)) return;
    if (!cardComplete(card)) return;
    S(L.qid, L.field, new Date().toISOString(), L.act);
    applyLock(id);
    document.dispatchEvent(new CustomEvent('poe:locked', { detail: id }));
    window.IOD.toast('已送出並鎖定預測');
  }
  function initLocks() {
    Object.keys(LOCKS).forEach(function (id) {
      var L = LOCKS[id], card = $(L.card); if (!card) return;
      var btn = $('.lockbtn', card);
      if (btn) btn.addEventListener('click', function () { lock(id); });
      ['input', 'change'].forEach(function (ev) { card.addEventListener(ev, function () { if (!isLocked(id)) applyLock(id); }); });
      applyLock(id);
    });
    refreshGates();
  }
  function initLadders() {
    $$('.hints[data-ladder]').forEach(function (h) {
      var card = h.closest('.qcard'), qid = card ? card.getAttribute('data-qid') : '';
      var d = { L1: $('.L1', h), L2: $('.L2', h), L3: $('.L3', h) };
      function upd() {
        if (d.L2) d.L2.hidden = !(G(qid, 'hint_L1') || (d.L1 && d.L1.open));
        if (d.L3) d.L3.hidden = !(G(qid, 'hint_L2') || (d.L2 && d.L2.open));
      }
      ['L1', 'L2'].forEach(function (k) { if (d[k]) d[k].addEventListener('toggle', upd); });
      upd();
    });
  }

  /* ================= 活動一：預測圖樣小格、對照 ================= */
  function initCells() {
    [['#cells', '#q1_pattern', 'q1'], ['#cells2', '#q2_pattern', null]].forEach(function (cfg) {
      var wrap = $(cfg[0]), hid = $(cfg[1]); if (!wrap || !hid) return;
      var N = 15, val = (hid.value || '').length === N ? hid.value : new Array(N + 1).join('0');
      function draw() {
        if ((hid.value || '').length === N) val = hid.value;
        wrap.innerHTML = '';
        for (var i = 0; i < N; i++) (function (i) {
          var b = document.createElement('button'); b.type = 'button';
          b.setAttribute('aria-pressed', val.charAt(i) === '1'); b.setAttribute('aria-label', '第' + (i + 1) + '格 ' + (val.charAt(i) === '1' ? '暗' : '亮'));
          b.disabled = cfg[2] ? isLocked(cfg[2]) : false;
          b.addEventListener('click', function () {
            val = val.substr(0, i) + (val.charAt(i) === '1' ? '0' : '1') + val.substr(i + 1);
            hid.value = val; hid.dispatchEvent(new Event('change', { bubbles: true })); draw();
          });
          wrap.appendChild(b);
        })(i);
      }
      draw();
      document.addEventListener('poe:locked', draw);
      if (cfg[2] === 'q1') window.__redrawCells = draw; else window.__redrawCells2 = draw;
    });
  }
  function patHTML(v) {
    var s = '<div class="pat" aria-label="預測圖樣（深色=暗）">';
    for (var i = 0; i < 15; i++) s += '<i class="' + ((v || '').charAt(i) === '1' ? 'on' : '') + '"></i>';
    return s + '</div>';
  }
  function renderCmpA() {
    var box = $('#cmpA'); if (!box) return;
    var locked = isLocked('q1');
    var ch = G('Q1', 'q1_choice'), rs = G('Q1', 'q1_reason'), pt = G('Q1', 'q1_pattern');
    var srcs = [];
    if (G('Q2', 'q2_src_live') === '1') srcs.push('現場示範');
    if (G('Q2', 'q2_src_photo') === '1') srcs.push('有來源的實拍照片／影片');
    if (G('Q2', 'q2_src_model') === '1') srcs.push('僅理想模型');
    box.innerHTML = '<div class="orig"><h4>原預測（已鎖定，不可改）</h4>' + (locked ?
      '<p class="small">選擇：' + esc(ch || '—') + '</p>' + patHTML(pt) + '<p class="small cmpq">理由：' + esc(rs || '—') + '</p>' : '<p class="muted small">尚未送出預測。</p>') + '</div>' +
      '<div><h4>我的觀察（Q2）</h4><p class="small">資料來源：' + esc(srcs.join('、') || '—') + '</p>' + (G('Q2', 'q2_pattern') ? patHTML(G('Q2', 'q2_pattern')) : '') + '<p class="small cmpq">特徵一：' + esc(G('Q2', 'q2_f1') || '—') + '\n特徵二：' + esc(G('Q2', 'q2_f2') || '—') + '</p><p class="small cmpq">我認為預測與觀察的矛盾：' + esc(G('Q3', 'q3_explain') || '—') + '</p></div>';
  }

  /* ================= 活動二 ACT01 ================= */
  var ops = [];
  function op(ev) { ops.push({ t: new Date().toISOString(), ev: ev }); logOps('Q4', ops, 'ACT01'); }
  var DRAFT_RADIOS = ['d_B_phase', 'd_B_int', 'd_B_inten', 'd_D_phase', 'd_D_int', 'd_D_inten'];
  function dval(n) { var e = $('input[name="' + n + '"]:checked'); return e ? e.value : ''; }
  function draftComplete() { return cardComplete($('#card-q4d')); }
  function updateAIButton() {
    var ok = draftComplete(), btn = $('#ai-ask'), msg = $('#ai-gate-msg'), st = aiState;
    btn.disabled = !ok || st.skipped;
    msg.textContent = !ok ? '請先完成選項與解釋（B、D 各三項選擇，並寫下解釋）。原稿仍可編輯，自動保存。' : (st.skipped ? '你已略過 AI；仍可再展開使用。' : '已完成初稿。可按「請 AI 追問」，也可略過。');
    var done = $('#btn-done'); if (done) { done.disabled = !ok; }
    var dh = $('#done-hint'); if (dh) dh.textContent = ok ? '' : '需先完成初稿才能完成；AI 與修訂可略過。';
  }
  function updateStepper() {
    var s1 = isLocked('q4d'), s2 = ['o_B_peak', 'o_B_amp', 'o_D_peak', 'o_D_amp'].every(function (n) { return G('Q4', n); });
    var s3 = (aiState.asked > 0 || aiState.skipped), s4 = !!(G('Q4', 'r_explain') && G('Q4', 'r_mode'));
    var arr = [s1, s2, s3, s4], first = arr.indexOf(false);
    $$('#act-stepper li').forEach(function (li, i) { li.className = arr[i] ? 'done' : (i === first ? 'cur' : ''); });
    $('#d-state').textContent = s1 ? '已送出並鎖定' : '編輯中・自動儲存';
  }
  /* --- 規則式 AI（本機示範，不連外網） --- */
  var aiState = { asked: 0, lastIssue: '', streak: 0, handoff: false, skipped: false };
  var dlg = [];
  var AI_TXT = {
    ask_answer: ['先從你已有的觀察開始：實拍中哪項亮暗特徵需要解釋？', '再看模型的 B 與 D：兩列波到達時，振動的步調各是什麼樣子？'],
    no_light: ['你說「沒有光到達D」，是根據哪項觀察？', '先看模型：兩個狹縫發出的波，都能到達D點嗎？'],
    energy: ['其他屏幕位置的亮度有何變化？', '你說光「不見了」；如果真的不見，屏幕其他位置的亮度應該怎麼變？'],
    model_real: ['這個畫面是實際紀錄，還是用來解釋的模型？', '請分別指出：哪些線條是肉眼看得到的實拍特徵，哪些是模型幫忙說明的？'],
    conflict: ['你在觀察記錄與初稿的選擇好像不一致，請再看一次模型：它們各自對應到哪一處？', '回到疊加圖，對照你的觀察記錄，初稿裡哪一項需要再確認？'],
    B_wrong: ['請回到模型只看 B：兩條波到達 B 時，波峰是同時到達還是錯開？', '看疊加圖：B 處兩列波加起來，振幅比單列大還是小？'],
    D_wrong: ['請回到模型只看 D：兩條波到達 D 時，波峰是同時到達還是一峰一谷？', '看疊加圖：D 處兩列波加起來，振幅比單列大還是小？'],
    no_mech: ['你的解釋有提到兩列波到達時的相位關係嗎？請用『因為……所以……』連起相位、疊加與亮暗。', '先寫出：兩個狹縫各自發出什麼，到了屏幕同一點會怎樣？'],
    refine: ['實際的暗紋常常沒有完全黑；在什麼條件下，暗處才會「理想為零」？', '你的解釋中，哪一句是現象證據、哪一句是模型說明？']
  };
  var RX_NOLIGHT = /(沒有?光|光沒|沒光|沒到|沒有到|未到達|到不了|不到|被擋|無光|沒有任何光)/;
  var RX_ENERGY = /能量.{0,4}(消失|不見|沒了|被吃)|光(消失|不見)/;
  var RX_MODEL = /圓弧|沿著?.{0,3}(弧|圓)|光路|照片.{0,6}(波前|圓)/;
  var RX_MECH = /(相位|疊加|相消|相加|同相|反相|干涉|增強|減弱|步調)/;
  var MIS_ACT = { Q2: 'S2-02', Q3: 'S2-02', Q4: 'ACT01', GAL: 'S2-GAL' };
  /* 迷思串接：mis 欄位存 'M3' 或 'M3,M4'；未觸發時改寫為空字串（原本沒有值就不寫） */
  function setMis(qid, codes) {
    var v = codes.join(','), old = G(qid, 'mis');
    if (!v && !old) return;
    S(qid, 'mis', v, MIS_ACT[qid] || '');
  }
  function showMisFb(qid, codes) {
    var box = document.querySelector('.mis-fb[data-mis-for="' + qid + '"]'); if (!box) return;
    if (!codes.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '想再想想看？可參考：' + codes.map(function (c) { return '<a class="mlink" href="misconceptions.html#' + c.toLowerCase() + '">迷思' + c + '</a>'; }).join('、');
  }
  function refreshMisFb() { ['Q2', 'Q3', 'Q4'].forEach(function (q) { var v = G(q, 'mis'); showMisFb(q, v ? String(v).split(',').filter(Boolean) : []); }); }
  function misQ4() {
    var ex = ($('#d_explain') ? $('#d_explain').value : '') || '', c = [];
    if (!ex.trim()) return c;
    if (RX_NOLIGHT.test(ex) || RX_ENERGY.test(ex)) c.push('M3');
    if (RX_MODEL.test(ex)) c.push('M4');
    else if (!c.length && draftComplete() && !RX_MECH.test(ex)) c.push('M3');
    return c;
  }
  function misQ3() { var ex = ($('#q3_explain') ? $('#q3_explain').value : '') || ''; return RX_MODEL.test(ex) ? ['M4'] : []; }
  function misQ2() {
    var src = ['q2_src_live', 'q2_src_photo', 'q2_src_model'].some(function (n) { var e = document.querySelector('[name="' + n + '"]'); return e && e.checked; });
    var f = (($('#q2_f1') || {}).value || '') + ' ' + (($('#q2_f2') || {}).value || '');
    if (RX_MODEL.test(f)) return ['M4'];
    if (!src && f.trim()) return ['M4'];
    return [];
  }
  function bindMis() {
    var defs = [['#card-q2', 'Q2', misQ2], ['#card-q3a', 'Q3', misQ3], ['#card-q4d', 'Q4', misQ4]];
    defs.forEach(function (d) {
      var card = $(d[0]); if (!card) return;
      function upd() { var c = d[2](); showMisFb(d[1], c); debounce('mis' + d[1], function () { setMis(d[1], c); }, 800); }
      card.addEventListener('input', upd); card.addEventListener('change', upd);
    });
    refreshMisFb();
  }
  function analyze() {
    var ex = ($('#d_explain').value || ''), ob = {
      Bp: G('Q4', 'o_B_peak'), Ba: G('Q4', 'o_B_amp'), Dp: G('Q4', 'o_D_peak'), Da: G('Q4', 'o_D_amp')
    };
    if (/直接.{0,4}(答案|解答)|完整答案|標準答案|給我答案|告訴我答案|幫我寫|替我寫/.test(ex)) return 'ask_answer';
    if (RX_NOLIGHT.test(ex)) return 'no_light';
    if (RX_ENERGY.test(ex)) return 'energy';
    if (RX_MODEL.test(ex)) return 'model_real';
    var conflict = false;
    function chk(pp, ph, aa, inten) {
      if (pp && ph && ((/同時/.test(pp) && ph === '反相') || (/錯開|一峰一谷/.test(pp) && ph === '同相'))) conflict = true;
      if (aa && inten && ((/大/.test(aa) && inten === '理想下為零') || (/零/.test(aa) && inten === '較強'))) conflict = true;
    }
    chk(ob.Bp, dval('d_B_phase'), ob.Ba, dval('d_B_inten')); chk(ob.Dp, dval('d_D_phase'), ob.Da, dval('d_D_inten'));
    if (conflict) return 'conflict';
    if (dval('d_B_phase') !== '同相' || dval('d_B_int') !== '建設性' || dval('d_B_inten') !== '較強') return 'B_wrong';
    if (dval('d_D_phase') !== '反相' || dval('d_D_int') !== '破壞性' || dval('d_D_inten') !== '理想下為零') return 'D_wrong';
    if (!RX_MECH.test(ex)) return 'no_mech';
    return 'refine';
  }
  function renderDlg() {
    var box = $('#ai-log'); box.innerHTML = '';
    dlg.forEach(function (m) {
      var d = document.createElement('div'); d.className = 'ai-bubble ' + m.role;
      d.innerHTML = '<small>' + (m.role === 'ai' ? '規則式示範，非真實 AI' : m.role === 'stu' ? '我' : '系統') + (m.ts ? '・' + hhmm(m.ts) : '') + '</small>' + esc(m.text).replace(/\n/g, '<br>') + (m.html || '');
      box.appendChild(d);
    });
    $('#ai-empty').hidden = dlg.length > 0;
    $$('#ai-log [data-retry]').forEach(function (b) { b.addEventListener('click', function () { runAI(); }); });
    $$('#ai-log [data-skip]').forEach(function (b) { b.addEventListener('click', skipAI); });
  }
  function saveAI() {
    var keep = dlg.filter(function (m) { return !m.html; });
    S('Q4', 'ai_dialog', JSON.stringify(keep), 'ACT01');
    S('Q4', 'ai_state', JSON.stringify(aiState), 'ACT01');
    S('Q4', 'ai_handoff', aiState.handoff ? '1' : '0', 'ACT01');
  }
  function askAI() {
    if (!draftComplete()) return;
    if (!isLocked('q4d')) lock('q4d');
    S('Q4', 'draft_snapshot', JSON.stringify({ ts: new Date().toISOString(), B: [dval('d_B_phase'), dval('d_B_int'), dval('d_B_inten')], D: [dval('d_D_phase'), dval('d_D_int'), dval('d_D_inten')], explain: $('#d_explain').value }), 'ACT01');
    var sum = 'B：' + dval('d_B_phase') + '／' + dval('d_B_int') + '／' + dval('d_B_inten') + '；D：' + dval('d_D_phase') + '／' + dval('d_D_int') + '／' + dval('d_D_inten') + '\n解釋：' + $('#d_explain').value;
    dlg = dlg.filter(function (m) { return !m.html; });
    dlg.push({ role: 'stu', text: sum, ts: new Date().toISOString() });
    aiState.skipped = false; $('#ai-body').hidden = false;
    runAI();
  }
  function runAI() {
    dlg = dlg.filter(function (m) { return !m.html; });
    dlg.push({ role: 'sys', text: '規則式示範正在比對你的初稿……', html: '', ts: null, tmp: 1 }); renderDlg();
    $('#ai-ask').disabled = true;
    setTimeout(function () {
      dlg = dlg.filter(function (m) { return !m.tmp; });
      if ($('#ai-timeout').checked) {
        S('Q4', 'ai_status', 'timeout', 'ACT01');
        dlg.push({ role: 'sys', text: '規則式示範沒有回應（逾時／斷網）。你的回答都還在，可以重試，或略過 AI 直接修訂。', html: '<div class="btn-row"><button class="btn ghost" type="button" data-retry>重試</button><button class="btn ghost" type="button" data-skip>略過 AI 繼續</button></div>' });
        renderDlg(); updateAIButton(); return;
      }
      S('Q4', 'ai_status', 'ok', 'ACT01');
      var issue, text;
      if (aiState.handoff) {
        text = '這個地方已請老師接手；你的初稿與提示歷程都保留了。你可以先回到模型觀察，再自行修訂。'; issue = aiState.lastIssue;
      } else {
        issue = analyze();
        aiState.streak = (issue === aiState.lastIssue) ? aiState.streak + 1 : 1; aiState.lastIssue = issue;
        if (aiState.streak >= 3 && issue !== 'refine') {
          aiState.handoff = true;
          text = '同一個地方我們已經用兩層提示討論過了，這題我先請老師接手；你的初稿、對話與提示歷程都已保留。你仍可繼續修訂。';
        } else {
          var lv = Math.min(aiState.streak, 2), arr = AI_TXT[issue]; text = arr[lv - 1] || arr[arr.length - 1];
          if (!ops.some(function (o) { return /tab:model/.test(o.ev); }) && !G('Q4', 'ops_log')) text += ' 你還沒有打開次波模型，可以先到左側「模型」比較 B、D。';
        }
      }
      aiState.asked++;
      dlg.push({ role: 'ai', text: text, ts: new Date().toISOString(), issue: issue, layer: Math.min(aiState.streak, 3) });
      saveAI(); renderDlg(); updateAIButton(); updateStepper(); renderHandoff();
    }, 650);
  }
  function renderHandoff() { $('#handoff').hidden = !aiState.handoff; }
  function skipAI() {
    aiState.skipped = true; aiState.asked = aiState.asked; S('Q4', 'ai_skipped', new Date().toISOString(), 'ACT01');
    dlg = dlg.filter(function (m) { return !m.html && !m.tmp; });
    dlg.push({ role: 'sys', text: '已略過 AI，直接進入修訂。AI 不是完成活動的必要條件。', ts: new Date().toISOString() });
    $('#ai-body').hidden = true; $('#ai-toggle').textContent = '展開 +';
    saveAI(); renderDlg(); updateAIButton(); updateStepper();
    var t = $('#card-q4r'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderRevCompare() {
    var box = $('#cmpQ4'); if (!box) return;
    var locked = isLocked('q4d');
    var snap; try { snap = JSON.parse(G('Q4', 'draft_snapshot') || 'null'); } catch (e) { snap = null; }
    var B = [G('Q4', 'd_B_phase'), G('Q4', 'd_B_int'), G('Q4', 'd_B_inten')], D = [G('Q4', 'd_D_phase'), G('Q4', 'd_D_int'), G('Q4', 'd_D_inten')];
    box.innerHTML = '<div class="orig"><h4>原初稿（預測，已鎖定）</h4>' + (locked ?
      '<table class="tbl"><tr><th>點</th><th>相位</th><th>疊加</th><th>光強</th></tr><tr><td>B</td><td>' + esc(B[0]) + '</td><td>' + esc(B[1]) + '</td><td>' + esc(B[2]) + '</td></tr><tr><td>D</td><td>' + esc(D[0]) + '</td><td>' + esc(D[1]) + '</td><td>' + esc(D[2]) + '</td></tr></table><p class="small cmpq">解釋：' + esc(G('Q4', 'd_explain') || '') + '</p>' :
      '<p class="muted small">初稿尚未送出鎖定。請先在②完成並送出（或按「請 AI 追問」自動送出）。</p>') + '</div>' +
      '<div><h4>我的觀察記錄（來自模型）</h4><p class="small cmpq">B：波峰' + esc(G('Q4', 'o_B_peak') || '—') + '；合成振幅' + esc(G('Q4', 'o_B_amp') || '—') + '\nD：波峰' + esc(G('Q4', 'o_D_peak') || '—') + '；合成振幅' + esc(G('Q4', 'o_D_amp') || '—') + '</p><p class="small muted">修訂時請用這些觀察當證據。</p></div>';
  }
  function fillRevFromDraft() {
    var map = { d_B_phase: 'r_B_phase', d_B_int: 'r_B_int', d_B_inten: 'r_B_inten', d_D_phase: 'r_D_phase', d_D_int: 'r_D_int', d_D_inten: 'r_D_inten' };
    Object.keys(map).forEach(function (k) {
      var v = G('Q4', k); if (!v) return;
      var el = $$('input[name="' + map[k] + '"]').filter(function (e) { return e.value === v; })[0];
      if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    var t = $('#r_explain'); t.value = $('#d_explain').value; t.dispatchEvent(new Event('input', { bubbles: true }));
    window.IOD.toast('已把初稿帶入修訂欄，請依觀察修改');
  }
  function initQ4() {
    if (!$('#act01')) return;
    var raw = G('Q4', 'ops_log'); try { ops = raw ? JSON.parse(raw) : []; } catch (e) { ops = []; }
    try { var st = JSON.parse(G('Q4', 'ai_state') || 'null'); if (st) aiState = st; } catch (e) {}
    try { dlg = JSON.parse(G('Q4', 'ai_dialog') || '[]'); } catch (e) { dlg = []; }
    // tabs
    var tabs = $$('#act-tabs button');
    function showTab(id, log) {
      tabs.forEach(function (b) { var on = b.getAttribute('data-tab') === id; b.setAttribute('aria-selected', on); });
      $$('.tabpanel', $('#pane-left')).forEach(function (p) { p.hidden = (p.id !== 'tp-' + id); });
      if (log) op('tab:' + id);
      if (id === 'model') m02.redraw();
    }
    tabs.forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab'), true); }); });
    showTab('text', false);
    // events
    $('#card-q4d').addEventListener('input', function () { updateAIButton(); updateStepper(); renderRevCompare(); });
    $('#card-q4d').addEventListener('change', function () { updateAIButton(); updateStepper(); renderRevCompare(); });
    $('#card-obs').addEventListener('change', function () { updateStepper(); renderRevCompare(); });
    $('#card-q4r').addEventListener('input', updateStepper);
    $('#card-q4r').addEventListener('change', updateStepper);
    document.addEventListener('poe:locked', function (e) { if (e.detail === 'q4d') { renderRevCompare(); updateStepper(); updateAIButton(); m02.redraw(); } });
    $('#ai-ask').addEventListener('click', askAI);
    $('#ai-skip').addEventListener('click', skipAI);
    $('#ai-toggle').addEventListener('click', function () { var b = $('#ai-body'); b.hidden = !b.hidden; this.textContent = b.hidden ? '展開 +' : '收合 –'; });
    $('#fill-rev').addEventListener('click', fillRevFromDraft);
    $('#btn-done').addEventListener('click', function () {
      if (!draftComplete()) return;
      if (!isLocked('q4d')) lock('q4d');
      S('Q4', 'activity_done', new Date().toISOString(), 'ACT01');
      $('#done-msg').textContent = '已完成並保存（' + hhmm(new Date().toISOString()) + '）。可下載 CSV／JSON；之後仍可回來修訂。';
      window.IOD.toast('ACT01 已完成並保存');
    });
    if (G('Q4', 'activity_done')) $('#done-msg').textContent = '上次已完成（' + hhmm(G('Q4', 'activity_done')) + '）。重新整理不會遺失作答。';
    if (aiState.skipped) { $('#ai-body').hidden = true; $('#ai-toggle').textContent = '展開 +'; }
    renderDlg(); renderHandoff(); updateAIButton(); updateStepper(); renderRevCompare();
    var any = $$('.act-grid [name]').some(function (e) { var v = G('Q4', e.name); return v; });
    if (any) $('#resume-note').hidden = false;
    // 放大／關閉
    $$('[data-zoom-m01]').forEach(function (b) {
      b.addEventListener('click', function () { zoomHTML(fringeSVG() + '<p class="small muted">站內自繪示意，非原始照片；按 Esc 或「關閉」返回。</p>'); op('photo_zoom'); });
    });
  }

  /* ================= M02 次波模型（canvas） ================= */
  var m02 = { redraw: function () {} };
  function initM02() {
    var cv = $('#m02'), tc = $('#m02t'); if (!cv) return;
    var W = 520, H = 340, c = setupCanvas(cv, W, H), c2 = setupCanvas(tc, W, 150);
    var s1 = { x: 70, y: 125 }, s2 = { x: 70, y: 215 }, sx = 420, yc = 170, lam = 24, T = 1.6;
    function dist(a, y) { return Math.hypot(sx - a.x, y - a.y); }
    function delta(y) { return Math.abs(dist(s1, y) - dist(s2, y)); }
    function solve(target, lo, hi) { var i, m; for (i = 0; i < 40; i++) { m = (lo + hi) / 2; if ((delta(m) < target) === (delta(lo) < delta(hi))) lo = m; else hi = m; } return (lo + hi) / 2; }
    var yB = solve(lam, yc, 5), yD = solve(lam / 2, yc, 330);
    var pts = { B: yB, D: yD }, sel = 'B', t = 0, playing = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches), last = 0;
    function draw() {
      c.clearRect(0, 0, W, H); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#222'; c.fillRect(66, 0, 8, 112); c.fillRect(66, 138, 8, 64); c.fillRect(66, 228, 8, 112);
      c.fillRect(sx, 0, 6, H);
      var ph = ((t / T) % 1) * lam;
      [[s1, '31,95,168'], [s2, '224,122,31']].forEach(function (p) {
        for (var r = ph; r < 380; r += lam) {
          c.strokeStyle = 'rgba(' + p[1] + ',' + Math.max(0.15, 1 - r / 420) + ')'; c.lineWidth = 1.6;
          c.beginPath(); c.arc(p[0].x + 4, p[0].y, r, -Math.PI / 2, Math.PI / 2); c.stroke();
        }
      });
      c.fillStyle = '#1f5fa8'; c.beginPath(); c.arc(s1.x + 4, s1.y, 4, 0, 7); c.fill();
      c.fillStyle = '#e07a1f'; c.beginPath(); c.arc(s2.x + 4, s2.y, 4, 0, 7); c.fill();
      c.fillStyle = '#222'; c.font = '14px sans-serif'; c.fillText('S₁', 38, s1.y + 4); c.fillText('S₂', 38, s2.y + 4);
      c.fillText('雙狹縫', 30, 16); c.fillText('螢幕', sx - 40, 16);
      var y = pts[sel];
      c.lineWidth = 2; c.strokeStyle = '#1f5fa8'; c.beginPath(); c.moveTo(s1.x + 4, s1.y); c.lineTo(sx, y); c.stroke();
      c.strokeStyle = '#e07a1f'; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(s2.x + 4, s2.y); c.lineTo(sx, y); c.stroke(); c.setLineDash([]);
      ['B', 'D'].forEach(function (k) {
        c.fillStyle = (k === sel) ? '#c0392b' : '#222'; c.beginPath(); c.arc(sx + 3, pts[k], k === sel ? 7 : 5, 0, 7); c.fill();
        c.font = 'bold 16px sans-serif'; c.fillText(k, sx + 14, pts[k] + 5);
      });
      c.fillStyle = '#666'; c.font = '12px sans-serif'; c.fillText('模型示意・非實拍・未依比例（圓弧是模型波前）', 10, H - 8);
      // trace
      var r1 = dist(s1, y), r2 = dist(s2, y);
      c2.clearRect(0, 0, W, 150); c2.fillStyle = '#fff'; c2.fillRect(0, 0, W, 150);
      c2.strokeStyle = '#ccd'; c2.beginPath(); c2.moveTo(0, 75); c2.lineTo(W, 75); c2.stroke();
      function curve(f, col, lw) { c2.strokeStyle = col; c2.lineWidth = lw; c2.beginPath(); for (var x = 0; x <= W; x += 3) { var phi = x / W * 4 * Math.PI, yy = 75 - 28 * f(phi); x ? c2.lineTo(x, yy) : c2.moveTo(x, yy); } c2.stroke(); }
      var k = 2 * Math.PI / lam;
      curve(function (p) { return Math.cos(p - k * r1); }, '#1f5fa8', 1.4);
      curve(function (p) { return Math.cos(p - k * r2); }, '#e07a1f', 1.4);
      curve(function (p) { return Math.cos(p - k * r1) + Math.cos(p - k * r2); }, '#111', 2.6);
      var cur = ((t / T) % 2) * 2 * Math.PI, cx = cur / (4 * Math.PI) * W;
      c2.strokeStyle = '#c0392b'; c2.lineWidth = 1; c2.beginPath(); c2.moveTo(cx, 5); c2.lineTo(cx, 145); c2.stroke();
      c2.fillStyle = '#1f5fa8'; c2.beginPath(); c2.arc(cx, 75 - 28 * Math.cos(cur - k * r1), 4, 0, 7); c2.fill();
      c2.fillStyle = '#e07a1f'; c2.beginPath(); c2.arc(cx, 75 - 28 * Math.cos(cur - k * r2), 4, 0, 7); c2.fill();
      c2.fillStyle = '#111'; c2.beginPath(); c2.arc(cx, 75 - 28 * (Math.cos(cur - k * r1) + Math.cos(cur - k * r2)), 5, 0, 7); c2.fill();
      c2.font = '12px sans-serif'; c2.fillStyle = '#1f5fa8'; c2.fillText('藍：S₁ 來的波', 6, 14); c2.fillStyle = '#e07a1f'; c2.fillText('橘：S₂ 來的波', 100, 14); c2.fillStyle = '#111'; c2.fillText('黑粗線：兩波相加（合成）', 200, 14);
      $('#m02-read').textContent = '所選位置 ' + sel + '：S₁ 路徑 ' + (r1 / lam).toFixed(2) + ' λ，S₂ 路徑 ' + (r2 / lam).toFixed(2) + ' λ，路徑差 ' + (Math.abs(r1 - r2) / lam).toFixed(2) + ' λ';
    }
    function frame(ts) {
      if (!playing) return; if (!last) last = ts; t += Math.min(0.05, (ts - last) / 1000); last = ts; draw(); requestAnimationFrame(frame);
    }
    function setPlay(p) { playing = p; last = 0; if (p) requestAnimationFrame(frame); else draw(); $('#m02-play').setAttribute('aria-pressed', p); $('#m02-pause').setAttribute('aria-pressed', !p); }
    $('#m02-play').addEventListener('click', function () { if (!playing) { setPlay(true); op('play'); } });
    $('#m02-pause').addEventListener('click', function () { if (playing) { setPlay(false); op('pause'); } });
    $('#m02-reset').addEventListener('click', function () { t = 0; setPlay(false); op('reset'); });
    ['B', 'D'].forEach(function (k) {
      $('#m02-' + k).addEventListener('click', function () {
        sel = k; ['B', 'D'].forEach(function (j) { $('#m02-' + j).setAttribute('aria-pressed', j === k); }); draw(); op('select_' + k);
      });
    });
    m02.redraw = draw; setPlay(playing);
    $('#m02-pause').setAttribute('aria-pressed', !playing);
  }

  /* ================= 活動三：預測／觀察／比較 ================= */
  var SP_LABEL = { d: '縫距 d 變大', lam: '波長 λ 變長', L: '屏距 L 變大' };
  var SP_TRUE = { d: '變小（變密）', lam: '變大（變疏）', L: '變大（變疏）' };
  function renderCmpC() {
    var box = $('#cmpC'); if (!box) return;
    var rows = ['d', 'lam', 'L'].map(function (k) {
      var p = G('SIM', 'sp_' + k), o = G('SIM', 'so_' + k), m = (p && o) ? (p === o ? '相符' : '不同：請回到模擬再操作確認') : '—';
      if (o && o !== SP_TRUE[k]) m = (p && p === o ? '相符，但' : '') + '你記錄的「' + o + '」與模擬顯示的 Δy 變化不一致：請回到模擬，一次只動一個滑桿，看相鄰亮紋間距與 Δy 數字再改寫觀察';
      return '<tr><td>' + SP_LABEL[k] + '</td><td>' + esc(p || '—') + '</td><td>' + esc(o || '—') + '</td><td>' + m + '</td></tr>';
    }).join('');
    box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><tr><th>改變的參數</th><th>原預測（鎖定）</th><th>我的觀察</th><th>對照</th></tr>' + rows + '</table></div>';
  }
  function initSim() {
    var cv = $('#simScreen'); if (!cv) return;
    var W = 520, c = setupCanvas(cv, W, 150), pv = $('#simPlot'), c2 = setupCanvas(pv, W, 130);
    var sd = $('#sd'), sl = $('#sl'), sL = $('#sL'), mode = 'mono', range = 10, sops = [];
    function rgb(w) {
      var r = 0, g = 0, b = 0, f;
      if (w >= 380 && w < 440) { r = -(w - 440) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = -(w - 510) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = -(w - 645) / 65; } else if (w <= 780) { r = 1; }
      f = w < 420 ? 0.3 + 0.7 * (w - 380) / 40 : (w > 700 ? 0.3 + 0.7 * (780 - w) / 80 : 1);
      return [r * f, g * f, b * f];
    }
    function inten(w, d, L, y) { var p = Math.PI * d * y * 1000 / (w * L); return Math.pow(Math.cos(p), 2); }
    function draw() {
      var d = +sd.value, lam = +sl.value, L = +sL.value, dy = lam * L / d * 1e-3, x, y, i;
      $('#v-d').textContent = d.toFixed(2); $('#v-l').textContent = lam; $('#v-L').textContent = L.toFixed(1);
      $('#v-dy').textContent = dy.toFixed(2); $('#v-n').textContent = Math.round(2 * range / dy);
      c.fillStyle = '#000'; c.fillRect(0, 0, W, 150);
      var img = c.createImageData(W, 100), ws = [];
      if (mode === 'white') for (i = 400; i <= 700; i += 10) ws.push(i); else ws.push(lam);
      var norm = ws.reduce(function (a, w) { var q = rgb(w); return [a[0] + q[0], a[1] + q[1], a[2] + q[2]]; }, [0, 0, 0]);
      for (x = 0; x < W; x++) {
        y = (x / W - 0.5) * 2 * range; var R = 0, Gc = 0, B = 0;
        ws.forEach(function (w) { var q = rgb(w), I = inten(w, d, L, y); R += q[0] * I; Gc += q[1] * I; B += q[2] * I; });
        var k = mode === 'white' ? 1 : 1, cr = mode === 'white' ? R / norm[0] : R, cg = mode === 'white' ? Gc / norm[1] : Gc, cb = mode === 'white' ? B / norm[2] : B;
        for (var j = 0; j < 100; j++) { var o = (j * W + x) * 4; img.data[o] = Math.min(255, 255 * cr * k); img.data[o + 1] = Math.min(255, 255 * cg * k); img.data[o + 2] = Math.min(255, 255 * cb * k); img.data[o + 3] = 255; }
      }
      // putImageData ignores transform; draw via temp canvas
      var tmp = document.createElement('canvas'); tmp.width = W; tmp.height = 100; tmp.getContext('2d').putImageData(img, 0, 0);
      c.drawImage(tmp, 0, 8, W, 100);
      var x0 = W / 2, x1 = W / 2 + dy / (2 * range) * W;
      c.strokeStyle = '#ffd24a'; c.fillStyle = '#ffd24a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x0, 118); c.lineTo(Math.min(x1, W - 2), 118); c.stroke();
      c.beginPath(); c.moveTo(x0, 112); c.lineTo(x0, 124); c.moveTo(Math.min(x1, W - 2), 112); c.lineTo(Math.min(x1, W - 2), 124); c.stroke();
      c.font = '12px sans-serif'; c.fillText('Δy = ' + dy.toFixed(2) + ' mm（相鄰亮紋間距）', 10, 142);
      c.fillStyle = '#aaa'; c.fillText('屏幕 ±' + range + ' mm', W - 100, 142);
      // plot
      c2.fillStyle = '#fff'; c2.fillRect(0, 0, W, 130); c2.strokeStyle = '#ccd'; c2.strokeRect(0.5, 0.5, W - 1, 129);
      c2.strokeStyle = '#1f5fa8'; c2.lineWidth = 2; c2.beginPath();
      for (x = 0; x < W; x += 2) { y = (x / W - 0.5) * 2 * range; var yy = 120 - 100 * inten(mode === 'white' ? 550 : lam, d, L, y); x ? c2.lineTo(x, yy) : c2.moveTo(x, yy); }
      c2.stroke(); c2.fillStyle = '#555'; c2.font = '12px sans-serif'; c2.fillText('相對光強（理想雙縫，忽略單縫包絡）' + (mode === 'white' ? '；白光以 550 nm 為代表' : ''), 8, 14);
    }
    [sd, sl, sL].forEach(function (el) {
      el.addEventListener('input', draw);
      el.addEventListener('change', function () { sops.push({ t: new Date().toISOString(), ev: 'set', d: +sd.value, lam: +sl.value, L: +sL.value, mode: mode }); logOps('SIM', sops, 'S2-04'); });
    });
    $$('#simmode button').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-m'); $$('#simmode button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); draw();
        sops.push({ t: new Date().toISOString(), ev: 'mode:' + mode }); logOps('SIM', sops, 'S2-04');
      });
    });
    $('#sim-reset').addEventListener('click', function () { sd.value = 0.5; sl.value = 633; sL.value = 1.5; draw(); });
    document.addEventListener('poe:locked', function (e) { if (e.detail === 'sp') draw(); });
    draw();
    ['card-so'].forEach(function (id) { var e = document.getElementById(id); if (e) e.addEventListener('change', renderCmpC); });
    $('#card-sp').addEventListener('change', renderCmpC);
    document.addEventListener('poe:locked', renderCmpC);
    renderCmpC();
  }

  /* ================= 素材庫與 M01 ================= */
  function initGallery() {
    var g = $('#gal'); if (!g) return;
    g.innerHTML = GAL.map(function (it) {
      var extra = '';
      if (it.extra === 'sub') extra = '<div class="small" id="sub-quiz"><p>把下列三項歸類（選擇後立即回饋）：</p>' +
        ['屏幕上的亮暗條紋（實拍）|證據', '兩縫發出的圓弧波前|模型', '標記「B 亮、D 暗」的位置|模型'].map(function (r, i) {
          var p = r.split('|');
          return '<div>' + esc(p[0]) + ' <select class="sel" data-ans="' + p[1] + '" data-i="' + i + '" aria-label="歸類 ' + esc(p[0]) + '"><option value="">選擇</option><option>證據</option><option>模型</option></select> <span class="mini-fb" id="fb' + i + '"></span></div>';
        }).join('') + '</div>';
      return '<figure class="asset"><div' + (it.zoom ? ' data-m01-host' : '') + '>' + it.svg() + '</div><figcaption><strong>' + esc(it.t) + '</strong><span class="asset-tag">' + it.tag + '</span><br>' + it.c + '<br><span class="muted">原檔名：' + esc(it.f) + '</span>' + (it.zoom ? '<br><button class="btn ghost" type="button" data-zoom-m01>放大</button>' : '') + extra + '</figcaption></figure>';
    }).join('');
    $$('#sub-quiz select').forEach(function (s) {
      s.addEventListener('change', function () {
        var fb = $('#fb' + s.getAttribute('data-i'));
        if (!s.value) { fb.textContent = ''; return; }
        var ok = s.value === s.getAttribute('data-ans');
        fb.innerHTML = ok ? '正確' : '再想想：這個畫面是實際紀錄，還是用來解釋的模型？ <a class="mlink" href="misconceptions.html#m4">迷思M4</a>'; fb.className = 'mini-fb ' + (ok ? 'ok' : 'no');
        S('GAL', 'sub_' + s.getAttribute('data-i'), s.value, MIS_ACT.GAL);
        var bad = $$('#sub-quiz select').some(function (x) { return x.value && x.value !== x.getAttribute('data-ans'); });
        setMis('GAL', bad ? ['M4'] : []);
      });
    });
  }
  function initM01() {
    $$('[data-m01]').forEach(function (h) { h.innerHTML = fringeSVG(); });
    $$('[data-t01]').forEach(function (h) { h.innerHTML = setup('plain'); });
    $$('[data-huy]').forEach(function (h) { h.innerHTML = huy(); });
    $$('[data-setup-predict]').forEach(function (h) { h.innerHTML = setup('predict'); });
    $$('[data-bd]').forEach(function (h) { h.innerHTML = bdModel(); });
    var zc = $('#zclose'); if (zc) zc.addEventListener('click', closeZoom);
    $$('[data-zoom-m01]').forEach(function (b) {
      if (b.__z) return; b.__z = 1;
      if ($('#act01') && $('#act01').contains(b)) return; // ACT01 內另綁
      b.addEventListener('click', function () { zoomHTML(fringeSVG() + '<p class="small muted">站內自繪示意，非原始照片；按 Esc 或「關閉」返回。</p>'); });
    });
  }

  /* ================= 活動一對照更新 ================= */
  function initCmpA() {
    ['card-q1', 'card-q2', 'card-q3a', 'card-q3b'].forEach(function (id) {
      var e = document.getElementById(id); if (e) { e.addEventListener('input', renderCmpA); e.addEventListener('change', renderCmpA); }
    });
    document.addEventListener('poe:locked', renderCmpA);
    renderCmpA();
  }

  /* 從迷思速查回連：錨點在摺疊的 details 內時自動展開 */
  function initHash() {
    function go() {
      var id = decodeURIComponent((location.hash || '').slice(1)), el = id && document.getElementById(id); if (!el) return;
      var d = el.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
      if (el.scrollIntoView) setTimeout(function () { el.scrollIntoView(); }, 50);
    }
    window.addEventListener('hashchange', go); go();
  }
  function init() {
    if (!window.IOD) { return; }
    initGallery(); initM01(); initCells(); initLocks(); initLadders(); initCmpA(); initM02(); initQ4(); initSim(); bindMis(); initHash();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeZoom(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
