document.addEventListener('DOMContentLoaded',function(){
  var tabs=document.querySelectorAll('.tabs button'),panels=document.querySelectorAll('.panel');
  function sel(id,push){
    tabs.forEach(function(b){b.setAttribute('aria-selected',b.dataset.p===id?'true':'false');});
    panels.forEach(function(p){p.classList.toggle('on',p.id===id);});
    try{IOD.store.set('assess_tab',id);}catch(e){}
  }
  tabs.forEach(function(b){b.addEventListener('click',function(){sel(b.dataset.p);});});
  var t='p-pre';try{t=IOD.store.get('assess_tab','p-pre')||'p-pre';}catch(e){}
  if(!document.getElementById(t))t='p-pre';sel(t);
  var gb=document.querySelectorAll('.gbar button');
  gb.forEach(function(b){b.addEventListener('click',function(){
    var g=b.dataset.g;
    gb.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
    document.querySelectorAll('tr[data-goal]').forEach(function(r){
      var m=g==='all'||(' '+r.dataset.goal+' ').indexOf(' '+g+' ')>=0;r.classList.toggle('dim',!m);
    });
  });});
  // 點「列」的題號 -> 高亮同題在三張細目表的所在列
  document.querySelectorAll('.cross-link').forEach(function(a){a.addEventListener('click',function(e){
    var id=a.getAttribute('href').slice(1);var p=document.getElementById(id);
    if(p){e.preventDefault();var panel=p.closest('.panel');if(panel)sel(panel.id);p.scrollIntoView();
      p.classList.add('hl');setTimeout(function(){p.classList.remove('hl');},2000);}
  });});
  if(location.hash){var el=document.getElementById(location.hash.slice(1));if(el&&el.closest('.panel'))sel(el.closest('.panel').id);}
});
/* 題號編碼（顯示用 id-chip，不改變原文）：前測 PRE-Q{n}、第3節隨堂 S3-QZ{n}、後測 POST-Q{n} */
document.addEventListener('DOMContentLoaded',function(){
  var map={pre:'PRE-Q',unit:'S3-QZ',post:'POST-Q'};
  document.querySelectorAll('tr[id]').forEach(function(tr){
    var m=/^(pre|unit|post)-(\d+)$/.exec(tr.id);if(!m)return;
    var td=tr.querySelector('td');if(!td)return;
    var c=document.createElement('span');c.className='id-chip';c.textContent=map[m[1]]+m[2];td.appendChild(c);
  });
});
