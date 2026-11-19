import test from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,dailyQuestions,evolutionStage,evolvedBuddy,dailyShare} from '../src/journey.js';
import {freshState,validateState,resetProgress,restoreProgress} from '../src/progress.js';
import {makeDailySession,restoreSession,finalizeSession} from '../src/session.js';
import {typesFor,LESSONS} from '../src/data.js';
test('Daily gym is deterministic, era legal, varied, and independent of timezone',()=>{
 for(const era of ['1','2','6'])for(const day of ['2026-11-16','2026-11-17']){
  const qs=dailyQuestions(era,day);assert.deepEqual(qs,dailyQuestions(era,day));assert.equal(qs.length,5);
  assert.deepEqual(qs.filter(q=>q.ds.length===1).map(q=>q.value).sort(),[0,.5,1,2].sort());
  for(const q of qs)assert.ok([q.a,...q.ds].every(t=>typesFor(era).includes(t)));
  const s=makeDailySession(era,Date.parse(day+'T23:59:59.999Z'));
  assert.equal(s.dailyDay,day);assert.deepEqual(s.questions,qs);assert.deepEqual(restoreSession(s),s);
 }
 assert.notDeepEqual(dailyQuestions('6','2026-11-16'),dailyQuestions('6','2026-11-17'));
 assert.equal(dayKey(Date.parse('2026-11-16T23:59:59Z')),'2026-11-16');
 assert.equal(dayKey(Date.parse('2026-11-17T00:00:00Z')),'2026-11-17');
 assert.throws(()=>dailyQuestions('6','2026-02-30'));
});
test('Daily first score survives replay, reload, export, reset and undo',()=>{
 const state=freshState(),b=state.eras['6'],s=makeDailySession('6');
 s.answers=s.questions.map(q=>({value:q.value,correct:true,assisted:false}));s.index=4;s.answered=true;
 finalizeSession(s,b);assert.equal(b.daily[s.dailyDay],5);assert.equal(restoreSession(s).finalized,true);
 s.finalized=false;s.answers=s.answers.map(a=>({...a,correct:false}));finalizeSession(s,b);assert.equal(b.daily[s.dailyDay],5);
 assert.equal(validateState(state).eras['6'].daily[s.dailyDay],5);
 const backup=resetProgress(state,'6','era');assert.deepEqual(state.eras['6'].daily,{});restoreProgress(state,backup);assert.equal(state.eras['6'].daily[s.dailyDay],5);
 assert.match(dailyShare(s.dailyDay,'6',5),/First completed attempt/);
 state.eras['6'].daily.bad=10;assert.throws(()=>validateState(state));
});
test('Starter evolution requires lessons and recall, and earned stages do not regress',()=>{
 const b=freshState().eras['6'];assert.equal(evolvedBuddy(7,b).name,'Squirtle');
 b.lessons=LESSONS.slice(0,2).map(l=>l.id);assert.equal(evolvedBuddy(7,b).name,'Wartortle');
 b.lessons=LESSONS.slice(0,5).map(l=>l.id);assert.equal(evolutionStage(b),1);
 b.records=Object.fromEntries(Array.from({length:10},(_,i)=>[i,{retained:true,streak:3}]));assert.equal(evolvedBuddy(7,b).name,'Blastoise');
 b.buddyStage=2;b.lessons=[];b.records={};assert.equal(evolvedBuddy(4,b).name,'Charizard');assert.equal(evolvedBuddy(25,b),null);
});

test('Daily snapshots reject changed questions, hinted answers and invalid dates',()=>{
 const s=makeDailySession('6');
 const bad=structuredClone(s);bad.questions[0].a=bad.questions[0].a==='Water'?'Fire':'Water';assert.throws(()=>restoreSession(bad));
 s.answers=[{value:s.questions[0].value,correct:true,assisted:true}];s.answered=true;assert.throws(()=>restoreSession(s));
 s.dailyDay='invalid';assert.throws(()=>restoreSession(s));
});
test('Older saves earn evolution milestones and lesson reset preserves them',()=>{
 const state=freshState();state.eras['6'].lessons=LESSONS.slice(0,2).map(l=>l.id);delete state.eras['6'].buddyStage;delete state.eras['6'].daily;
 const clean=validateState(state);assert.equal(clean.eras['6'].buddyStage,1);assert.deepEqual(clean.eras['6'].daily,{});
 resetProgress(clean,'6','lessons');assert.equal(evolutionStage(clean.eras['6']),1);assert.equal(clean.eras['1'].buddyStage,0);
});
