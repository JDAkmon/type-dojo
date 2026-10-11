import { ERAS, typesFor, pairsFor, dualEffectiveness, LESSONS } from './data.js';
import { matchupKey, normalizeKey } from './matchup.js';
export const STORAGE_KEY='type-dojo-v1';
const freshBucket=()=>({records:{},lessons:[],xp:0,days:[],challenge:null,battles:{attempts:0,correct:0}});
export const freshState=()=>({version:1,era:'6',eras:{'1':freshBucket(),'2':freshBucket(),'6':freshBucket()}});
export const CHALLENGE_SIZE=20;
export const CHALLENGE_PASS=16;
export function courseStatus(bucket,era){
  const available=LESSONS.filter(l=>lessonQuestions(l,era).length);
  const completed=available.filter(l=>bucket.lessons.includes(l.id));
  const next=available.find(l=>!bucket.lessons.includes(l.id))||null;
  return {available,completed,next,graduated:next===null};
}
export function recordChallenge(bucket,correct,now=Date.now()){
  if(!Number.isInteger(correct)||correct<0||correct>CHALLENGE_SIZE)throw new Error('Invalid challenge score.');
  const previous=bucket.challenge;
  bucket.challenge={attempts:(previous?.attempts||0)+1,bestCorrect:Math.max(previous?.bestCorrect||0,correct),lastCorrect:correct,lastAt:now,passedAt:previous?.passedAt??(correct>=CHALLENGE_PASS?now:null)};
  return bucket.challenge;
}
export function resetProgress(state,era,scope='lessons'){
  if(!ERAS[era]||!['lessons','era'].includes(scope))throw new Error('Choose a valid reset scope.');
  const backup={era,scope,bucket:structuredClone(state.eras[era])};
  if(scope==='lessons')state.eras[era].lessons=[];
  else state.eras[era]=freshState().eras[era];
  return backup;
}
export function validateResetBackup(backup){
  if(!backup||!ERAS[backup.era]||!['lessons','era'].includes(backup.scope))throw new Error('Invalid reset backup.');
  const check=freshState();check.eras[backup.era]=backup.bucket;
  const clean=validateState(check);
  return {era:backup.era,scope:backup.scope,bucket:clean.eras[backup.era]};
}
export function restoreProgress(state,snapshot){
  const backup=validateResetBackup(snapshot);
  if(backup.scope==='lessons')state.eras[backup.era].lessons=backup.bucket.lessons;
  else state.eras[backup.era]=backup.bucket;
}
export const RETENTION_GAP=12*60*60*1000;
export const mastered=r=>!!r&&r.streak>=3&&r.retained===true;
export const due=(r,now=Date.now())=>!!r&&(r.streak===0||r.due<=now);
export function recordAnswer(bucket,key,correct,assisted=false,now=Date.now(),evidence=null) {
  key=normalizeKey(key);
  const old=bucket.records[key]||{attempts:0,correct:0,streak:0,due:0};
  const streak=correct&&!assisted?old.streak+1:0;
  const retained=correct&&!assisted&&(old.retained===true||(old.streak>=2&&now-old.last>=RETENTION_GAP));
  const delay=[0,60000,600000,86400000,259200000,604800000][Math.min(streak,5)];
  const wrongAnswers={...old.wrongAnswers};
  const selected=evidence?.selected;
  if(!correct&&[0,.25,.5,1,2,4].includes(selected))wrongAnswers[selected]=(wrongAnswers[selected]||0)+1;
  const lastMistake=!correct&&evidence?{kind:evidence.kind==='move'?'move':'multiplier',selected:[0,.25,.5,1,2,4].includes(selected)?selected:null,betterType:typesFor('6').includes(evidence.betterType)?evidence.betterType:null,at:now}:old.lastMistake||null;
  bucket.records[key]={attempts:old.attempts+1,correct:old.correct+Number(correct),streak,due:now+delay,last:now,assisted:(old.assisted||0)+Number(assisted),retained,wrongAnswers,lastMistake,moveMisses:correct&&!assisted?0:(old.moveMisses||0)};
  bucket.xp+=correct?(assisted?4:10):2;
  const day=new Date(now).toLocaleDateString('en-CA');
  if(!bucket.days.includes(day)) bucket.days.push(day);
  return bucket.records[key];
}
export function stats(bucket,era,now=Date.now()) {
  const pairs=pairsFor(era),records=pairs.map(p=>bucket.records[p.key]).filter(Boolean);
  const attempted=Object.values(bucket.records).reduce((sum,r)=>sum+r.attempts,0);
  const correct=Object.values(bucket.records).reduce((sum,r)=>sum+r.correct,0);
  return {total:pairs.length,seen:records.length,mastered:records.filter(mastered).length,due:Object.values(bucket.records).filter(r=>due(r,now)).length,attempted,accuracy:attempted?Math.round(correct/attempted*100):0,xp:bucket.xp};
}
export function lessonQuestions(lesson,era) {
  const valid=typesFor(era);
  return lesson.pairs.filter(p=>p.every(t=>valid.includes(t))).map(([a,...ds])=>({a,ds,key:matchupKey(a,ds),value:dualEffectiveness(a,ds,era)}));
}
export function buildSession(mode,era,bucket,count=10,random=Math.random,now=Date.now()) {
  let pool=pairsFor(era);
  if(mode==='immunity'){
    if(count<=0)return [];
    const immune=pool.filter(p=>p.value===0);
    const zeroCount=Math.min(immune.length,count===1?(random()<.5?1:0):Math.ceil(count/2));
    const zeros=selectQuestions(immune,bucket,zeroCount,random,now);
    const contrasts=pool.filter(p=>p.value!==0&&immune.some(z=>z.a===p.a||z.ds[0]===p.ds[0]));
    const others=selectQuestions(contrasts,bucket,count-zeros.length,random,now);
    return shuffle([...zeros,...others],random);
  }
  if(mode==='review'){
    pool=Object.entries(bucket.records).filter(([,r])=>due(r,now)).map(([key])=>{const [a,def]=key.split('>'),ds=def.split('+');return {a,ds,key,value:dualEffectiveness(a,ds,era)};});
    const mistakes=recentMistakes(bucket,era,3),seeds=mistakes.map(m=>q=>q.key===m.key);
    for(const m of mistakes){
      if(m.record.lastMistake.kind!=='multiplier')continue;
      const contrast=pairsFor(era).find(q=>q.a===m.a&&q.value===m.record.lastMistake.selected&&q.key!==m.key);
      if(contrast&&!pool.some(q=>q.key===contrast.key)){pool.push(contrast);seeds.push(q=>q.key===contrast.key);}
    }
    return selectQuestions(pool,bucket,count,random,now,seeds);
  }
  if(mode==='dual') {
    const ts=typesFor(era);
    pool=ts.flatMap(a=>ts.flatMap((d,i)=>ts.slice(i+1).map(e=>({a,ds:[d,e],key:matchupKey(a,[d,e]),value:dualEffectiveness(a,[d,e],era)}))));
  }
  return selectQuestions(pool,bucket,count,random,now);
}
const shuffle=(questions,random)=>questions.map(p=>({p,order:random()})).sort((a,b)=>a.order-b.order).map(x=>x.p);
function selectQuestions(pool,bucket,count,random,now,seeds=[]){
  if(count<=0)return [];
  // Prioritize unseen, missed, and overdue cells, while sampling available outcomes.
  const ranked=pool.map(p=>{const r=bucket.records[p.key]; return {p,score:(!r?6:r.streak===0?12:due(r,now)?9:mastered(r)?0:3)+random()*3};}).sort((x,y)=>y.score-x.score);
  const choices=[],outcomes=[...new Set(pool.map(p=>p.value))];
  for(const predicate of seeds){if(choices.length>=count)break;if(choices.some(predicate))continue;const item=ranked.find(r=>predicate(r.p));if(item)choices.push(item.p);}
  for(const value of outcomes) { if(choices.some(p=>p.value===value))continue;const item=ranked.find(r=>r.p.value===value); if(item&&choices.length<count) choices.push(item.p); }
  for(const {p} of ranked) { if(choices.length>=count) break; if(!choices.includes(p)) choices.push(p); }
  return shuffle(choices,random);
}
export function studyPriorities(bucket,era,limit=3,now=Date.now()){
  const types=typesFor(era),totals=new Map(types.map(type=>[type,{type,attempts:0,misses:0,hints:0,learning:0,review:0,struggling:0}]));
  for(const [key,r] of Object.entries(bucket.records)){
    const [a,def]=key.split('>'),involved=[...new Set([a,...def.split('+')])];
    if((!r.attempts&&!r.moveMisses)||involved.some(t=>!totals.has(t)))continue;
    for(const type of involved){
      const item=totals.get(type);item.attempts+=r.attempts;
      if(!mastered(r)||r.moveMisses){item.misses+=r.attempts-r.correct+(r.moveMisses||0);item.hints+=r.assisted||0;item.learning++;if(r.streak===0||r.moveMisses)item.struggling++;}
      if(due(r,now))item.review++;
    }
  }
  return [...totals.values()].filter(t=>t.learning||t.review).map(t=>({
    ...t,reason:t.misses?'misses':t.hints?'hints':t.review?'review':'learning',
    tier:t.misses||t.hints?2:t.review?1:0,
    score:(t.misses+.35*t.hints)/(t.attempts+3)+.12*t.struggling+.04*t.review+.015*t.learning
  })).sort((a,b)=>b.tier-a.tier||b.score-a.score||types.indexOf(a.type)-types.indexOf(b.type)).slice(0,limit);
}
export function buildStudySession(era,bucket,count=6,random=Math.random,now=Date.now()){
  const priorities=studyPriorities(bucket,era,3,now);
  if(!priorities.length){
    const started=Object.values(bucket.records).some(r=>r.attempts>0);
    return started?buildSession('attack',era,bucket,count,random,now):selectQuestions(lessonQuestions(LESSONS[0],era),bucket,count,random,now);
  }
  const focus=new Set(priorities.map(p=>p.type));
  const relevant=q=>[q.a,...q.ds].some(t=>focus.has(t));
  const pool=pairsFor(era).filter(relevant);
  // Also revisit previously attempted dual types; never invent advanced questions for a beginner.
  for(const key of Object.keys(bucket.records)){
    const [a,def]=key.split('>'),ds=def.split('+');
    if(ds.length===2&&relevant({a,ds}))pool.push({a,ds,key,value:dualEffectiveness(a,ds,era)});
  }
  const mistakes=recentMistakes(bucket,era,Math.min(3,Math.ceil(count/2)));
  for(const m of mistakes)if(!pool.some(q=>q.key===m.key))pool.push({a:m.a,ds:m.ds,key:m.key,value:m.value});
  for(const m of mistakes){
    if(m.record.lastMistake?.kind!=='multiplier')continue;
    const contrast=pairsFor(era).find(q=>q.a===m.a&&q.value===m.record.lastMistake.selected&&q.key!==m.key);
    if(contrast&&!pool.some(q=>q.key===contrast.key))pool.push(contrast);
  }
  const seeds=mistakes.map(m=>q=>q.key===m.key);
  // Pair an exact mistake with a lookalike matching the answer the learner chose.
  for(const m of mistakes){if(m.record.lastMistake?.kind!=='multiplier')continue;const wrong=m.record.lastMistake.selected;seeds.push(q=>q.key!==m.key&&q.a===m.a&&q.value===wrong);}
  return selectQuestions(pool,bucket,count,random,now,[...seeds,...priorities.map(p=>q=>q.a===p.type||q.ds.includes(p.type))]);
}
export function recentMistakes(bucket,era,limit=3){
  const ts=typesFor(era);
  return Object.entries(bucket.records).filter(([,r])=>(r.streak===0||r.moveMisses)&&r.lastMistake).sort((a,b)=>b[1].lastMistake.at-a[1].lastMistake.at).map(([key,record])=>{const [a,def]=key.split('>'),ds=def.split('+');return {key,a,ds,value:dualEffectiveness(a,ds,era),record};}).filter(q=>[q.a,...q.ds].every(t=>ts.includes(t))).slice(0,limit);
}
export function validateState(value) {
  if(!value||value.version!==1||!ERAS[value.era]||!value.eras) throw new Error('This is not a Type Dojo backup.');
  for(const era of Object.keys(ERAS)) {
    const bucket=value.eras[era],ts=typesFor(era);
    if(!bucket||!bucket.records||typeof bucket.records!=='object'||Array.isArray(bucket.records)||!Array.isArray(bucket.lessons)||!Array.isArray(bucket.days)||!Number.isSafeInteger(bucket.xp)||bucket.xp<0) throw new Error('Invalid progress data.');
    if(bucket.lessons.some(id=>!LESSONS.some(l=>l.id===id))||bucket.days.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error('Invalid lesson or activity data.');
    const c=bucket.challenge;
    const battles=bucket.battles;
    if(battles!=null&&(!Number.isSafeInteger(battles.attempts)||battles.attempts<0||!Number.isSafeInteger(battles.correct)||battles.correct<0||battles.correct>battles.attempts))throw new Error('Invalid move battle history.');
    if(c!=null&&(!Number.isSafeInteger(c.attempts)||c.attempts<1||!Number.isInteger(c.bestCorrect)||c.bestCorrect<0||c.bestCorrect>CHALLENGE_SIZE||!Number.isInteger(c.lastCorrect)||c.lastCorrect<0||c.lastCorrect>c.bestCorrect||!Number.isFinite(c.lastAt)||c.lastAt<0||(c.passedAt!==null&&(!Number.isFinite(c.passedAt)||c.passedAt<0||c.passedAt>c.lastAt||c.bestCorrect<CHALLENGE_PASS))))throw new Error('Invalid challenge history.');
    for(const [key,r] of Object.entries(bucket.records)) {
      const [a,def,...extra]=key.split('>'),ds=(def||'').split('+');
      if(extra.length||!ts.includes(a)||ds.length>2||new Set(ds).size!==ds.length||ds.some(d=>!ts.includes(d))||!r||['attempts','correct','streak'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.correct>r.attempts||r.streak>r.correct||['due','last'].some(k=>!Number.isFinite(r[k])||r[k]<0)) throw new Error('Invalid matchup record.');
      if(r.retained!==undefined&&typeof r.retained!=='boolean')throw new Error('Invalid recall history.');
      if(r.moveMisses!==undefined&&(!Number.isSafeInteger(r.moveMisses)||r.moveMisses<0))throw new Error('Invalid move mistake count.');
      if(r.wrongAnswers!==undefined&&(!r.wrongAnswers||typeof r.wrongAnswers!=='object'||Array.isArray(r.wrongAnswers)||Object.entries(r.wrongAnswers).some(([v,n])=>![0,.25,.5,1,2,4].includes(Number(v))||!Number.isSafeInteger(n)||n<0)||Object.values(r.wrongAnswers).reduce((s,n)=>s+n,0)>r.attempts-r.correct))throw new Error('Invalid mistake history.');
      const m=r.lastMistake;
      if(m!=null&&(!['multiplier','move'].includes(m.kind)||(m.selected!==null&&![0,.25,.5,1,2,4].includes(m.selected))||(m.betterType!==null&&!ts.includes(m.betterType))||!Number.isFinite(m.at)||m.at<0||m.at>r.last))throw new Error('Invalid last mistake.');
    }
  }
  // Copy only known fields to avoid using unexpected backup properties.
  const clean=freshState(); clean.era=value.era;
  for(const era of Object.keys(ERAS)) {
    const b=value.eras[era];
    const records={};
    for(const [key,r] of Object.entries(b.records)){
      const k=normalizeKey(key),m=r.lastMistake;
      // Preserve mastery earned before delayed recall was introduced. New records opt in explicitly.
      const next={attempts:r.attempts,correct:r.correct,streak:r.streak,due:r.due,last:r.last,assisted:Number.isSafeInteger(r.assisted)&&r.assisted>=0?r.assisted:0,retained:r.retained??r.streak>=3,wrongAnswers:{...r.wrongAnswers},lastMistake:m?{kind:m.kind,selected:m.selected,betterType:m.betterType,at:m.at}:null,moveMisses:r.moveMisses||0};
      const previous=records[k];
      if(!previous){records[k]=next;continue;}
      const latest=next.last>=previous.last?next:previous,wrongAnswers={...previous.wrongAnswers};
      for(const [v,n] of Object.entries(next.wrongAnswers))wrongAnswers[v]=(wrongAnswers[v]||0)+n;
      const lastMistake=[previous.lastMistake,next.lastMistake].filter(Boolean).sort((x,y)=>y.at-x.at)[0]||null;
      records[k]={...latest,attempts:previous.attempts+next.attempts,correct:previous.correct+next.correct,assisted:previous.assisted+next.assisted,due:Math.min(previous.due,next.due),wrongAnswers,lastMistake,moveMisses:previous.moveMisses+next.moveMisses};
    }
    clean.eras[era]={xp:b.xp,lessons:[...new Set(b.lessons)],days:[...new Set(b.days)],challenge:b.challenge?{attempts:b.challenge.attempts,bestCorrect:b.challenge.bestCorrect,lastCorrect:b.challenge.lastCorrect,lastAt:b.challenge.lastAt,passedAt:b.challenge.passedAt}:null,battles:b.battles?{attempts:b.battles.attempts,correct:b.battles.correct}:{attempts:0,correct:0},records};
  }
  return clean;
}
