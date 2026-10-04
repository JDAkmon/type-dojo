import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,recordAnswer,resetProgress,restoreProgress,validateResetBackup} from '../src/progress.js';
import {LESSONS} from '../src/data.js';
function studiedState(){const s=freshState();for(const era of ['1','2','6']){s.eras[era].lessons=[LESSONS[0].id];recordAnswer(s.eras[era],'Water>Fire',true);}return s;}
test('Restarting lessons returns Ground Zero to the beginning while retaining practice and other eras',()=>{
  const state=studiedState(),before=structuredClone(state),backup=resetProgress(state,'6','lessons');
  assert.deepEqual(state.eras['6'].lessons,[]);
  const expected=structuredClone(before);expected.eras['6'].lessons=[];
  assert.deepEqual(state,expected);
  recordAnswer(state.eras['6'],'Fire>Grass',true);
  restoreProgress(state,backup);
  assert.deepEqual(state.eras['6'].lessons,[LESSONS[0].id]);
  assert.equal(state.eras['6'].xp,20); // Undo does not discard new practice.
  assert.equal(state.eras['6'].records['Fire>Grass'].correct,1);
});
test('A full era reset and its persisted undo copy preserve every other era',()=>{
  const state=studiedState(),before=structuredClone(state),backup=resetProgress(state,'2','era');
  assert.deepEqual(state.eras['2'],freshState().eras['2']);
  assert.deepEqual(state.eras['1'],before.eras['1']);assert.deepEqual(state.eras['6'],before.eras['6']);
  restoreProgress(state,JSON.parse(JSON.stringify(backup)));
  assert.deepEqual(state,before);
});
test('Invalid reset backups cannot overwrite learning history',()=>{
  const state=studiedState(),before=structuredClone(state);
  assert.throws(()=>resetProgress(state,'9','era'));
  assert.throws(()=>restoreProgress(state,{era:'6',scope:'era',bucket:{xp:-10}}));
  assert.throws(()=>validateResetBackup({era:'6',scope:'everything'}));
  assert.deepEqual(state,before);
});
