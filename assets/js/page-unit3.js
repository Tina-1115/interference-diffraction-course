/* unit3 專屬腳本：POE 鎖定機制、單狹縫/雙縫模擬、薄膜干涉模擬、機制分類、隨堂測驗。無外部相依。 */
(function () {
  'use strict';
  var PAGE = 'unit3';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function save(qid, field, val, act) { try { if (window.IOD) IOD.saveAnswer(PAGE, qid, field, String(val), act || ''); } catch (e) {} }
  function get(qid, field) { try { return window.IOD ? IOD.getAnswer(PAGE, qid, field) : null; } catch (e) { return null; } }
  function toast(m) { try { IOD.toast(m); } catch (e) {} }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- 波長 → RGB（示意用） ---------- */
  function wl2rgb(w) {
    var r = 0, g = 0, b = 0, f;
    if (w >= 380 && w < 440) { r = -(w - 440) / 60; b = 1; }
    else if (w < 490) { g = (w - 440) / 50; b = 1; }
    else if (w < 510) { g = 1; b = -(w - 510) / 20; }
    else if (w < 580) { r = (w - 510) / 70; g = 1; }
    else if (w < 645) { r = 1; g = -(w - 645) / 65; }
    else if (w <= 780) { r = 1; }
    f = w < 420 ? 0.3 + 0.7 * (w - 380) / 40 : (w > 700 ? 0.3 + 0.7 * (780 - w) / 80 : 1);
    return [r * f, g * f, b * f];
  }
  function css(c, k) { k = k == null ? 1 : k; return 'rgb(' + Math.round(clamp(c[0] * k, 0, 1) * 255) + ',' + Math.round(clamp(c[1] * k, 0, 1) * 255) + ',' + Math.round(clamp(c[2] * k, 0, 1) * 255) + ')'; }

  /* ---------- POE：預測(鎖定) → 觀察 → 解釋 → 修正 ---------- */
  function filled(card, el) {
    if (el.type === 'radio') return !!card.querySelector('input[type=radio][name="' + el.name + '"]:checked');
    return String(el.value || '').trim() !== '';
  }
  function initPOE() {
    $$('.poe').forEach(function (card) {
      var qid = card.getAttribute('data-qid'), act = card.getAttribute('data-act') || '';
      var s1 = $('[data-step="1"]', card), f2 = $('fieldset[data-step="2"]', card), f3 = $('fieldset[data-step="3"]', card), f4 = $('fieldset[data-step="4"]', card);
      var btn = $('[data-lock]', card), msg = $('.lock-msg', card);
      var chips = $$('.poe-steps span', card);
      var predEls = $$('input,textarea,select', s1);
      var obs = f2 && $('[name="obs"]', f2), expl = f3 && $('[name="expl"]', f3);
      function chip(n) { chips.forEach(function (c, i) { c.classList.toggle('on', i < n); c.classList.toggle('cur', i === n - 1); }); }
      function ready() { var reqs = $$('[data-req]', s1); return reqs.length ? reqs.every(function (e) { return filled(card, e); }) : predEls.some(function (e) { return filled(card, e); }); }
      function refresh() {
        var locked = get(qid, 'pred_locked') === '1';
        if (btn) btn.disabled = locked || !ready();
        if (btn && locked) btn.textContent = '預測已鎖定';
        predEls.forEach(function (e) { e.disabled = locked; });
        card.classList.toggle('poe-locked', locked);
        if (f2) f2.disabled = !locked;
        if (f3) f3.disabled = !(locked && obs && String(obs.value).trim());
        if (f4) f4.disabled = !(locked && expl && String(expl.value).trim());
        if (msg) msg.hidden = locked;
        misFb.forEach(function (m) { m.hidden = !(locked && checkedMis() && checkedMis() === m.getAttribute('data-mis')); });
        var n = !locked ? 1 : (f3 && f3.disabled ? 2 : (f4 && f4.disabled ? 3 : 4)); chip(n);
        card.dispatchEvent(new CustomEvent('poe-state', { detail: { locked: locked } }));
      }
      predEls.forEach(function (e) { e.addEventListener('change', refresh); e.addEventListener('input', refresh); });
      /* 迷思串接：預測選項帶 data-mis 時，改選即寫入 mis 欄（選到迷思選項為 M 編號，改選別項為空字串） */
      var misRadios = $$('input[type=radio][data-mis]', s1);
      function checkedMis() { var c = $('input[type=radio]:checked', s1); return c ? (c.getAttribute('data-mis') || '') : ''; }
      if (misRadios.length) $$('input[type=radio]', s1).forEach(function (r) { r.addEventListener('change', function () { save(qid, 'mis', checkedMis(), act); }); });
      var misFb = $$('.mis-fb', card);
      if (obs) obs.addEventListener('input', refresh);
      if (expl) expl.addEventListener('input', refresh);
      if (btn) btn.addEventListener('click', function () {
        if (!ready()) return;
        save(qid, 'pred_locked', '1', act);
        toast('預測已送出並鎖定，現在可以進行觀察');
        refresh();
        if (f2) f2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      card.__refresh = refresh; refresh();
    });
  }
  function isLocked(qid) { return get(qid, 'pred_locked') === '1'; }

  /* ---------- 單狹縫 / 雙縫模擬 ---------- */
  function sinc2(x) { if (Math.abs(x) < 1e-6) return 1; var s = Math.sin(x) / x; return s * s; }
  function initSlit() {
    var cv = $('#slitCanvas'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    var el = { a: $('#sl-a'), lam: $('#sl-l'), d: $('#sl-d'), enh: $('#sl-enh'), line: $('#sl-line'), env: $('#sl-env') };
    var out = { a: $('#o-a'), lam: $('#o-l'), d: $('#o-d'), w: $('#r-w'), sp: $('#r-sp') };
    var X0 = 50, X1 = 780, HALF = 40, L = 1.0; // 屏幕視窗 ±40 mm，示意距離 1.0 m
    var ppm = (X1 - X0) / (2 * HALF);
    function mode() { var r = $('input[name="slmode"]:checked'); return r ? r.value : 'single'; }
    function draw() {
      var a = +el.a.value, lam = +el.lam.value, d = +el.d.value, dbl = mode() === 'double';
      if (dbl && d < 1.5 * a) { d = Math.round(1.5 * a / 10) * 10; el.d.value = d; }
      out.a.textContent = a + ' µm'; out.lam.textContent = lam + ' nm'; out.d.textContent = d + ' µm';
      $('#row-d').style.display = dbl ? '' : 'none'; $('#row-env').style.display = dbl ? '' : 'none';
      var col = wl2rgb(lam);
      ctx.fillStyle = '#0b0f18'; ctx.fillRect(0, 0, W, H);
      var yb = 235, ht = 200;
      // 座標軸
      ctx.strokeStyle = '#3a4560'; ctx.lineWidth = 1; ctx.fillStyle = '#9fb0cc'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      for (var m = -40; m <= 40; m += 10) { var x = X0 + (m + HALF) * ppm; ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, 345); ctx.stroke(); ctx.fillText(m + ' mm', x, 366); }
      ctx.textAlign = 'left'; ctx.fillText('相對光強', 4, 14); ctx.fillText('1.0', 20, 28); ctx.fillText('0', 36, yb + 4);
      ctx.beginPath(); ctx.moveTo(X0, yb); ctx.lineTo(X1, yb); ctx.stroke();
      // 強度
      var I = new Array(X1 - X0 + 1), Ienv = new Array(X1 - X0 + 1), i, y, beta, delta;
      for (i = 0; i <= X1 - X0; i++) {
        y = ((i / ppm) - HALF) * 1e-3;
        beta = Math.PI * (a * 1e-6) * y / (lam * 1e-9 * L);
        var env = sinc2(beta);
        Ienv[i] = env;
        if (dbl) { delta = Math.PI * (d * 1e-6) * y / (lam * 1e-9 * L); I[i] = env * Math.cos(delta) * Math.cos(delta); } else I[i] = env;
      }
      // 曲線
      ctx.beginPath(); ctx.moveTo(X0, yb);
      for (i = 0; i <= X1 - X0; i++) ctx.lineTo(X0 + i, yb - I[i] * ht);
      ctx.lineTo(X1, yb); ctx.closePath(); ctx.fillStyle = css(col, 0.35); ctx.fill();
      ctx.beginPath(); for (i = 0; i <= X1 - X0; i++) { var yy = yb - I[i] * ht; if (i) ctx.lineTo(X0 + i, yy); else ctx.moveTo(X0 + i, yy); }
      ctx.strokeStyle = css(col, 1); ctx.lineWidth = 2; ctx.stroke();
      if (dbl && el.env.checked) {
        ctx.setLineDash([6, 4]); ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (i = 0; i <= X1 - X0; i++) { var ye = yb - Ienv[i] * ht; if (i) ctx.lineTo(X0 + i, ye); else ctx.moveTo(X0 + i, ye); }
        ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ffd36b'; ctx.textAlign = 'left'; ctx.fillText('虛線 = 單狹縫繞射包絡（由縫寬 a 決定）', X0 + 8, 40);
      }
      // 屏幕條紋影像
      var enh = el.enh.checked;
      for (i = 0; i <= X1 - X0; i++) { var k = enh ? Math.pow(I[i], 0.4) : I[i]; ctx.fillStyle = css(col, k); ctx.fillRect(X0 + i, 262, 1, 70); }
      ctx.strokeStyle = '#3a4560'; ctx.strokeRect(X0, 262, X1 - X0, 70);
      ctx.fillStyle = '#9fb0cc'; ctx.textAlign = 'left'; ctx.fillText('屏幕上看到的樣子' + (enh ? '（旁側亮紋已增強亮度，曲線為真實相對強度）' : '（未增強：旁側亮紋很暗）'), X0 + 4, 256);
      if (el.line.checked) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
        var cx = X0 + HALF * ppm, offs = dbl ? [-d / 2000, d / 2000] : [0];
        offs.forEach(function (o) { var xx = cx + o * ppm; ctx.beginPath(); ctx.moveTo(xx, 262); ctx.lineTo(xx, 332); ctx.stroke(); });
        ctx.setLineDash([]); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText('↑ 直進模型的預測：' + (dbl ? '兩條細亮線' : '與縫同寬的一條細亮線') + '（約 ' + (a / 1000).toFixed(2) + ' mm 寬）', cx, 348);
      }
      out.w.textContent = (2 * lam * 1e-9 * L / (a * 1e-6) * 1e3).toFixed(1) + ' mm';
      out.sp.textContent = dbl ? (lam * 1e-9 * L / (d * 1e-6) * 1e3).toFixed(2) + ' mm' : '（雙縫模式才有）';
    }
    ['a', 'lam', 'd'].forEach(function (k) {
      el[k].addEventListener('input', draw);
      el[k].addEventListener('change', function () { try { IOD.logEvent(PAGE, 'P1', 'sim_' + k, el[k].value + '@' + new Date().toISOString(), 'SIM-SLIT'); } catch (e) {} });
    });
    ['enh', 'line', 'env'].forEach(function (k) { el[k].addEventListener('change', draw); });
    $$('input[name="slmode"]').forEach(function (r) { r.addEventListener('change', function () { draw(); save('P1', 'sim_mode', mode(), 'SIM-SLIT'); }); });
    // 預設：最近一次操作
    var sv = get('P1', 'sim_a'); if (sv) el.a.value = String(sv).split('@')[0];
    draw();
    // 記錄「讀值」按鈕
    var rec = $('#sl-rec');
    if (rec) rec.addEventListener('click', function () {
      var a = el.a.value, w = out.w.textContent;
      var t = $('#P1-obs'); var line = '縫寬 ' + a + ' µm、波長 ' + el.lam.value + ' nm（' + (mode() === 'double' ? '雙縫' : '單縫') + '）：中央亮紋全寬約 ' + w + '。';
      t.value = (t.value ? t.value + '\n' : '') + line; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true }));
      toast('已把這筆讀值貼到「觀察紀錄」');
    });
    var reset = $('#sl-reset'); if (reset) reset.addEventListener('click', function () { el.a.value = 100; el.lam.value = 633; el.d.value = 300; $('input[name="slmode"][value="single"]').checked = true; draw(); });
    var card = $('[data-qid="P1"]'); if (card) card.addEventListener('poe-state', function (e) { $('#slitWrap').classList.toggle('sim-off', !e.detail.locked); });
  }

  /* ---------- 薄膜干涉模擬 ---------- */
  function initFilm() {
    var cv = $('#filmCanvas'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, N = 1.33;
    var cs = $('#fm-strip'), cx2 = cs.getContext('2d');
    var t = $('#fm-t'), l = $('#fm-l'), o = { t: $('#o-t'), l: $('#o-fl'), st: $('#fm-state'), ph: $('#fm-phase') };
    function white(tn) { // 白光下的反射顏色
      var s = [0, 0, 0], ws = [0, 0, 0], w, c, I;
      for (w = 400; w <= 700; w += 10) { c = wl2rgb(w); I = (1 - Math.cos(4 * Math.PI * N * tn / w)) / 2; for (var j = 0; j < 3; j++) { s[j] += I * c[j]; ws[j] += c[j]; } }
      return [s[0] / ws[0] * 1.7, s[1] / ws[1] * 1.7, s[2] / ws[2] * 1.7];
    }
    function drawStrip(tn) {
      var w = cs.width, h = cs.height, x;
      for (x = 0; x < w; x++) { cx2.fillStyle = css(white(x / (w - 1) * 800), 1); cx2.fillRect(x, 0, 1, h - 18); }
      cx2.fillStyle = '#10131c'; cx2.fillRect(0, h - 18, w, 18);
      cx2.fillStyle = '#9fb0cc'; cx2.font = '12px sans-serif'; cx2.textAlign = 'left'; cx2.fillText('膜厚 0 nm（最薄）', 4, h - 5); cx2.textAlign = 'right'; cx2.fillText('800 nm', w - 4, h - 5);
      var mx = tn / 800 * (w - 1); cx2.strokeStyle = '#fff'; cx2.lineWidth = 2; cx2.beginPath(); cx2.moveTo(mx, 0); cx2.lineTo(mx, h - 18); cx2.stroke();
      cx2.fillStyle = '#fff'; cx2.beginPath(); cx2.moveTo(mx - 6, h - 18); cx2.lineTo(mx + 6, h - 18); cx2.lineTo(mx, h - 26); cx2.fill();
    }
    function arrow(x1, y1, x2, y2, col, wd) {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd || 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      var an = Math.atan2(y2 - y1, x2 - x1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 9 * Math.cos(an - .4), y2 - 9 * Math.sin(an - .4)); ctx.lineTo(x2 - 9 * Math.cos(an + .4), y2 - 9 * Math.sin(an + .4)); ctx.fill();
    }
    function draw() {
      var tn = +t.value, lam = +l.value; o.t.textContent = tn + ' nm'; o.l.textContent = lam + ' nm';
      var col = wl2rgb(lam), cc = css(col, 1);
      ctx.fillStyle = '#0b0f18'; ctx.fillRect(0, 0, W, H);
      // 左：剖面
      var th = 30 + tn / 800 * 70, y0 = 110, y1 = y0 + th, xa = 40, xb = 380;
      ctx.fillStyle = '#16203a'; ctx.fillRect(xa, 0, xb - xa, y0); ctx.fillStyle = '#3b5f93'; ctx.fillRect(xa, y0, xb - xa, th); ctx.fillStyle = '#16203a'; ctx.fillRect(xa, y1, xb - xa, 250 - y1);
      ctx.fillStyle = '#c9d6ee'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('空氣', xa + 6, y0 - 8); ctx.fillText('薄膜（n≈1.33，厚度為示意比例）', xa + 6, y0 + th / 2 + 4); ctx.fillText('空氣', xa + 6, 240);
      var xi = 130, xr1 = 190, xin = 160, xb2 = 190 + 12; // 入射點 xr1
      arrow(xi - 60, y0 - 90, xr1, y0 - 2, '#ffffff', 2.5);
      arrow(xr1, y0 - 2, xr1 + 70, y0 - 92, cc, 2.5); // 反射光1
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xr1, y0); ctx.lineTo(xr1 + 22, y1); ctx.stroke(); // 折射進入
      ctx.beginPath(); ctx.moveTo(xr1 + 22, y1); ctx.lineTo(xr1 + 44, y0); ctx.stroke(); // 下表面反射
      arrow(xr1 + 44, y0 - 1, xr1 + 114, y0 - 91, cc, 2.5); // 反射光2
      ctx.fillStyle = '#ffd36b'; ctx.fillText('① 上表面直接反射', xr1 + 76, y0 - 98); ctx.fillStyle = '#9ff0b7'; ctx.fillText('② 進入膜、下表面反射後穿出', xr1 + 118, y0 - 76);
      ctx.fillStyle = '#fff'; ctx.fillText('入射白光 / 單色光', 20, y0 - 98);
      ctx.fillStyle = '#9fb0cc'; ctx.fillText('兩束光朝同一方向 → 重疊干涉', 70, 270);
      // 右：兩路反射波與合成
      var px0 = 420, px1 = 790, pw = px1 - px0, yc = [60, 130, 215], amp = 28;
      var Dl = 4 * Math.PI * N * tn / lam, phi = Dl + Math.PI;
      var names = ['① 上表面反射波（反射時相位翻轉）', '② 下表面反射波（多走了來回路程）', '合成（①＋②）'];
      ctx.textAlign = 'left';
      for (var k = 0; k < 3; k++) {
        ctx.strokeStyle = '#2d3752'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px0, yc[k]); ctx.lineTo(px1, yc[k]); ctx.stroke();
        ctx.fillStyle = k === 0 ? '#ffd36b' : (k === 1 ? '#9ff0b7' : '#ffffff'); ctx.fillText(names[k], px0, yc[k] - (k === 2 ? 56 : 36));
        ctx.strokeStyle = k === 0 ? '#ffd36b' : (k === 1 ? '#9ff0b7' : cc); ctx.lineWidth = k === 2 ? 3 : 2; ctx.beginPath();
        for (var x = 0; x <= pw; x++) {
          var tau = x / pw * 4 * Math.PI, v = k === 0 ? Math.cos(tau + Math.PI) : (k === 1 ? Math.cos(tau - Dl) : Math.cos(tau + Math.PI) + Math.cos(tau - Dl));
          var yy = yc[k] - v * amp * (k === 2 ? 0.75 : 1); if (x) ctx.lineTo(px0 + x, yy); else ctx.moveTo(px0 + x, yy);
        }
        ctx.stroke();
      }
      var A = Math.abs(2 * Math.cos(phi / 2)), rel = A / 2;
      var state = rel > 0.8 ? '此波長在此厚度：增強（反射光亮）' : (rel < 0.2 ? '此波長在此厚度：幾乎相消（反射光暗）' : '此波長在此厚度：部分增強／減弱');
      o.st.textContent = state + '（合成振幅約為單一路的 ' + A.toFixed(2) + ' 倍）';
      var ph = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      o.ph.textContent = '兩路相位差 ≈ ' + (ph / Math.PI).toFixed(2) + ' π（光程來回 + 上表面反射相位翻轉 π）';
      ctx.fillStyle = '#c9d6ee'; ctx.fillText(state, px0, 282);
      drawStrip(tn);
    }
    t.addEventListener('input', draw); l.addEventListener('input', draw);
    [t, l].forEach(function (e) { e.addEventListener('change', function () { try { IOD.logEvent(PAGE, 'Q6', 'sim_' + e.id, e.value + '@' + new Date().toISOString(), 'SIM-FILM'); } catch (x) {} }); });
    draw();
    var rec = $('#fm-rec'); if (rec) rec.addEventListener('click', function () {
      var ta = $('#Q6-obs'); var line = '膜厚 ' + t.value + ' nm、波長 ' + l.value + ' nm：' + o.st.textContent;
      ta.value = (ta.value ? ta.value + '\n' : '') + line; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true })); toast('已貼到「觀察紀錄」');
    });
    var card = $('[data-qid="Q6"]'); if (card) card.addEventListener('poe-state', function (e) { $('#filmWrap').classList.toggle('sim-off', !e.detail.locked); });
  }

  /* ---------- 小型示意圖（自繪） ---------- */
  var DRAW = {
    newton: function (c, w, h) { var cx = w / 2, cy = h / 2; for (var r = 52; r > 0; r -= 2) { var t = r * r / 9; c.fillStyle = css(whiteRGB(t, 1.0), 1); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); } /* 牛頓環：玻璃間空氣膜，n≈1.0；色彩為示意 */ c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, 2, 0, 7); c.fill(); },
    cd: function (c, w, h) { var cx = w / 2, cy = h / 2, g = c.createConicGradient ? c.createConicGradient(0, cx, cy) : null; if (g) { var cols = ['#d33', '#e90', '#ee3', '#3c5', '#38e', '#83d', '#d33']; cols.forEach(function (x, i) { g.addColorStop(i / 6, x); }); c.fillStyle = g; } else c.fillStyle = '#88a'; c.beginPath(); c.arc(cx, cy, 52, 0, 7); c.arc(cx, cy, 12, 0, 7, true); c.fill('evenodd'); c.strokeStyle = 'rgba(255,255,255,.25)'; for (var r = 16; r < 52; r += 3) { c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); } },
    bubble: function (c, w, h) { var cx = w / 2, cy = h / 2; for (var r = 50; r > 0; r -= 2) { var a = Math.atan2(1, 1); var t = 80 + 300 * Math.abs(Math.sin(r / 9)) * (1 - r / 60) + (50 - r) * 4; c.fillStyle = css(whiteRGB(t), 1); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); } c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(cx, cy, 52, 0, 7); c.stroke(); },
    oil: function (c, w, h) { c.fillStyle = '#1b2230'; c.fillRect(0, 0, w, h); for (var x = 0; x < w; x++) for (var y = 0; y < h; y += 2) { var t = 120 + 260 * (0.5 + 0.5 * Math.sin(x / 17 + Math.sin(y / 11) * 2.2)) + y * 0.6; c.fillStyle = css(whiteRGB(t), .9); c.fillRect(x, y, 1, 2); } },
    soap: function (c, w, h) { c.fillStyle = '#10131c'; c.fillRect(0, 0, w, h); for (var y = 0; y < h; y++) { c.fillStyle = css(whiteRGB(y / h * 700 + 20), 1); c.fillRect(30, y, w - 60, 1); } },
    feather: function (c, w, h) { c.fillStyle = '#0d2a20'; c.fillRect(0, 0, w, h); var cx = w / 2, cy = h / 2; [[46, '#1f6f8b'], [34, '#2aa876'], [22, '#2d4fb0'], [11, '#6b3a1e']].forEach(function (p) { c.fillStyle = p[1]; c.beginPath(); c.ellipse(cx, cy, p[0] * .8, p[0], 0, 0, 7); c.fill(); }); c.strokeStyle = '#7bc47f'; for (var i = -40; i <= 40; i += 5) { c.beginPath(); c.moveTo(cx, h); c.quadraticCurveTo(cx + i, cy, cx + i * 1.4, 4); c.stroke(); } },
    butterfly: function (c, w, h) { c.fillStyle = '#0d1a2a'; c.fillRect(0, 0, w, h); var cx = w / 2, cy = h / 2; [-1, 1].forEach(function (s) { var g = c.createLinearGradient(cx, cy, cx + s * 60, cy); g.addColorStop(0, '#1a3fd0'); g.addColorStop(1, '#4fc3ff'); c.fillStyle = g; c.beginPath(); c.ellipse(cx + s * 30, cy - 12, 32, 38, s * .5, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx + s * 24, cy + 24, 24, 22, -s * .4, 0, 7); c.fill(); }); c.fillStyle = '#111'; c.fillRect(cx - 2, cy - 30, 4, 62); },
    spikes: function (c, w, h) { c.fillStyle = '#05060c'; c.fillRect(0, 0, w, h); var cx = w / 2, cy = h / 2; [[0, 1], [1, 0]].forEach(function (d) { var g = c.createLinearGradient(cx - d[0] * 70 - d[1] * 0, cy - d[1] * 50, cx + d[0] * 70, cy + d[1] * 50); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - d[0] * 70, cy - d[1] * 50); c.lineTo(cx + d[0] * 70, cy + d[1] * 50); c.stroke(); }); var rg = c.createRadialGradient(cx, cy, 0, cx, cy, 16); rg.addColorStop(0, '#fff'); rg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, 16, 0, 7); c.fill(); },
    lens: function (c, w, h) { c.fillStyle = '#1b2230'; c.fillRect(0, 0, w, h); [[w * .28, '#c9d6ee', 0], [w * .72, '#7a3fa0', 1]].forEach(function (p) { c.fillStyle = 'rgba(210,225,255,.18)'; c.beginPath(); c.ellipse(p[0], h / 2, 38, 40, 0, 0, 7); c.fill(); c.strokeStyle = '#c9d6ee'; c.lineWidth = 2; c.stroke(); }); var g = c.createRadialGradient(w * .72 - 10, h / 2 - 10, 2, w * .72, h / 2, 38); g.addColorStop(0, 'rgba(160,90,200,.15)'); g.addColorStop(1, 'rgba(120,60,170,.55)'); c.fillStyle = g; c.beginPath(); c.ellipse(w * .72, h / 2, 37, 39, 0, 0, 7); c.fill(); c.fillStyle = '#c9d6ee'; c.font = '11px sans-serif'; c.textAlign = 'center'; c.fillText('一般', w * .28, h - 6); c.fillText('抗反射（反射偏弱）', w * .72, h - 6); },
    pat1: function (c, w, h) { var col = wl2rgb(633); for (var x = 0; x < w; x++) { var u = (x / w - .5) * 12 * Math.PI / 1; var I = sinc2(u / 2 * 1.0); c.fillStyle = css(col, Math.pow(I, .4)); c.fillRect(x, 0, 1, h); } },
    pat2: function (c, w, h) { var col = wl2rgb(633); for (var x = 0; x < w; x++) { var u = (x / w - .5) * 12 * Math.PI; var I = sinc2(u / 2) * Math.pow(Math.cos(u * 1.7), 2); c.fillStyle = css(col, Math.pow(I, .6)); c.fillRect(x, 0, 1, h); } }
  };
  function whiteRGB(t, n) { n = n || 1.33; var s = [0, 0, 0], ws = [0, 0, 0], w, c, I, j; for (w = 400; w <= 700; w += 15) { c = wl2rgb(w); I = (1 - Math.cos(4 * Math.PI * n * t / w)) / 2; for (j = 0; j < 3; j++) { s[j] += I * c[j]; ws[j] += c[j]; } } return [s[0] / ws[0] * 1.7, s[1] / ws[1] * 1.7, s[2] / ws[2] * 1.7]; }
  function initDraw() { $$('canvas[data-draw]').forEach(function (cv) { var f = DRAW[cv.getAttribute('data-draw')]; if (f) { try { f(cv.getContext('2d'), cv.width, cv.height); } catch (e) { } } }); }

  /* ---------- 機制分類（C1） ---------- */
  function initClassify() {
    var btn = $('#c1-reveal'); if (!btn) return;
    var card = $('[data-qid="C1"]');
    function reveal() {
      $$('.mech .item', card).forEach(function (it) {
        var s = $('select', it), fb = $('.fb', it), ok = s.value === it.getAttribute('data-ans');
        fb.className = 'fb ' + (s.value ? (ok ? 'ok' : 'no') : '');
        fb.innerHTML = (s.value ? (ok ? '你的預測與說明相符。' : '你的預測與說明不同。') : '你未預測此項。') + ' ' + it.getAttribute('data-note');
      });
      save('C1', 'revealed', '1', 'ACT-C1'); $('#c1-fbbox').hidden = false;
      var n = $$('.mech .item', card).filter(function (it) { return $('select', it).value === it.getAttribute('data-ans'); }).length;
      save('C1', 'match_count', n + '/9', 'ACT-C1'); $('#c1-count').textContent = n;
    }
    btn.addEventListener('click', reveal);
    if (get('C1', 'revealed') === '1') reveal();
  }

  /* ---------- 隨堂測驗（06 第3節：7 題 15 分） ---------- */
  function initQuiz() {
    var btn = $('#qz-check'); if (!btn) return;
    function radio(q, name) { var r = $('[data-qid="' + q + '"] input[name="' + name + '"]:checked'); if (r) return r.value; var sel = $('[data-qid="' + q + '"] select[name="' + name + '"]'); return sel ? sel.value : ''; }
    function checks(q) { return $$('[data-qid="' + q + '"] input[type=checkbox]').map(function (c) { return { n: c.name, on: c.checked, good: c.getAttribute('data-good') === '1' }; }); }
    function setfb(q, pts, max, text) { var f = $('[data-qid="' + q + '"] .qz-fb'); f.className = 'qz-fb ' + (pts === max ? 'ok' : 'no'); f.textContent = '得分 ' + pts + ' / ' + max + '。' + text; save(q, 'score', pts, 'QUIZ-U3'); return pts; }
    function run() {
      var tot = 0, p;
      tot += setfb('Z1', radio('Z1', 'z1') === 'C' ? 1 : 0, 1, '單狹縫遠場圖樣：中央亮紋較寬較亮，兩側旁側亮紋較窄且逐漸變弱，亮紋間有暗紋。');
      tot += setfb('Z2', radio('Z2', 'z2') === 'B' ? 1 : 0, 1, '窄雙縫近似兩個分立次波源；單狹縫內則是連續分布的許多次波源。兩者都用次波疊加。');
      var z2c = $('[data-qid="Z2"] input[name="z2"]:checked'), z2mis = z2c ? (z2c.getAttribute('data-mis') || '') : '';
      save('Z2', 'mis', z2mis, 'QUIZ-U3');
      if (z2mis) { var z2f = $('[data-qid="Z2"] .qz-fb'); z2f.appendChild(document.createTextNode(' ')); var z2a = document.createElement('a'); z2a.className = 'mlink'; z2a.href = 'misconceptions.html#m' + z2mis.replace('M', ''); z2a.textContent = '迷思' + z2mis; z2f.appendChild(z2a); }
      tot += setfb('Z3', radio('Z3', 'z3') === 'A' ? 1 : 0, 1, '上、下表面兩路反射光重疊干涉，不同波長增強或減弱不同，所以出現色彩，不是因為色素。');
      tot += setfb('Z4', radio('Z4', 'z4') === 'B' ? 2 : 0, 2, '單縫＝甲（寬中央峰、無細條紋）；雙縫＝乙（細條紋，高度被單縫包絡限制）。丙（條紋等高）只有縫寬趨近 0 的理想化情況才出現。');
      var a1 = radio('Z5', 'ans1') === 'A' ? 2 : 0;
      var cs = checks('Z5'), good = cs.filter(function (c) { return c.on && c.good; }).length, bad = cs.filter(function (c) { return c.on && !c.good; }).length, net = good - bad;
      var a2 = net >= 3 ? 2 : (net === 2 ? 1 : 0);
      tot += setfb('Z5', a1 + a2, 4, '直進模型預期與縫同寬的亮帶；旁側亮紋、亮紋間的暗紋、縫愈窄中央亮紋愈寬，都是它無法說明、需要波動描述（次波疊加）的觀察。');
      var s6 = (radio('Z6', 'r1') === 'up' ? 1 : 0) + (radio('Z6', 'r2') === 'down' ? 1 : 0) + (radio('Z6', 'r3') === 'red' ? 1 : 0);
      tot += setfb('Z6', s6, 3, '同相疊加增強、反相疊加減弱（反射時的相位改變已包含在「同相／反相」判斷中）；紅光被增強、藍光被減弱，該處反射光看起來偏紅。');
      var c7 = checks('Z7'), g7 = c7.filter(function (c) { return c.on && c.good; }).length, b7 = c7.filter(function (c) { return c.on && !c.good; }).length;
      tot += setfb('Z7', Math.max(0, g7 - b7), 3, '只用折射無法交代兩路反射光重疊、反射相位與膜厚如何決定各波長強弱，也無法說明色帶隨膜厚位置變化。');
      $('#qz-total').textContent = tot; $('#qz-box').hidden = false;
      save('QZ', 'total', tot + '/15', 'QUIZ-U3');
      save('QZ', 'submitted_at', new Date().toISOString(), 'QUIZ-U3');
      var tip = tot >= 12 ? '掌握良好，可以進入統整回顧與後測。' : (tot >= 8 ? '大致掌握；請回看扣分題對應的段落（單縫、薄膜或模型限制）。' : '建議先回到單狹縫模擬與薄膜模擬再操作一次，之後重做本測驗。');
      $('#qz-tip').textContent = tip;
    }
    btn.addEventListener('click', function () { run(); toast('已評分（作答與分數已存在本機）'); });
    var rs = $('#qz-reset'); if (rs) rs.addEventListener('click', function () {
      $$('#quiz-list input').forEach(function (i) { i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); });
      $$('#quiz-list .qz-fb').forEach(function (f) { f.textContent = ''; f.className = 'qz-fb'; }); $('#qz-box').hidden = true;
    });
    if (get('QZ', 'total')) run();
  }

  function init() { initPOE(); initSlit(); initFilm(); initDraw(); initClassify(); initQuiz(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
