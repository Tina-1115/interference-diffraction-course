document.addEventListener('DOMContentLoaded',function(){
  var radios=document.querySelectorAll('input[name="route"]'),stages=document.querySelectorAll('.stage'),msg=document.getElementById('route-msg');
  var text={review:'先回頭鞏固：到迷思速查或重做單元題卡，等想法穩了再往下。',s1:'高中量化：先確認三角比與疊加概念，再從下列資源選讀。',s2:'大一波動光學：建議先完成高中量化，再選讀；先備含三角函數與英文閱讀。',all:'全部攤開：三階段資源一次列出，自行挑選。'};
  function show(v){
    stages.forEach(function(s){var k=s.dataset.stage.split(' ');s.classList.toggle('on',k.indexOf(v)>=0);});
    if(msg)msg.textContent=v?text[v]:'';
  }
  radios.forEach(function(r){r.addEventListener('change',function(){
    show(r.value);
    try{IOD.saveAnswer('resources','route','choice',r.value,'ROUTE');}catch(e){}
  });});
  var saved=null;try{saved=IOD.getAnswer('resources','route','choice');}catch(e){}
  var done=document.querySelectorAll('.pre-chk');
  if(saved){radios.forEach(function(r){if(r.value===saved)r.checked=true;});show(saved);}
  else show('');
});
