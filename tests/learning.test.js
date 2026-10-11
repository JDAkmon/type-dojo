import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS} from '../src/data.js';
import {matchupKey} from '../src/matchup.js';
import {freshState,recordAnswer,validateState,mastered,RETENTION_GAP,lessonQuestions,buildSession,buildStudySession,recentMistakes,stats} from '../src/progress.js';
import {mistakeExplanation} from '../src/battles.js';

test('Defender order shares keys across lessons, practice, answering, backups, and due review',()=>{
  assert.equal(matchupKey('Fire',['Water','Grass']),matchupKey('Fire',['Grass','Water']));
  const b=freshState().eras['6'];
  const lesson=lessonQuestions(LESSONS.find(l=>l.id==='dual'),'6').find(q=>q.a==='Fire'&&q.ds.includes('Water'));
  const pool=buildSession('dual','6',b,3000,()=>.5);
  assert.ok(pool.some(q=>q.key===lesson.key));
  recordAnswer(b,'Fire>Water+Grass',false,false,1000,{selected:2});
  recordAnswer(b,'Fire>Grass+Water',true,false,2000);
  assert.equal(Object.keys(b.records).length,1);assert.equal(b.records[lesson.key].attempts,2);
  const review=buildSession('review','6',b,10,()=>.5,100000);
  assert.ok(review.some(q=>q.key===lesson.key));assert.equal(stats(b,'6',100000).due,1);
});

test('Old reversed dual records merge totals, keep latest streak, preserve XP and earned legacy mastery',()=>{
  const s=freshState(),b=s.eras['6'];
  b.xp=44;b.lessons=['basics'];
  b.records['Fire>Water+Grass']={attempts:4,correct:3,streak:3,last:1000,due:5000,assisted:0};
  b.records['Fire>Grass+Water']={attempts:2,correct:1,streak:0,last:2000,due:2000,assisted:1};
  b.records['Water>Fire']={attempts:3,correct:3,streak:3,last:500,due:9000};
  delete b.battles;
  const clean=validateState(s),record=clean.eras['6'].records['Fire>Grass+Water'];
  assert.equal(Object.keys(clean.eras['6'].records).length,2);
  assert.equal(record.attempts,6);assert.equal(record.correct,4);assert.equal(record.streak,0);assert.equal(record.assisted,1);assert.equal(record.due,2000);
  assert.equal(clean.eras['6'].xp,44);assert.deepEqual(clean.eras['6'].lessons,['basics']);
  assert.equal(mastered(clean.eras['6'].records['Water>Fire']),true);
  assert.deepEqual(validateState(clean),clean);
});

test('Rapid repeats cannot grant mastery and delayed recall must follow two unaided successes',()=>{
  const b=freshState().eras['6'];
  recordAnswer(b,'Water>Fire',true,false,0);
  recordAnswer(b,'Water>Fire',true,false,1);
  let r=recordAnswer(b,'Water>Fire',true,false,RETENTION_GAP);
  assert.equal(mastered(r),false);
  r=recordAnswer(b,'Water>Fire',true,false,2*RETENTION_GAP);assert.equal(mastered(r),true);
  recordAnswer(b,'Water>Fire',true,true,2*RETENTION_GAP+1);assert.equal(mastered(b.records['Water>Fire']),false);
  r=recordAnswer(b,'Water>Fire',true,false,3*RETENTION_GAP);assert.equal(r.retained,false);
  assert.deepEqual(validateState({...freshState(),eras:{...freshState().eras,'6':b}}).eras['6'],b);
});

test('Exact wrong multipliers survive backups and focus/review add useful contrasts',()=>{
  const s=freshState(),b=s.eras['6'];
  recordAnswer(b,'Electric>Ground',false,false,1000,{selected:2});
  recordAnswer(b,'Electric>Ground',false,false,1001,{selected:2});
  const clean=validateState(s),r=clean.eras['6'].records['Electric>Ground'];
  assert.equal(r.wrongAnswers[2],2);assert.equal(r.lastMistake.selected,2);
  for(const qs of [buildStudySession('6',b,6,()=>.5,1002),buildSession('review','6',b,10,()=>.5,1002)]){
    assert.ok(qs.some(q=>q.key==='Electric>Ground'));
    assert.ok(qs.some(q=>q.a==='Electric'&&q.value===2));
    assert.equal(qs.length,new Set(qs.map(q=>q.key)).size);
  }
  assert.equal(recentMistakes(b,'6').length,1);
  assert.match(mistakeExplanation({a:'Electric',ds:['Ground'],value:0},2,'6'),/blocks Electric/);
  recordAnswer(b,'Electric>Ground',true,false,2000);assert.deepEqual(recentMistakes(b,'6'),[]);
  const bad=structuredClone(clean);bad.eras['6'].records['Electric>Ground'].wrongAnswers[2]=999;assert.throws(()=>validateState(bad));
});
test('Focus includes recent exact mistakes even when older problems dominate the priority types',()=>{
  const b=freshState().eras['6'];
  for(let i=0;i<10;i++){recordAnswer(b,'Ghost>Poison',false,false,100+i);recordAnswer(b,'Ghost>Normal',false,false,200+i);}
  const keys=['Ground>Grass','Electric>Water','Ice>Dragon'];
  keys.forEach((key,i)=>recordAnswer(b,key,false,false,1000+i,{selected:1}));
  const qs=buildStudySession('6',b,6,()=>.5,1003);
  for(const key of keys)assert.ok(qs.some(q=>q.key===key),key);
  assert.equal(new Set(qs.map(q=>q.key)).size,6);
});
