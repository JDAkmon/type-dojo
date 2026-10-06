import { ERAS, typesFor, pairsFor, dualEffectiveness, LESSONS } from './data.js';
export const STORAGE_KEY='type-dojo-v1';
const freshBucket=()=>({records:{},lessons:[],xp:0,days:[],challenge:null});
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
export const mastered=r=>!!r&&r.streak>=3;
export const due=(r,now=Date.now())=>!!r&&(r.streak===0||r.due<=now);
export function recordAnswer(bucket,key,correct,assisted=false,now=Date.now()) {
  const old=bucket.records[key]||{attempts:0,correct:0,streak:0,due:0};
  const streak=correct&&!assisted?old.streak+1:0;
  const delay=[0,60000,600000,86400000,259200000,604800000][Math.min(streak,5)];
  bucket.records[key]={attempts:old.attempts+1,correct:old.correct+Number(correct),streak,due:now+delay,last:now,assisted:(old.assisted||0)+Number(assisted)};
  bucket.xp+=correct?(assisted?4:10):2;
  const day=new Date(now).toLocaleDateString('en-CA');
  if(!bucket.days.includes(day)) bucket.days.push(day);
  return bucket.records[key];
}
export function stats(bucket,era,now=Date.now()) {
  const pairs=pairsFor(era),records=pairs.map(p=>bucket.records[p.key]).filter(Boolean);
  const attempted=Object.values(bucket.records).reduce((sum,r)=>sum+r.attempts,0);
  const correct=Object.values(bucket.records).reduce((sum,r)=>sum+r.correct,0);
  return {total:pairs.length,seen:records.length,mastered:records.filter(mastered).length,due:pairs.filter(p=>due(bucket.records[p.key],now)).length,attempted,accuracy:attempted?Math.round(correct/attempted*100):0,xp:bucket.xp};
}
export function lessonQuestions(lesson,era) {
  const valid=typesFor(era);
  return lesson.pairs.filter(p=>p.every(t=>valid.includes(t))).map(([a,...ds])=>({a,ds,key:`${a}>${ds.join('+')}`,value:dualEffectiveness(a,ds,era)}));
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
  if(mode==='review') pool=pool.filter(p=>due(bucket.records[p.key],now));
  if(mode==='dual') {
    const ts=typesFor(era);
    pool=ts.flatMap(a=>ts.flatMap((d,i)=>ts.slice(i+1).map(e=>({a,ds:[d,e],key:`${a}>${d}+${e}`,value:dualEffectiveness(a,[d,e],era)}))));
  }
  return selectQuestions(pool,bucket,count,random,now);
}
const shuffle=(questions,random)=>questions.map(p=>({p,order:random()})).sort((a,b)=>a.order-b.order).map(x=>x.p);
function selectQuestions(pool,bucket,count,random,now,seeds=[]){
  if(count<=0)return [];
  // Prioritize unseen, missed, and overdue cells, while sampling available outcomes.
  const ranked=pool.map(p=>{const r=bucket.records[p.key]; return {p,score:(!r?6:r.streak===0?9:due(r,now)?7:mastered(r)?0:3)+random()*3};}).sort((x,y)=>y.score-x.score);
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
    if(!r.attempts||involved.some(t=>!totals.has(t)))continue;
    for(const type of involved){
      const item=totals.get(type);item.attempts+=r.attempts;
      if(!mastered(r)){item.misses+=r.attempts-r.correct;item.hints+=r.assisted||0;item.learning++;if(r.streak===0)item.struggling++;}
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
  return selectQuestions(pool,bucket,count,random,now,priorities.map(p=>q=>q.a===p.type||q.ds.includes(p.type)));
}
export function validateState(value) {
  if(!value||value.version!==1||!ERAS[value.era]||!value.eras) throw new Error('This is not a Type Dojo backup.');
  for(const era of Object.keys(ERAS)) {
    const bucket=value.eras[era],ts=typesFor(era);
    if(!bucket||!bucket.records||typeof bucket.records!=='object'||Array.isArray(bucket.records)||!Array.isArray(bucket.lessons)||!Array.isArray(bucket.days)||!Number.isSafeInteger(bucket.xp)||bucket.xp<0) throw new Error('Invalid progress data.');
    if(bucket.lessons.some(id=>!LESSONS.some(l=>l.id===id))||bucket.days.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error('Invalid lesson or activity data.');
    const c=bucket.challenge;
    if(c!=null&&(!Number.isSafeInteger(c.attempts)||c.attempts<1||!Number.isInteger(c.bestCorrect)||c.bestCorrect<0||c.bestCorrect>CHALLENGE_SIZE||!Number.isInteger(c.lastCorrect)||c.lastCorrect<0||c.lastCorrect>c.bestCorrect||!Number.isFinite(c.lastAt)||c.lastAt<0||(c.passedAt!==null&&(!Number.isFinite(c.passedAt)||c.passedAt<0||c.passedAt>c.lastAt||c.bestCorrect<CHALLENGE_PASS))))throw new Error('Invalid challenge history.');
    for(const [key,r] of Object.entries(bucket.records)) {
      const [a,def,...extra]=key.split('>'),ds=(def||'').split('+');
      if(extra.length||!ts.includes(a)||ds.length>2||new Set(ds).size!==ds.length||ds.some(d=>!ts.includes(d))||!r||['attempts','correct','streak'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.correct>r.attempts||r.streak>r.correct||['due','last'].some(k=>!Number.isFinite(r[k])||r[k]<0)) throw new Error('Invalid matchup record.');
    }
  }
  // Copy only known fields to avoid using unexpected backup properties.
  const clean=freshState(); clean.era=value.era;
  for(const era of Object.keys(ERAS)) {
    const b=value.eras[era];
    clean.eras[era]={xp:b.xp,lessons:[...new Set(b.lessons)],days:[...new Set(b.days)],challenge:b.challenge?{attempts:b.challenge.attempts,bestCorrect:b.challenge.bestCorrect,lastCorrect:b.challenge.lastCorrect,lastAt:b.challenge.lastAt,passedAt:b.challenge.passedAt}:null,records:Object.fromEntries(Object.entries(b.records).map(([k,r])=>[k,{attempts:r.attempts,correct:r.correct,streak:r.streak,due:r.due,last:r.last,assisted:Number.isSafeInteger(r.assisted)&&r.assisted>=0?r.assisted:0}]))};
  }
  return clean;
}
