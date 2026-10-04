import { ERAS, typesFor, pairsFor, dualEffectiveness, LESSONS } from './data.js';
export const STORAGE_KEY='type-dojo-v1';
export const freshState=()=>({version:1,era:'6',eras:{'1':{records:{},lessons:[],xp:0,days:[]},'2':{records:{},lessons:[],xp:0,days:[]},'6':{records:{},lessons:[],xp:0,days:[]}}});
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
  if(mode==='immunity') pool=pool.filter(p=>p.value===0);
  if(mode==='review') pool=pool.filter(p=>due(bucket.records[p.key],now));
  if(mode==='dual') {
    const ts=typesFor(era);
    pool=ts.flatMap(a=>ts.flatMap((d,i)=>ts.slice(i+1).map(e=>({a,ds:[d,e],key:`${a}>${d}+${e}`,value:dualEffectiveness(a,[d,e],era)}))));
  }
  // Prioritize unseen, missed, and overdue cells, while sampling each available outcome.
  const ranked=pool.map(p=>{const r=bucket.records[p.key]; return {p,score:(!r?6:r.streak===0?9:due(r,now)?7:mastered(r)?0:3)+random()*3};}).sort((x,y)=>y.score-x.score);
  const choices=[],outcomes=[...new Set(pool.map(p=>p.value))];
  for(const value of outcomes) { const item=ranked.find(r=>r.p.value===value); if(item&&choices.length<count) choices.push(item.p); }
  for(const {p} of ranked) { if(choices.length>=count) break; if(!choices.includes(p)) choices.push(p); }
  return choices.map(p=>({p,order:random()})).sort((a,b)=>a.order-b.order).map(x=>x.p);
}
export function validateState(value) {
  if(!value||value.version!==1||!ERAS[value.era]||!value.eras) throw new Error('This is not a Type Dojo backup.');
  for(const era of Object.keys(ERAS)) {
    const bucket=value.eras[era],ts=typesFor(era);
    if(!bucket||!bucket.records||typeof bucket.records!=='object'||Array.isArray(bucket.records)||!Array.isArray(bucket.lessons)||!Array.isArray(bucket.days)||!Number.isSafeInteger(bucket.xp)||bucket.xp<0) throw new Error('Invalid progress data.');
    if(bucket.lessons.some(id=>!LESSONS.some(l=>l.id===id))||bucket.days.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error('Invalid lesson or activity data.');
    for(const [key,r] of Object.entries(bucket.records)) {
      const [a,def,...extra]=key.split('>'),ds=(def||'').split('+');
      if(extra.length||!ts.includes(a)||ds.length>2||new Set(ds).size!==ds.length||ds.some(d=>!ts.includes(d))||!r||['attempts','correct','streak'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.correct>r.attempts||r.streak>r.correct||['due','last'].some(k=>!Number.isFinite(r[k])||r[k]<0)) throw new Error('Invalid matchup record.');
    }
  }
  // Copy only known fields to avoid using unexpected backup properties.
  const clean=freshState(); clean.era=value.era;
  for(const era of Object.keys(ERAS)) {
    const b=value.eras[era];
    clean.eras[era]={xp:b.xp,lessons:[...new Set(b.lessons)],days:[...new Set(b.days)],records:Object.fromEntries(Object.entries(b.records).map(([k,r])=>[k,{attempts:r.attempts,correct:r.correct,streak:r.streak,due:r.due,last:r.last,assisted:Number.isSafeInteger(r.assisted)&&r.assisted>=0?r.assisted:0}]))};
  }
  return clean;
}
