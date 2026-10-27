/* Preserve H5P's own response state and report only whole-activity results. */
(function(){
 'use strict';
 const api=parent.API,H=window.H5P,integration=window.H5PIntegration;
 if(!api||!H||!integration)return;
 // The supplied CoursePresentation 1.26 exports use an older bundled core.
 // Match the recursive empty-state semantics in h5p-php-library/js/h5p.js.
 H.isEmpty ||= function empty(value){
  if(value===0||value===false)return false;
  if(!value)return true;
  return typeof value==='object'?Object.values(value).every(empty):false;
 };
 api.LMSInitialize('');
 let saved;
 try{const parsed=JSON.parse(api.LMSGetValue('cmi.suspend_data')||'null');if(parsed?.v===1)saved=parsed.state;}catch(_){}
 integration.saveFreq=1;integration.postUserStatistics=false;
 H.getUserData=function(id,key,callback){callback(undefined,key==='state'?saved:undefined);};
 H.setUserData=function(id,key,value){
  if(key!=='state'||value===undefined)return;
  const packed=JSON.stringify({v:1,state:value});
  if(packed.length<=64000)api.LMSSetValue('cmi.suspend_data',packed);
 };
 function flush(){
  const instance=H.instances?.[0];
  if(instance?.getCurrentState)H.setUserData(instance.contentId,'state',instance.getCurrentState());
 }
 function command(action){
  const instance=H.instances?.[0];let button;
  if(action==='next')button=document.querySelector('.h5p-footer-next-slide');
  if(action==='check'){
   const slide=instance?.getCurrentSlideIndex?document.getElementById('slide-'+instance.getCurrentSlideIndex()):document;
   button=slide?.querySelector('.h5p-question-check-answer');
  }
  if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||!button.getClientRects().length)return false;
  button.click();return true;
 }
 window.OriginalActivity={flush,command};
 if(api.LMSGetValue('cmi.core.lesson_status')==='not attempted')api.LMSSetValue('cmi.core.lesson_status','incomplete');
 H.externalDispatcher.on('xAPI',event=>{
  const statement=event.data?.statement,result=statement?.result;
  const child=!!statement?.context?.contextActivities?.parent||!!statement?.object?.definition?.extensions?.['http://h5p.org/x-api/h5p-subContentId'];
  if(!child&&result?.score&&/\/(answered|completed|passed|failed)$/.test(statement.verb?.id||'')){
   const raw=Number(result.score.raw),max=Number(result.score.max);
   const score=max>0&&Number.isFinite(raw)?raw/max*100:Number.isFinite(result.score.scaled)?result.score.scaled*100:null;
   if(score!==null){
    api.LMSSetValue('cmi.core.score.min','0');api.LMSSetValue('cmi.core.score.max','100');
    api.LMSSetValue('cmi.core.score.raw',String(Math.max(0,Math.min(100,score))));
    api.LMSSetValue('cmi.core.lesson_status',score>=70?'passed':'failed');
    flush();api.LMSCommit('');
   }
  }
  setTimeout(flush,0);
 });
 window.addEventListener('pagehide',()=>{flush();api.LMSFinish('');});
})();
