import test from 'node:test';
import assert from 'node:assert/strict';
import {LESSONS} from '../src/data.js';
import {freshState,lessonQuestions,buildSession} from '../src/progress.js';
import {buildMoveSession} from '../src/battles.js';
import {makeSession,finalizeSession,restoreSession} from '../src/session.js';

const answer = q => ({value:q.value,correct:true,assisted:false});

test('Lesson credit is committed on the final answer, once, with the unaided threshold',()=>{
  for(const assisted of [2,3]){
    const bucket=freshState().eras['6'],qs=lessonQuestions(LESSONS[0],'6');
    const s=makeSession('lesson','6',qs,'basics');
    s.answers=qs.slice(0,-1).map(answer);
    assert.equal(finalizeSession(s,bucket),false);assert.deepEqual(bucket.lessons,[]);
    s.answers.push(answer(qs.at(-1)));
    s.answers.slice(0,assisted).forEach(a=>a.assisted=true);
    assert.equal(finalizeSession(s,bucket),true);
    assert.deepEqual(bucket.lessons,assisted===2?['basics']:[]);
    assert.equal(finalizeSession(s,bucket),false);
  }
});

test('Challenge credit survives reload on the last feedback without counting another attempt',()=>{
  const bucket=freshState().eras['6'];
  const qs=[...buildSession('attack','6',bucket,14),...buildSession('dual','6',bucket,6)];
  const s=makeSession('challenge','6',qs);
  s.answers=qs.map(answer);s.index=19;s.answered=true;
  finalizeSession(s,bucket,1000);
  assert.equal(bucket.challenge.bestCorrect,20);assert.equal(bucket.challenge.passedAt,1000);
  const restored=restoreSession(JSON.parse(JSON.stringify(s)));
  assert.equal(finalizeSession(restored,bucket,2000),false);
  assert.equal(bucket.challenge.attempts,1);
});

test('Partial quizzes preserve question order, hints, answers, and type focus',()=>{
  const focused=lessonQuestions(LESSONS[0],'6').filter(q=>q.a==='Water');
  const s=makeSession('attack','6',focused,null,'Water');
  s.answers=[answer(focused[0])];s.index=1;s.hint=true;
  assert.deepEqual(restoreSession(JSON.parse(JSON.stringify(s))),s);
  assert.throws(()=>restoreSession({...s,index:99}));
  assert.throws(()=>restoreSession({...s,focusType:'Fire'}));
  assert.throws(()=>restoreSession({...s,era:'__proto__'}));
});

test('Restored move battles use trusted learnsets and reject unknown or duplicate options',()=>{
  for(const era of ['1','2','6']){
    const s=makeSession('moves',era,buildMoveSession(era,freshState().eras[era]));
    const q=s.questions[0];
    s.answers=[{value:q.moves[0].value,correct:q.moves[0].value===q.value,assisted:false,moveIndex:0}];s.answered=true;
    const changed=structuredClone(s);changed.questions[0].moves[0].move='<script>bad</script>';
    changed.questions[0].moves[0].moveSource='javascript:bad';
    const restored=restoreSession(changed);
    assert.equal(restored.questions[0].moves[0].move,q.moves[0].move);
    assert.equal(restored.questions[0].moves[0].moveSource,q.moves[0].moveSource);
    assert.deepEqual(restored.answers,s.answers);
    changed.questions[0].moves[0].moveId=-1;assert.throws(()=>restoreSession(changed));
    changed.questions[0].moves[0]=changed.questions[0].moves[1];assert.throws(()=>restoreSession(changed));
  }
});
