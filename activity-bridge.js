/* A private SCORM 1.2 session for each original activity. It never calls the LMS API. */
(function(root){
 'use strict';
 class ActivitySession {
  constructor(options={}) {
   this.active=false;this.ended=false;this.error='0';this.review=!!options.review;this.onSave=options.onSave||(()=>{});
   this.values=Object.create(null);
   const source=options.values||{};
   for(const [key,value] of Object.entries(source))if(/^cmi\.[a-zA-Z0-9_.]+$/.test(key)&&typeof value==='string'&&value.length<=64000)this.values[key]=value;
   const resume=Object.keys(this.values).length>0;
   Object.assign(this.values,{
    'cmi.core.student_id':options.learnerId||'learner','cmi.core.student_name':'',
    'cmi.core.entry':resume?'resume':'ab-initio','cmi.core.lesson_mode':this.review?'review':'normal',
    'cmi.core.credit':'credit','cmi.core.session_time':'0000:00:00.00',
    'cmi.student_data.mastery_score':'70','cmi.student_data.max_time_allowed':'',
    'cmi.student_data.time_limit_action':'continue,no message'
   });
   for(const [key,value] of Object.entries({'cmi.core.lesson_status':'not attempted','cmi.core.lesson_location':'','cmi.core.total_time':'0000:00:00.00','cmi.suspend_data':'','cmi.launch_data':'','cmi.interactions._count':'0','cmi.objectives._count':'0','cmi.core.score.min':'0','cmi.core.score.max':'100'}))if(!(key in this.values))this.values[key]=value;
   this.api={LMSInitialize:v=>this.initialize(v),LMSGetValue:k=>this.get(k),LMSSetValue:(k,v)=>this.set(k,v),LMSCommit:()=>this.commit(),LMSFinish:()=>this.finish(),LMSGetLastError:()=>this.error,LMSGetErrorString:code=>({'0':'No error','101':'General exception','201':'Invalid argument','301':'Not initialized','405':'Data model value out of range'}[code]||'General exception'),LMSGetDiagnostic:code=>String(code||this.error)};
  }
  fail(code){this.error=code;return'false'}
  initialize(arg){if(arg!==''&&arg!==undefined)return this.fail('201');if(this.active||this.ended)return this.fail('101');this.active=true;this.error='0';return'true'}
  get(key){if(!this.active){this.error='301';return''}this.error='0';if(key==='cmi.core._children')return'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time';if(key==='cmi.core.score._children')return'raw,min,max';return this.values[key]||''}
  set(key,value){
   if(!this.active)return this.fail('301');if(!/^cmi\.[a-zA-Z0-9_.]+$/.test(key))return this.fail('201');
   value=String(value);if(value.length>64000)return this.fail('405');
   if(this.review){this.error='0';return'true'}
   if(this.values[key]===value){this.error='0';return'true'}
   this.values[key]=value;
   const count=/^cmi\.(interactions|objectives)\.(\d+)\./.exec(key);
   if(count)this.values['cmi.'+count[1]+'._count']=String(Math.max(Number(this.values['cmi.'+count[1]+'._count'])||0,Number(count[2])+1));
   this.error='0';this.onSave(this.snapshot(),'change');return'true';
  }
  snapshot(){
   const raw=this.values['cmi.core.score.raw'],min=Number(this.values['cmi.core.score.min']||0),max=Number(this.values['cmi.core.score.max']||100);
   const score=raw!==undefined&&raw!==''&&Number.isFinite(Number(raw))?Math.round(Math.max(0,Math.min(100,max>min?(Number(raw)-min)/(max-min)*100:Number(raw)))):null;
   const status=this.values['cmi.core.lesson_status'];
   return{values:{...this.values},score,complete:['completed','passed','failed'].includes(status),passed:status==='passed',status};
  }
  commit(){if(!this.active)return this.fail('301');this.error='0';if(!this.review)this.onSave(this.snapshot(),'commit');return'true'}
  finish(){if(!this.active)return this.fail('301');this.commit();this.active=false;this.ended=true;this.error='0';return'true'}
 }
 root.ActivitySession=ActivitySession;if(typeof module!=='undefined')module.exports={ActivitySession};
})(typeof window!=='undefined'?window:globalThis);
