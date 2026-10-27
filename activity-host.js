(function(){
 'use strict';
 const id=new URLSearchParams(location.search).get('id'),item=(window.BOOK.activities||[]).find(a=>a.id===id),frame=document.getElementById('original');
 let session,nonce,timer;
 const origin=location.origin==='null'?'*':location.origin;
 if(item?.viewport){
  const {width,height}=item.viewport;
  Object.assign(frame.style,{position:'absolute',width:width+'px',height:height+'px',left:'50%',top:'50%',transformOrigin:'center'});
  document.body.style.overflow='hidden';
  const fit=()=>{const scale=Math.min(innerWidth/width,innerHeight/height);frame.style.transform=`translate(-50%,-50%) scale(${scale})`;};
  new ResizeObserver(fit).observe(document.documentElement);fit();
 }
 function send(snapshot,reason){
  clearTimeout(timer);const run=()=>parent.postMessage({channel:'arabic9.activity.v1',id,nonce,snapshot},origin);
  if(reason==='commit')run();else timer=setTimeout(run,350);
 }
 window.ActivityHost={snapshot:()=>{try{frame.contentWindow.OriginalActivity?.flush();}catch(_){}return session?.snapshot()||null;},command:action=>['check','next'].includes(action)&&!!frame.contentWindow.OriginalActivity?.command(action)};
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==location.origin||event.data?.channel!=='arabic9.activity.init'||session||!item)return;
  const data=event.data;if(data.id!==id||typeof data.nonce!=='string')return;nonce=data.nonce;
  session=new ActivitySession({values:data.values,learnerId:data.learnerId,review:data.review,onSave:send});
  window.API=session.api; // The child finds this private API before it can reach the real LMS.
  frame.title=item.title;frame.src=item.src;
 });
 frame.addEventListener('load',()=>{if(frame.getAttribute('src'))document.getElementById('loading').hidden=true});
 window.addEventListener('pagehide',()=>{clearTimeout(timer);if(session?.active)session.finish()});
 if(!item)document.getElementById('loading').textContent='Bu etkinlik bulunamadı. Kitaba dönüp yeniden aç.';
})();
