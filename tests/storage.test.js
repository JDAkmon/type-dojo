import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,STORAGE_KEY} from '../src/progress.js';
import {loadProgress,saveProgress,recoveryFiles,RECOVERY_KEY} from '../src/storage.js';

function memoryStorage(raw){
  const values=new Map(raw==null?[]:[[STORAGE_KEY,raw]]);
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

test('Unreadable saves retain exact original bytes before a new save is written',()=>{
  const original=' { "valuable": "old progress", malformed';
  const storage=memoryStorage(original),state=loadProgress(storage);
  assert.equal(storage.getItem(STORAGE_KEY),original);
  assert.equal(recoveryFiles(storage)[0].raw,original);
  loadProgress(storage);assert.equal(recoveryFiles(storage).length,1);
  state.era='2';saveProgress(storage,state);
  assert.equal(loadProgress(storage).era,'2');assert.equal(recoveryFiles(storage)[0].raw,original);
  storage.setItem(STORAGE_KEY,'a second broken save');loadProgress(storage);
  assert.deepEqual(recoveryFiles(storage).map(b=>b.raw),[original,'a second broken save']);
});

test('A failed recovery write or invalid recovery archive never overwrites the original save',()=>{
  const original='unreadable';
  const storage=memoryStorage(original),set=storage.setItem;
  storage.setItem=(key,value)=>{if(key===RECOVERY_KEY)throw new Error('Quota exceeded');set(key,value);};
  assert.throws(()=>saveProgress(storage,freshState()));
  assert.equal(storage.getItem(STORAGE_KEY),original);
  storage.setItem=set;storage.setItem(RECOVERY_KEY,'invalid archive');
  assert.throws(()=>saveProgress(storage,freshState()));
  assert.equal(storage.getItem(STORAGE_KEY),original);
});

test('Valid progress round trips without creating a recovery archive',()=>{
  const s=freshState();s.eras['6'].xp=1000;
  const storage=memoryStorage(JSON.stringify(s));
  assert.deepEqual(loadProgress(storage),s);assert.deepEqual(recoveryFiles(storage),[]);
  s.era='1';saveProgress(storage,s);assert.deepEqual(loadProgress(storage),s);
});
