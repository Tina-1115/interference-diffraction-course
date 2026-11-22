document.addEventListener('DOMContentLoaded',function(){
  var btns=document.querySelectorAll('.filter-bar button'),cards=document.querySelectorAll('.mis'),cnt=document.getElementById('filter-count');
  function apply(f){
    var n=0;
    cards.forEach(function(c){
      var show=f==='all'||(f==='L'?c.dataset.hasl==='1':c.dataset.sec===f);
      c.classList.toggle('hidden-m',!show); if(show)n++;
    });
    btns.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.f===f?'true':'false');});
    if(cnt)cnt.textContent='顯示 '+n+' / '+cards.length+' 項';
    try{window.IOD&&IOD.store.set('mis_filter',f);}catch(e){}
  }
  btns.forEach(function(b){b.addEventListener('click',function(){apply(b.dataset.f);});});
  var f='all';try{f=(window.IOD&&IOD.store.get('mis_filter','all'))||'all';}catch(e){}
  apply(f);
  // 錨點跳轉時若被篩掉，自動回到全部
  function hash(){var id=location.hash.slice(1);var el=id&&document.getElementById(id);
    if(el&&el.classList.contains('hidden-m')){apply('all');el.scrollIntoView();}
    if(el&&el.classList.contains('mis')){var d=el.querySelector('details.sym');}}
  window.addEventListener('hashchange',hash);hash();
  // 自測摘要：勾選症狀數
  cards.forEach(function(c){
    var out=c.querySelector('.sym-out');if(!out)return;
    function upd(){var s=c.querySelectorAll('.sym-chk:checked').length,t=c.querySelectorAll('.sym-chk').length;
      var k=c.querySelectorAll('.fix-chk:checked').length,kt=c.querySelectorAll('.fix-chk').length;
      out.textContent='症狀符合 '+s+'/'+t+'；改善判準已達成 '+k+'/'+kt+(kt&&k===kt?'（已全部達成）':'');}
    c.addEventListener('change',upd);setTimeout(upd,50);
  });
});
