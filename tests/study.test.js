import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS,typesFor,dualEffectiveness,pairsFor} from '../src/data.js';
import {freshState,recordAnswer,buildSession,buildStudySession,studyPriorities,courseStatus,recordChallenge,validateState,resetProgress,restoreProgress} from '../src/progress.js';

test('Immunity detective mixes zero and nonzero outcomes without repeats in every era',()=>{
  for(const era of ['1','2','6'])for(const count of [2,4,6,10,20])for(const seed of [.01,.3,.9]){
    const questions=buildSession('immunity',era,freshState().eras[era],count,()=>seed);
    assert.equal(questions.length,count);assert.equal(new Set(questions.map(q=>q.key)).size,count);
    assert.ok(questions.some(q=>q.value===0));assert.ok(questions.some(q=>q.value!==0));
    for(const q of questions)assert.equal(q.value,dualEffectiveness(q.a,q.ds,era));
    if(count===10){assert.equal(questions.filter(q=>q.value===0).length,5);assert.deepEqual([...new Set(questions.filter(q=>q.value!==0).map(q=>q.value))].sort(),[.5,1,2].sort());}
  }
  assert.deepEqual(buildSession('immunity','6',freshState().eras['6'],0),[]);
});
test('Graduation counts only available chapters and never sends a graduate to lesson one',()=>{
  const s=freshState();
  for(const era of ['1','2','6']){
    const b=s.eras[era];assert.equal(courseStatus(b,era).next.id,LESSONS[0].id);
    b.lessons=LESSONS.filter(l=>l.id!=='dual').map(l=>l.id);
    assert.equal(courseStatus(b,era).graduated,false);assert.equal(courseStatus(b,era).next.id,'dual');
    b.lessons.push('dual');const status=courseStatus(b,era);
    assert.equal(status.graduated,true);assert.equal(status.next,null);
    assert.equal(status.completed.length,era==='1'?5:6);
  }
});
test('Study priorities use actual mistakes and hints, include both attack and defense, and stay within an era',()=>{
  const s=freshState(),b=s.eras['6'];
  recordAnswer(b,'Electric>Ground',false,false,1000);
  recordAnswer(b,'Psychic>Dark',true,true,1000);
  recordAnswer(s.eras['1'],'Bug>Poison',false,false,1000);
  const focus=studyPriorities(b,'6',3,1001);
  assert.equal(focus.length,3);assert.equal(new Set(focus.map(x=>x.type)).size,3);
  assert.ok(focus.some(x=>x.type==='Electric'));assert.ok(focus.some(x=>x.type==='Ground'));
  assert.ok(focus.some(x=>x.reason==='hints'));assert.ok(!focus.some(x=>x.type==='Bug'||x.type==='Poison'));
  const related=studyPriorities(s.eras['1'],'1',3,1001);assert.deepEqual(related.map(x=>x.type).sort(),['Bug','Poison']);
});
test('Fresh learners get familiar starter practice, while focus sessions cover their priorities and revisit hard dual types',()=>{
  for(const era of ['1','2','6']){
    const b=freshState().eras[era];assert.deepEqual(studyPriorities(b,era),[]);
    const first=buildStudySession(era,b,6,()=>.5,1000);assert.equal(first.length,6);
    assert.ok(first.every(q=>q.ds.length===1&&[q.a,...q.ds].every(t=>['Water','Fire','Grass'].includes(t))));
    recordAnswer(b,'Electric>Ground',false,false,1000);
    recordAnswer(b,'Rock>Fire+Flying',false,false,1000);
    const focus=studyPriorities(b,era,3,1001),session=buildStudySession(era,b,6,()=>.5,1001);
    assert.equal(new Set(session.map(q=>q.key)).size,6);
    for(const p of focus)assert.ok(session.some(q=>q.a===p.type||q.ds.includes(p.type)),p.type);
    assert.ok(session.some(q=>q.key==='Electric>Ground'));
    assert.ok(session.some(q=>q.key==='Rock>Fire+Flying'));
    for(const q of session)assert.ok([q.a,...q.ds].every(t=>typesFor(era).includes(t)));
  }
});
test('Mastered, up-to-date types leave the study priorities, and overdue refreshers return',()=>{
  const b=freshState().eras['6'];recordAnswer(b,'Water>Fire',false,false,1000);
  for(let i=0;i<3;i++)recordAnswer(b,'Water>Fire',true,false,2000+i);
  assert.deepEqual(studyPriorities(b,'6',3,3000),[]);
  const refresh=studyPriorities(b,'6',3,2002+86400000);assert.equal(refresh.length,2);
  assert.ok(refresh.every(p=>p.reason==='review'&&p.misses===0));
  for(const q of pairsFor('6'))for(let i=0;i<3;i++)recordAnswer(b,q.key,true,false,4000+i);
  assert.equal(buildStudySession('6',b,6,()=>.5,5000).length,6);
});
test('Challenge badges require 16/20, persist by era, and keep the best score after a later miss',()=>{
  const s=freshState(),b=s.eras['6'];recordChallenge(b,15,1000);assert.equal(b.challenge.passedAt,null);
  recordChallenge(b,16,2000);assert.equal(b.challenge.passedAt,2000);
  recordChallenge(b,10,3000);assert.equal(b.challenge.bestCorrect,16);assert.equal(b.challenge.lastCorrect,10);assert.equal(b.challenge.attempts,3);assert.equal(b.challenge.passedAt,2000);
  assert.equal(s.eras['1'].challenge,null);assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
  const backup=resetProgress(s,'6','lessons');assert.equal(b.challenge.bestCorrect,16);restoreProgress(s,backup);
  const all=resetProgress(s,'6','era');assert.equal(s.eras['6'].challenge,null);restoreProgress(s,all);assert.equal(s.eras['6'].challenge.bestCorrect,16);
});
test('Old backups migrate without losing progress or inventing badges, and corrupt challenge scores are rejected',()=>{
  const old=freshState();recordAnswer(old.eras['6'],'Water>Fire',true,false,1000);
  for(const b of Object.values(old.eras))delete b.challenge;
  const migrated=validateState(old);assert.equal(migrated.eras['6'].xp,10);assert.equal(migrated.eras['6'].challenge,null);
  const bad=freshState();bad.eras['6'].challenge={attempts:1,bestCorrect:21,lastCorrect:21,lastAt:1000,passedAt:1000};assert.throws(()=>validateState(bad));
  assert.throws(()=>recordChallenge(migrated.eras['6'],21));
});
