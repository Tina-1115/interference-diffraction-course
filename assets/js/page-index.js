(function () {
  'use strict';
  function ready(f) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(f, 0); }); else setTimeout(f, 0); }
  ready(function () {
    if (!window.IOD) return;
    document.querySelectorAll('.route a[data-p]').forEach(function (a) {
      var pr = IOD.getProgress(a.getAttribute('data-p')), st = a.querySelector('.st');
      if (pr.done) { a.classList.add('done'); st.textContent = '已完成'; }
      else if (pr.pct > 10) st.textContent = '進行中 ' + pr.pct + '%';
      else st.textContent = '尚未開始';
    });
    var cnt = document.getElementById('rec-count');
    function upd() { if (cnt) cnt.textContent = IOD.allAnswers().length; }
    upd();
    var o = IOD.overall(), el = document.getElementById('overall-txt');
    if (el) el.textContent = '主線 ' + o.total + ' 站已完成 ' + o.done + ' 站（' + o.pct + '%）';
    var go = document.getElementById('go-next');
    if (go) {
      var next = IOD.pages.filter(function (p) { return p.group === 'main' && p.id !== 'index' && !IOD.getProgress(p.id).done; })[0];
      if (next && IOD.getProgress(next.id).pct > 10) { go.href = next.href; go.textContent = '繼續：' + next.title; }
    }
  });
})();
