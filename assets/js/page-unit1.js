/* unit1 專屬腳本：POE 四步引擎、36 秒動畫、脈衝高度模擬、水波干涉模型 */
(function () {
  'use strict';
  var PAGE = 'unit1';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
  function toast(m) { if (window.IOD) IOD.toast(m); }
  function sgn(v, d) {
    var r = Math.round(v * 10) / 10; if (Math.abs(r) < 0.05) return d ? '0.0' : '0';
    return (r > 0 ? '+' : '−') + Math.abs(r).toFixed(d ? 1 : (Math.abs(r - Math.round(r)) < 1e-9 ? 0 : 1));
  }
  function setVal(el, v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
  var U1 = window.U1 = { flags: {} };
  function saveFlag(qid, f) { U1.flags[f] = true; try { IOD.saveAnswer(PAGE, qid, 'sim_' + f, '1', ''); } catch (e) {} }

  /* ---------- 脈衝繪圖（動畫、模擬、靜態圖共用） ---------- */
  function pv(x, c, h) { var d = x - c; if (Math.abs(d) >= 10) return 0; var q = Math.cos(Math.PI * d / 20); return h * q * q; }
  function setupCanvas(cv, cw) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), ch = Math.round(cw * 0.56);
    if (cv.__cw !== cw) { cv.width = cw * dpr; cv.height = ch * dpr; cv.__cw = cw; }
    var ctx = cv.getContext('2d'), s = dpr * cw / 1000;
    ctx.setTransform(s, 0, 0, s, 0, 0); return ctx;
  }
  var X0 = 60, XW = 920, TOP = { y0: 40, y1: 250, yc: 145 }, BOT = { y0: 290, y1: 500, yc: 395 }, SC = 35;
  function px(x) { return X0 + x / 100 * XW; }
  function drawPulses(cv, o) {
    var cw = o.w || 1000, c = setupCanvas(cv, cw), compact = !!o.compact;
    c.clearRect(0, 0, 1000, 560); c.fillStyle = '#fff'; c.fillRect(0, 0, 1000, 560);
    c.strokeStyle = '#000'; c.fillStyle = '#000'; c.font = (compact ? 26 : 19) + 'px sans-serif';
    [TOP, BOT].forEach(function (p) {
      c.lineWidth = 1.5; c.strokeRect(X0, p.y0, XW, p.y1 - p.y0);
      c.beginPath(); c.moveTo(X0, p.yc); c.lineTo(X0 + XW, p.yc); c.stroke();
      if (!compact) {
        c.textAlign = 'right'; c.fillText('+3', X0 - 6, p.y0 + 6); c.fillText('0', X0 - 6, p.yc + 6); c.fillText('−3', X0 - 6, p.y1 + 6);
      }
    });
    if (!compact) {
      c.textAlign = 'left'; c.font = 'bold 19px sans-serif';
      c.fillText('① 分波模型　A 細實線／B 虛線', X0, 28);
      c.fillText('② 合成繩形　粗實線', X0, 280);
      c.font = '17px sans-serif'; c.textAlign = 'center';
      [0, 25, 50, 75, 100].forEach(function (t) { c.fillText(String(t), px(t), 522); });
      c.fillText('位置（畫面寬度 %）', px(50), 548);
    }
    // P 線
    c.save(); c.setLineDash([3, 6]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(px(50), TOP.y0); c.lineTo(px(50), BOT.y1); c.stroke(); c.restore();
    c.textAlign = 'left'; c.font = 'bold ' + (compact ? 28 : 20) + 'px sans-serif'; c.fillText('P', px(50) + 6, BOT.y1 - 8);
    function curve(f, panel, w, dash) {
      c.beginPath(); c.lineWidth = w; c.setLineDash(dash || []);
      for (var x = 0; x <= 100.01; x += 0.5) { var y = panel.yc - SC * f(x); if (x === 0) c.moveTo(px(x), y); else c.lineTo(px(x), y); }
      c.stroke(); c.setLineDash([]);
    }
    curve(function (x) { return pv(x, o.xB, o.hB); }, TOP, 3.6, [11, 7]);
    curve(function (x) { return pv(x, o.xA, o.hA); }, TOP, 1.8);
    curve(function (x) { return pv(x, o.xA, o.hA) + pv(x, o.xB, o.hB); }, BOT, 4.6);
    if (!compact) {
      // A、B 標籤與傳播箭頭
      c.font = 'bold 20px sans-serif'; c.textAlign = 'center';
      [[o.xA, o.hA, 'A', 1], [o.xB, o.hB, 'B', -1]].forEach(function (a) {
        var ya = TOP.yc - SC * a[1] + (a[1] >= 0 ? -10 : 24); if (Math.abs(a[1]) < 0.05) ya = TOP.yc - 12;
        c.fillText(a[2] + (o.arrows ? (a[3] > 0 ? ' →' : ' ←') : ''), px(a[0]), ya);
      });
    }
    if (o.vals) {
      c.font = 'bold 22px sans-serif'; c.textAlign = 'right'; c.fillStyle = '#000';
      var s = o.vals, t = '';
      if (s.n >= 1) t += 'P 點：A＝' + sgn(s.a); if (s.n >= 2) t += '　B＝' + sgn(s.b); if (s.n >= 3) t += '　合成＝' + sgn(s.a + s.b);
      c.fillText(t, X0 + XW - 6, BOT.y0 - 10);
    }
    if (o.badge) {
      c.fillStyle = '#e07a1f'; c.fillRect(600, 6, 394, 30); c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
      c.fillText(o.badge, 797, 28);
    }
    if (o.banner) {
      c.fillStyle = 'rgba(255,255,255,.88)'; c.fillRect(0, 180, 1000, 140);
      c.fillStyle = '#b03a2e'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.fillText(o.banner, 500, 270);
    }
    if (o.final) {
      c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(0, 200, 1000, 120);
      c.fillStyle = '#164880'; c.font = 'bold 50px sans-serif'; c.textAlign = 'center'; c.fillText(o.final, 500, 280);
    }
  }

  /* ---------- 36 秒動畫 ---------- */
  var SHOTS = [
    { id: 1, a: 0, b: 6, t: '「在理想線性介質中，兩個相同脈衝正相向傳播。」' },
    { id: 2, a: 6, b: 14, t: '「同一位置的位移相加。同向重疊時，這裡的合成位移變大。」' },
    { id: 3, a: 14, b: 20, t: '「通過之後，兩個脈衝仍各自向原方向傳播。」' },
    { id: 4, a: 20, b: 28, t: '「改成等大反向時，位移抵銷，完全重疊當下合成位移為零。」' },
    { id: 5, a: 28, b: 36, t: '「零位移只描述這一瞬間；不代表波或能量永久消失。」' }
  ];
  function vstate(t) {
    var s = { cs: 1, u: 0, freeze: false, n: 0, banner: '', shot: 1, final: '' };
    if (t < 20) {
      s.cs = 1;
      if (t < 1) s.u = 0; else if (t < 12) s.u = 0.5 * (t - 1) / 11;
      else if (t < 14) { s.u = 0.5; s.freeze = true; s.n = t >= 13.4 ? 3 : t >= 12.8 ? 2 : t >= 12.2 ? 1 : 0; }
      else s.u = 0.5 + 0.5 * (t - 14) / 6;
      s.shot = t < 6 ? 1 : t < 14 ? 2 : 3;
    } else {
      s.cs = 2;
      if (t < 21) s.u = 0; else if (t < 26) s.u = 0.5 * (t - 21) / 5;
      else if (t < 28) { s.u = 0.5; s.freeze = true; s.n = t >= 27.4 ? 3 : t >= 26.8 ? 2 : t >= 26.2 ? 1 : 0; }
      else if (t < 34) s.u = 0.5 + 0.6 * (t - 28) / 6; else s.u = 1.1;
      if (t < 22) s.banner = '新案例：等大反向';
      s.shot = t < 28 ? 4 : 5;
      if (t >= 34) s.final = '重疊暫時，通過後各自傳播';
    }
    return s;
  }
  function initPlayer() {
    var cv = $('#vid'); if (!cv) return;
    var t = 0, playing = false, last = 0, speed = 1;
    var btn = $('#vplay'), seek = $('#vseek'), tl = $('#vtime'), sub = $('#vsub'), shotsEl = $('#vshots');
    var chips = SHOTS.map(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = '鏡頭 ' + s.id + '（' + s.a + '–' + s.b + ' 秒）';
      on(b, 'click', function () { t = s.a + 0.01; draw(); }); shotsEl.appendChild(b); return b;
    });
    function draw() {
      var s = vstate(t), hB = s.cs === 1 ? 1 : -1, xA = 25 + 50 * s.u, xB = 75 - 50 * s.u;
      drawPulses(cv, { hA: 1, hB: hB, xA: xA, xB: xB, arrows: !s.freeze && t >= 1 && s.u < 1.09, vals: s.n ? { n: s.n, a: 1, b: hB } : null,
        badge: s.freeze ? '教學定格（波並未停止）' : '', banner: s.banner, final: s.final });
      seek.value = t; tl.textContent = t.toFixed(1) + ' / 36 秒';
      var sh = SHOTS[s.shot - 1];
      sub.innerHTML = sh.t + '<small>鏡頭 ' + sh.id + '　' + sh.a + '–' + sh.b + ' 秒（旁白同時作字幕）</small>';
      chips.forEach(function (b, i) { b.classList.toggle('on', i === s.shot - 1); });
      btn.textContent = playing ? '暫停' : (t >= 36 ? '播放（從頭）' : '播放');
    }
    function tick(ts) {
      if (!playing) return;
      var dt = Math.min((ts - last) / 1000, 0.1); last = ts; t += dt * speed;
      if (t >= 36) { t = 36; playing = false; }
      draw(); if (playing) requestAnimationFrame(tick);
    }
    function play() { if (t >= 36) t = 0; playing = true; last = performance.now(); requestAnimationFrame(tick); draw(); saveFlag('Q1-3', 'video'); }
    function pause() { playing = false; draw(); }
    on(btn, 'click', function () { playing ? pause() : play(); });
    on($('#vreplay'), 'click', function () { t = 0; play(); });
    on(seek, 'input', function () { t = parseFloat(seek.value) || 0; draw(); });
    on($('#vspeed'), 'change', function () { speed = parseFloat(this.value) || 1; });
    on($('#vsrt'), 'click', function () {
      var txt = SHOTS.map(function (s) { return '鏡頭 ' + s.id + '　' + s.a + '–' + s.b + ' 秒\n' + s.t.replace(/[「」]/g, ''); }).join('\n\n') + '\n\n尾字：重疊暫時，通過後各自傳播\n';
      IOD.download('unit1_波的疊加_字幕.txt', txt, 'text/plain;charset=utf-8');
    });
    draw(); window.addEventListener('resize', draw);
  }

  /* ---------- 脈衝高度模擬 ---------- */
  var psim = { t: 0, playing: false, hA: 1, hB: 1, cs: 'same', last: 0 };
  function initPulseSim() {
    var cv = $('#pcan'); if (!cv) return;
    var sA = $('#sA'), sB = $('#sB'), oA = $('#oA'), oB = $('#oB'), pread = $('#pread');
    var snaps = [$('#snap0'), $('#snap1'), $('#snap2')];
    function pos(t) { return { xA: 25 + 5 * t, xB: 75 - 5 * t }; }
    function vals() { var p = pos(psim.t), a = pv(50, p.xA, psim.hA), b = pv(50, p.xB, psim.hB); return { a: a, b: b, s: a + b }; }
    function draw() {
      var p = pos(psim.t), v = vals();
      drawPulses(cv, { hA: psim.hA, hB: psim.hB, xA: p.xA, xB: p.xB, vals: { n: 3, a: v.a, b: v.b } });
      pread.textContent = (psim.playing ? '播放中' : '暫停中') + '　t＝' + psim.t.toFixed(1) + ' 秒\n④ P 點回饋：A＝' + sgn(v.a, 1) + '，B＝' + sgn(v.b, 1) + '，合成＝' + sgn(v.s, 1) + '（相對單位）';
      pread.style.whiteSpace = 'pre-line';
      [0, 5, 10].forEach(function (tt, i) { var q = pos(tt); drawPulses(snaps[i], { w: 400, compact: true, hA: psim.hA, hB: psim.hB, xA: q.xA, xB: q.xB }); });
      $('#pPlay').textContent = psim.playing ? '播放中…' : '播放';
    }
    function reset(keepH) {
      psim.t = 0; psim.playing = false;
      if (!keepH) { psim.hA = 1; psim.hB = 1; sA.value = 1; sB.value = 1; }
      oA.textContent = sgn(psim.hA, 1); oB.textContent = sgn(psim.hB, 1); draw();
    }
    function setCase(c) {
      psim.cs = c; psim.hA = 1; psim.hB = c === 'same' ? 1 : -1; sA.value = psim.hA; sB.value = psim.hB;
      $('#cSame').classList.toggle('sel', c === 'same'); $('#cOpp').classList.toggle('sel', c === 'opp'); reset(true);
    }
    function sliderChange() {
      psim.hA = parseFloat(sA.value); psim.hB = parseFloat(sB.value);
      psim.cs = 'custom'; $('#cSame').classList.remove('sel'); $('#cOpp').classList.remove('sel'); reset(true);
    }
    function tick(ts) {
      if (!psim.playing) return;
      var dt = Math.min((ts - psim.last) / 1000, 0.1); psim.last = ts;
      var prev = psim.t; psim.t = Math.min(14, psim.t + dt);
      if ($('#pAuto').checked && prev < 5 && psim.t >= 5) { psim.t = 5; psim.playing = false; }
      if (psim.t >= 14) psim.playing = false;
      draw(); if (psim.playing) requestAnimationFrame(tick);
    }
    on($('#pPlay'), 'click', function () {
      if (psim.t >= 14) psim.t = 0; if (psim.playing) return;
      psim.playing = true; psim.last = performance.now(); saveFlag('Q1-3', 'played'); requestAnimationFrame(tick); draw();
    });
    on($('#pPause'), 'click', function () { psim.playing = false; draw(); });
    on($('#pReset'), 'click', function () { setCase('same'); });
    on($('#cSame'), 'click', function () { setCase('same'); });
    on($('#cOpp'), 'click', function () { setCase('opp'); });
    on(sA, 'input', sliderChange); on(sB, 'input', sliderChange);
    function record(kind) {
      var msg = $('#recmsg');
      if (Math.abs(psim.t - 5) > 0.3) { msg.textContent = '請先在 t＝5 秒（完全重疊）時暫停，再記錄。'; toast('請先在完全重疊時暫停'); return; }
      var v = vals(), tgt = $(kind === 'same' ? '#o1' : '#o2');
      if (!tgt) return; setVal(tgt, sgn(v.s, 1));
      msg.textContent = '已記入「' + (kind === 'same' ? '同向' : '反向') + '」欄：' + sgn(v.s, 1) + '（目前 A＝' + sgn(psim.hA, 1) + '、B＝' + sgn(psim.hB, 1) + '）';
    }
    on($('#recSame'), 'click', function () { record('same'); });
    on($('#recOpp'), 'click', function () { record('opp'); });
    reset(false); window.addEventListener('resize', draw);
  }

  /* ---------- 水波干涉模型 ---------- */
  function initWave() {
    var cv = $('#wcan'); if (!cv) return;
    var ctx = cv.getContext('2d'), chart = $('#wchart'), cctx = chart.getContext('2d');
    var LAM = 40, K = 2 * Math.PI / LAM, TT = 1.6, OM = 2 * Math.PI / TT, WIN = 2 * TT;
    var GW = 150, GH = 100, off = document.createElement('canvas'); off.width = GW; off.height = GH;
    var octx = off.getContext('2d'), img = octx.createImageData(GW, GH);
    var st = { t: 0, playing: false, last: 0, d: 4, mode: 'inst', active: 'A', pts: { A: { x: 300, y: 260, buf: [] }, B: { x: 273, y: 260, buf: [] } } };
    var DEF = { A: [300, 260], B: [273, 260] };
    function src() { return [{ x: 300 - st.d * LAM / 2, y: 60 }, { x: 300 + st.d * LAM / 2, y: 60 }]; }
    function amp(r) { return 1 / Math.sqrt(1 + r / 80); }
    function field(x, y, t) {
      var s = src(), z = 0, re = 0, im = 0;
      for (var i = 0; i < 2; i++) {
        var r = Math.hypot(x - s[i].x, y - s[i].y), a = amp(r);
        z += a * Math.cos(K * r - OM * t); re += a * Math.cos(K * r); im += a * Math.sin(K * r);
      }
      return { z: z, a: Math.hypot(re, im) };
    }
    function color(v, mode) {
      if (mode === 'inst') { // 藍（正）— 白（0）— 橘（負）
        v = Math.max(-1, Math.min(1, v / 1.1));
        return v >= 0 ? [255 - v * 224, 255 - v * 160, 255 - v * 87] : [255 + v * 31, 255 + v * 133, 255 + v * 224];
      }
      v = Math.max(0, Math.min(1, v / 1.1)); return [255 - v * 235, 255 - v * 200, 255 - v * 150];
    }
    function render() {
      var d = img.data;
      for (var j = 0; j < GH; j++) for (var i = 0; i < GW; i++) {
        var f = field((i + 0.5) * 4, (j + 0.5) * 4, st.t), c = color(st.mode === 'inst' ? f.z : f.a, st.mode), k = (j * GW + i) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, 600, 400);
      var s = src();
      s.forEach(function (p, i) { ctx.fillStyle = '#164880'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('S' + (i + 1), p.x, p.y - 12); });
      ['A', 'B'].forEach(function (n) {
        var p = st.pts[n]; ctx.lineWidth = 3; ctx.strokeStyle = n === 'A' ? '#1f5fa8' : '#e07a1f'; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n, p.x, p.y + 27);
      });
    }
    function sample() {
      ['A', 'B'].forEach(function (n) {
        var p = st.pts[n]; p.buf.push([st.t, field(p.x, p.y, st.t).z]);
        while (p.buf.length && p.buf[0][0] < st.t - WIN) p.buf.shift();
      });
    }
    function span(p) { return p.buf.length ? p.buf[p.buf.length - 1][0] - p.buf[0][0] : 0; }
    function maxAbs(p) { var m = 0; p.buf.forEach(function (q) { m = Math.max(m, Math.abs(q[1])); }); return m; }
    function drawChart() {
      var W = 600, H = 190; cctx.clearRect(0, 0, W, H); cctx.fillStyle = '#fff'; cctx.fillRect(0, 0, W, H);
      cctx.strokeStyle = '#ccc'; cctx.lineWidth = 1; cctx.font = '12px sans-serif'; cctx.fillStyle = '#555'; cctx.textAlign = 'right';
      [-2, -1, 0, 1, 2].forEach(function (v) { var y = H / 2 - v * 38; cctx.beginPath(); cctx.moveTo(34, y); cctx.lineTo(W, y); cctx.strokeStyle = v === 0 ? '#333' : '#ddd'; cctx.stroke(); cctx.fillText(String(v), 30, y + 4); });
      var t1 = st.t, t0 = t1 - WIN;
      ['A', 'B'].forEach(function (n) {
        var p = st.pts[n]; cctx.beginPath(); cctx.strokeStyle = n === 'A' ? '#1f5fa8' : '#e07a1f'; cctx.lineWidth = 2.5;
        p.buf.forEach(function (q, i) { var x = 34 + (q[0] - t0) / WIN * (W - 40), y = H / 2 - q[1] * 38; if (i === 0) cctx.moveTo(x, y); else cctx.lineTo(x, y); });
        cctx.stroke();
      });
    }
    function readout() {
      var s = src(), lines = [];
      ['A', 'B'].forEach(function (n) {
        var p = st.pts[n], r1 = Math.hypot(p.x - s[0].x, p.y - s[0].y) / LAM, r2 = Math.hypot(p.x - s[1].x, p.y - s[1].y) / LAM;
        var full = span(p) >= TT * 0.98;
        lines.push('點' + n + '：到 S1＝' + r1.toFixed(2) + 'λ，到 S2＝' + r2.toFixed(2) + 'λ，距離差＝' + Math.abs(r1 - r2).toFixed(2) + 'λ\n　此刻位移 ' + (field(p.x, p.y, st.t).z).toFixed(2) + '；最大位移 ' + (full ? maxAbs(p).toFixed(2) : '（紀錄中…請讓它跑滿一個週期）'));
      });
      var e = $('#wread'); e.textContent = lines.join('\n'); e.style.whiteSpace = 'pre-line'; e.style.fontSize = '.82rem';
    }
    function frame() { render(); drawChart(); readout(); $('#wPlay').textContent = st.playing ? '暫停' : '播放'; }
    function tick(ts) {
      if (!st.playing) return;
      var dt = Math.min((ts - st.last) / 1000, 0.1); st.last = ts; st.t += dt; sample(); frame();
      requestAnimationFrame(tick);
    }
    function play() { if (st.playing) return; st.playing = true; st.last = performance.now(); requestAnimationFrame(tick); }
    function pause() { st.playing = false; frame(); }
    U1.waveStart = function () { play(); };
    on($('#wPlay'), 'click', function () { st.playing ? pause() : play(); });
    function pickActive(n) { st.active = n; $('#mA').classList.toggle('sel', n === 'A'); $('#mB').classList.toggle('sel', n === 'B'); }
    on($('#mA'), 'click', function () { pickActive('A'); }); on($('#mB'), 'click', function () { pickActive('B'); });
    on($('#mReset'), 'click', function () { ['A', 'B'].forEach(function (n) { st.pts[n].x = DEF[n][0]; st.pts[n].y = DEF[n][1]; st.pts[n].buf = []; }); frame(); });
    function place(ev) {
      var r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 600, y = (ev.clientY - r.top) / r.height * 400;
      var p = st.pts[st.active]; p.x = Math.max(8, Math.min(592, x)); p.y = Math.max(90, Math.min(392, y)); p.buf = []; frame();
    }
    var drag = false;
    on(cv, 'pointerdown', function (e) { drag = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} place(e); });
    on(cv, 'pointermove', function (e) { if (drag) place(e); });
    on(cv, 'pointerup', function () { drag = false; });
    $$('input[name=wmode]').forEach(function (r) { on(r, 'change', function () { if (r.checked) { st.mode = r.value; frame(); } }); });
    on($('#wd'), 'input', function () {
      st.d = parseFloat(this.value); $('#wdo').textContent = st.d.toFixed(1) + ' λ';
      ['A', 'B'].forEach(function (n) { st.pts[n].buf = []; }); frame();
    });
    function rec(n) {
      var p = st.pts[n], msg = $('#wmsg');
      if (span(p) < TT * 0.98) { msg.textContent = '點 ' + n + ' 的紀錄還不到一個完整週期，請讓模型繼續播放。'; toast('紀錄還不夠長'); return; }
      setVal($(n === 'A' ? '#oa' : '#ob'), maxAbs(p).toFixed(2)); saveFlag('Q4-6', 'wave');
      msg.textContent = '已記入點 ' + n + '：' + maxAbs(p).toFixed(2);
    }
    on($('#recA'), 'click', function () { rec('A'); }); on($('#recB'), 'click', function () { rec('B'); });
    frame();
    // 預先填滿紀錄（避免一開始空白）
    for (var i = 0; i < 40; i++) { st.t += WIN / 40; sample(); } st.t = WIN; frame();
  }

  /* ---------- POE 四步引擎 ---------- */
  function initPoe(card) {
    var qid = card.getAttribute('data-qid'), act = card.getAttribute('data-act') || '';
    var panels = [1, 2, 3, 4].map(function (n) { return $('.poe-panel[data-step="' + n + '"]', card); });
    var chips = $$('.poe-chips span', card);
    var levels = {};
    function get(f) { return IOD.getAnswer(PAGE, qid, f); }
    function put(f, v) { IOD.saveAnswer(PAGE, qid, f, v, act); }
    function stage() { return get('step4_done') ? 5 : get('step3_done') ? 4 : get('step2_done') ? 3 : get('pred_locked') ? 2 : 1; }
    function fb(panel, msg, ok) { var f = $('.fb', panel); f.textContent = msg; f.className = 'fb ' + (ok === true ? 'ok' : ok === false ? 'no' : ''); }
    function misList() { try { return JSON.parse(get('mis') || '[]'); } catch (e) { return []; } }
    function setMis(key, openL1) {
      var set = $('.hints-set[data-mis="' + key + '"]', card); if (!set) return null;
      set.hidden = false;
      if (openL1) { var d = $('details.L1', set); if (d && !d.open) { d.open = true; put('hintset_' + key + '_L1', new Date().toISOString()); } levels[key] = Math.max(levels[key] || 0, 1); }
      return set;
    }
    function nextHint(key) {
      var set = setMis(key, false); if (!set) return;
      var ds = $$('details', set), i;
      for (i = 0; i < ds.length; i++) if (!ds[i].open) { ds[i].open = true; levels[key] = i + 1; put('hintset_' + key + '_L' + (i + 1), new Date().toISOString()); set.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return i + 1; }
      toast('這一組提示已全部展開。可以回頭對照觀察，或請老師協助。'); return 3;
    }
    function render() {
      var s = stage();
      panels.forEach(function (p, i) {
        p.classList.toggle('locked', i + 1 > Math.min(s, 4)); p.classList.toggle('done', i + 1 < s);
      });
      chips.forEach(function (c, i) { c.classList.toggle('done', i + 1 < s); c.classList.toggle('cur', i + 1 === Math.min(s, 4)); });
      var fs = $('fieldset', panels[0]); if (fs) fs.disabled = s > 1;
      var lk = $('[data-poe-lock]', panels[0]); if (lk) { lk.disabled = s > 1; lk.textContent = s > 1 ? '預測已鎖定' : '送出預測並鎖定'; }
      if (s >= 2 && U1.waveStart && qid === 'Q4-6') U1.waveStart();
      if (s >= 3) misList().forEach(function (k) { setMis(k, false); });
      if (s >= 4) buildCompare();
    }
    function groupText(item) {
      var ta = $('textarea', item) || $('input[type=text]', item); if (ta) return ta.value.trim() || '（未填）';
      var ch = $('input:checked', item); if (!ch) return '（未選）';
      var l = ch.closest('label'); return l ? l.textContent.trim() : ch.value;
    }
    function buildCompare() {
      var old = $('.pred-copy', card); old.innerHTML = '';
      $$('.q-item', panels[0]).forEach(function (it) {
        var p = document.createElement('p'); p.className = 'small'; var b = document.createElement('b'); b.textContent = it.getAttribute('data-title') + '：'; p.appendChild(b); p.appendChild(document.createTextNode(groupText(it))); old.appendChild(p);
      });
      var ob = $('.obs-copy', card); ob.innerHTML = '';
      var obs = $$('.q-item', panels[1]);
      if (obs.length) { var h = document.createElement('div'); h.innerHTML = '<b>我觀察到：</b>'; ob.appendChild(h); obs.forEach(function (it) { var p = document.createElement('div'); p.textContent = it.getAttribute('data-title') + '：' + groupText(it); ob.appendChild(p); }); }
    }
    on($('[data-poe-lock]', panels[0]), 'click', function () {
      var p = panels[0], miss = [];
      $$('.q-item', p).forEach(function (it) {
        var ta = $('textarea', it);
        if (ta) { if (ta.value.trim().length < 4) miss.push(it.getAttribute('data-title')); }
        else if (!$('input:checked', it)) miss.push(it.getAttribute('data-title'));
      });
      if (miss.length) { fb(p, '還有項目沒填：' + miss.join('、') + '。（理由請至少寫幾個字）', false); return; }
      var mis = []; $$('input:checked', p).forEach(function (r) { var m = r.getAttribute('data-mis'); if (m && mis.indexOf(m) < 0) mis.push(m); });
      put('mis', JSON.stringify(mis)); put('pred_locked', new Date().toISOString());
      fb(p, '預測已送出並鎖定。接下來請觀察。', true); render(); toast('預測已鎖定');
      panels[1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    on($('[data-poe-obs-done]', panels[1]), 'click', function () {
      var p = panels[1], miss = [], flag = this.getAttribute('data-flag');
      if (!U1.flags[flag] && !get('sim_' + flag)) miss.push(flag === 'played' ? '請先實際按播放操作模擬' : '請先在水波模型中記入 A、B 的最大位移');
      $$('.q-item', p).forEach(function (it) {
        var ti = $('input[type=text]', it);
        if (ti ? !ti.value.trim() : !$('input:checked', it)) miss.push(it.getAttribute('data-title'));
      });
      if (miss.length) { fb(p, '還沒完成：' + miss.join('；'), false); return; }
      put('step2_done', new Date().toISOString());
      // 觀察與預測矛盾時，由提問帶出 L1
      var hit = []; $$('input:checked', p).forEach(function (r) { var m = r.getAttribute('data-mis'); if (m && hit.indexOf(m) < 0) hit.push(m); });
      misList().forEach(function (m) { if (hit.indexOf(m) < 0) hit.push(m); });
      put('mis', JSON.stringify(hit));
      render(); hit.forEach(function (m) { setMis(m, true); });
      fb(p, hit.length ? '已記錄。你的預測或觀察裡有需要再想一想的地方，解釋區已出現 L1 提問。' : '已記錄。', true);
      panels[2].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    on($('[data-poe-stuck]', panels[2]), 'click', function () {
      var keys = misList(), key = (keys.filter(function (k) { return levels[k]; })[0]) || keys[0] || card.getAttribute('data-default-mis');
      var n = nextHint(key); if (n) fb(panels[2], '已展開 L' + n + '。看完再試著改寫你的解釋。', null);
    });
    on($('[data-poe-check]', panels[2]), 'click', function () {
      var p = panels[2], sel = $('input[name=chk]:checked', p), ex = $('textarea', p);
      if (!sel) { fb(p, '請先選一個檢核答案。', false); return; }
      if (sel.getAttribute('data-correct') === '1') {
        if (ex.value.trim().length < 8) { fb(p, '檢核答對了。請再用自己的話把解釋寫完整（至少一兩句）。', null); return; }
        put('step3_done', new Date().toISOString()); fb(p, '解釋通過檢核。接著對照原預測做修正。', true); render();
        panels[3].scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        var key = sel.getAttribute('data-mis') || card.getAttribute('data-default-mis');
        put('wrong_' + sel.value, new Date().toISOString());
        var n = (levels[key] || 0) + 1; if (n > 3) n = 3;
        if (!levels[key]) { setMis(key, true); n = 1; } else n = nextHint(key) || n;
        fb(p, '這個說法還不完全對。先看提示 L' + n + '（提示只問問題、不直接給答案），再重新選擇。', false);
      }
    });
    on($('[data-poe-finish]', panels[3]), 'click', function () {
      var p = panels[3];
      if (!$('input[name=cmp]:checked', p)) { fb(p, '請選擇「與預測比較」的結果。', false); return; }
      if ($('textarea[name=revise]', p).value.trim().length < 6) { fb(p, '請寫下保留或修正了哪一點，並引用一項觀察。', false); return; }
      put('step4_done', new Date().toISOString()); fb(p, '完成：預測 → 觀察 → 解釋 → 修正。', true); render(); toast('活動完成');
    });
    render();
  }

  /* ---------- 圖檔下載 ---------- */
  function initFig() {
    var svg = $('#fig-compare'); if (!svg) return;
    function xml() { var c = svg.cloneNode(true); c.setAttribute('width', '2400'); c.setAttribute('height', '1200'); return new XMLSerializer().serializeToString(c); }
    on($('#dlSvg'), 'click', function () { IOD.download('unit1_兩種完全重疊的比較.svg', xml(), 'image/svg+xml;charset=utf-8'); });
    on($('#dlPng'), 'click', function () {
      try {
        var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml()), im = new Image();
        im.onload = function () {
          var c = document.createElement('canvas'); c.width = 2400; c.height = 1200; c.getContext('2d').drawImage(im, 0, 0, 2400, 1200);
          c.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'unit1_兩種完全重疊的比較.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); });
        };
        im.onerror = function () { toast('此瀏覽器無法轉成 PNG，請改下載 SVG'); };
        im.src = url;
      } catch (e) { toast('此瀏覽器無法轉成 PNG，請改下載 SVG'); }
    });
  }

  function init() {
    if (!window.IOD) { setTimeout(init, 50); return; }
    try { ['video', 'played'].forEach(function (f) { if (IOD.getAnswer(PAGE, 'Q1-3', 'sim_' + f)) U1.flags[f] = true; }); if (IOD.getAnswer(PAGE, 'Q4-6', 'sim_wave')) U1.flags.wave = true; } catch (e) {}
    initPlayer(); initPulseSim(); initWave(); initFig();
    $$('.qcard.poe').forEach(initPoe);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
