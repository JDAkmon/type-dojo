import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundPlayer,ELEMENT_CUES,CUES} from '../src/sound.js';
function mockAudio(){
  const notes=[],gains=[];
  const context={state:'running',currentTime:0,destination:{},resume:async()=>{},createOscillator(){const o={frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};notes.push(o);return o;},createGain(){const values=[],g={gain:{setValueAtTime:v=>values.push(v),linearRampToValueAtTime:v=>values.push(v),exponentialRampToValueAtTime:v=>values.push(v)},values,connect(){},disconnect(){this.disconnected=true;}};gains.push(g);return g;}};
  return {context,notes,gains};
}
test('Muted, zero-volume, and hidden pages never initialize or play audio',async()=>{
  let created=0,hidden=false;
  const sound=createSoundPlayer({createContext:()=>{created++;return mockAudio().context;},isHidden:()=>hidden});
  sound.configure({enabled:false,volume:25});assert.equal(await sound.play('correct'),false);
  sound.configure({enabled:true,volume:0});assert.equal(await sound.play('correct'),false);
  sound.configure({enabled:true,volume:25});hidden=true;assert.equal(await sound.play('correct'),false);
  assert.equal(created,0);
});
test('Quiet cues have capped levels; muting disconnects scheduled notes and repeated clicks are throttled',async()=>{
  const audio=mockAudio();let time=1000;
  const sound=createSoundPlayer({createContext:()=>audio.context,now:()=>time,isHidden:()=>false});
  assert.equal(await sound.play('correct'),true);
  assert.equal(await sound.play('correct'),false);
  assert.ok(audio.gains.every(g=>Math.max(...g.values)<=.02));
  sound.configure({enabled:false,volume:25});assert.ok(audio.gains.every(g=>g.disconnected));
  time+=500;sound.configure({enabled:true,volume:100});await sound.play('complete');
  assert.ok(audio.gains.every(g=>Math.max(...g.values)<=.08));
});
test('Muting during a delayed resume cancels the cue, and unavailable audio never breaks learning',async()=>{
  const audio=mockAudio();let resolve;
  audio.context.state='suspended';audio.context.resume=()=>new Promise(r=>{resolve=()=>{audio.context.state='running';r();};});
  const sound=createSoundPlayer({createContext:()=>audio.context,isHidden:()=>false});
  const pending=sound.play('start');sound.configure({enabled:false,volume:25});resolve();
  assert.equal(await pending,false);assert.equal(audio.notes.length,0);
  const missing=createSoundPlayer({createContext:()=>{throw new Error('Unsupported');},isHidden:()=>false});
  assert.equal(await missing.play('correct'),false);
});
test('Elemental effects are brief, quiet, optional, and obey master mute and visibility',async()=>{
  const audio=mockAudio();let time=1000,hidden=false;
  const sound=createSoundPlayer({createContext:()=>audio.context,now:()=>time,isHidden:()=>hidden});
  for(const type of ['Water','Fire','Electric','Ice','Ground','Flying','Grass','Ghost']){await sound.playBattle(type,true);time+=1000;}
  assert.ok(audio.gains.every(g=>Math.max(...g.values)<=.02));
  for(const notes of Object.values(ELEMENT_CUES))assert.ok(Math.max(...notes.map(n=>n[1]+n[2]))<.3);
  assert.ok(Math.max(...CUES.badge.map(n=>n[1]+n[2]))<.6);
  sound.configure({enabled:true,volume:25,battleEffects:false});const before=audio.notes.length;
  assert.equal(await sound.playBattle('Water',true),true);assert.equal(audio.notes.length-before,CUES.correct.length);
  time+=1000;sound.configure({enabled:false,volume:25,battleEffects:true});assert.equal(await sound.playBattle('Fire',false),false);
  sound.configure({enabled:true,volume:25,battleEffects:true});hidden=true;assert.equal(await sound.playBattle('Electric',true),false);
});
