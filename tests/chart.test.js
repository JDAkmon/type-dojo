import './pokemon.test.js';
import './moves.test.js';
import './reset.test.js';
import './sound.test.js';
import './study.test.js';
import './learning.test.js';
import './battles.test.js';
import './pages.test.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {typesFor,pairsFor,effectiveness,dualEffectiveness,mnemonic,LESSONS} from '../src/data.js';
import {freshState,recordAnswer,mastered,due,stats,buildSession,lessonQuestions,validateState} from '../src/progress.js';

// Independent historical fixtures transcribed from the pret game disassemblies.
// https://github.com/pret/pokered/blob/master/data/types/type_matchups.asm
// https://github.com/pret/pokecrystal/blob/master/data/types/type_matchups.asm
const original={
 Normal:['','Rock','Ghost'],Fire:['Grass Ice Bug','Fire Water Rock Dragon',''],Water:['Fire Ground Rock','Water Grass Dragon',''],Electric:['Water Flying','Electric Grass Dragon','Ground'],Grass:['Water Ground Rock','Fire Grass Poison Flying Bug Dragon',''],Ice:['Grass Ground Flying Dragon','Water Ice',''],Fighting:['Normal Ice Rock','Poison Flying Psychic Bug','Ghost'],Poison:['Grass Bug','Poison Ground Rock Ghost',''],Ground:['Fire Electric Poison Rock','Grass Bug','Flying'],Flying:['Grass Fighting Bug','Electric Rock',''],Psychic:['Fighting Poison','Psychic',''],Bug:['Grass Psychic Poison','Fire Fighting Flying Ghost',''],Rock:['Fire Ice Flying Bug','Fighting Ground',''],Ghost:['Ghost','','Normal Psychic'],Dragon:['Dragon','','']
};
const crystal={
 Normal:['','Rock Steel','Ghost'],Fire:['Grass Ice Bug Steel','Fire Water Rock Dragon',''],Water:['Fire Ground Rock','Water Grass Dragon',''],Electric:['Water Flying','Electric Grass Dragon','Ground'],Grass:['Water Ground Rock','Fire Grass Poison Flying Bug Dragon Steel',''],Ice:['Grass Ground Flying Dragon','Fire Water Ice Steel',''],Fighting:['Normal Ice Rock Dark Steel','Poison Flying Psychic Bug','Ghost'],Poison:['Grass','Poison Ground Rock Ghost','Steel'],Ground:['Fire Electric Poison Rock Steel','Grass Bug','Flying'],Flying:['Grass Fighting Bug','Electric Rock Steel',''],Psychic:['Fighting Poison','Psychic Steel','Dark'],Bug:['Grass Psychic Dark','Fire Fighting Poison Flying Ghost Steel',''],Rock:['Fire Ice Flying Bug','Fighting Ground Steel',''],Ghost:['Psychic Ghost','Dark Steel','Normal'],Dragon:['Dragon','Steel',''],Dark:['Psychic Ghost','Fighting Dark Steel',''],Steel:['Ice Rock','Fire Water Electric Steel','']
};
for(const [era,fixture] of [['1',original],['2',crystal]]) test(`Every Generation ${era} chart cell agrees with original game data`,()=>{
 for(const a of Object.keys(fixture))for(const d of Object.keys(fixture)){
  const groups=fixture[a].map(s=>s.split(' '));const expected=groups[0].includes(d)?2:groups[1].includes(d)?.5:groups[2].includes(d)?0:1;
  assert.equal(effectiveness(a,d,era),expected,`${a} → ${d}`);
 }
});
test('Modern chart matches the legacy chart plus exactly the documented changes',()=>{
 for(const a of typesFor('2'))for(const d of typesFor('2')){
   const modern=['Ghost','Dark'].includes(a)&&d==='Steel'?1:effectiveness(a,d,'2');
   assert.equal(effectiveness(a,d,'6'),modern,`${a} → ${d}`);
 }
 const incoming={Fighting:.5,Poison:2,Bug:.5,Dragon:0,Dark:.5,Steel:2};
 const outgoing={Fighting:2,Dragon:2,Dark:2,Fire:.5,Poison:.5,Steel:.5};
 for(const t of typesFor('6')){
  assert.equal(effectiveness(t,'Fairy','6'),incoming[t]??1,`${t} → Fairy`);
  assert.equal(effectiveness('Fairy',t,'6'),outgoing[t]??1,`Fairy → ${t}`);
 }
});
test('Type availability and full chart sizes',()=>{
 assert.deepEqual(['1','2','6'].map(e=>typesFor(e).length),[15,17,18]);
 assert.deepEqual(['1','2','6'].map(e=>pairsFor(e).length),[225,289,324]);
 assert.throws(()=>effectiveness('Fairy','Fire','1'));
 assert.throws(()=>typesFor('unknown'));
});
test('Dual types multiply, cancel, stack, and preserve immunity',()=>{
 assert.equal(dualEffectiveness('Rock',['Fire','Flying']),4);
 assert.equal(dualEffectiveness('Grass',['Fire','Flying']),.25);
 assert.equal(dualEffectiveness('Water',['Water','Ground']),1);
 assert.equal(dualEffectiveness('Electric',['Water','Ground']),0);
 assert.equal(dualEffectiveness('Poison',['Grass','Bug'],'1'),4);
 assert.equal(dualEffectiveness('Poison',['Grass','Bug'],'2'),2);
 assert.throws(()=>dualEffectiveness('Water',['Fire','Fire']));
 assert.throws(()=>dualEffectiveness('Water',[]));
});
test('Every legal matchup has a memory explanation',()=>{
 for(const e of ['1','2','6'])for(const {a,ds} of pairsFor(e)) assert.ok(mnemonic(a,ds[0],e).length>10,`${e}: ${a} → ${ds[0]}`);
 assert.match(mnemonic('Ghost','Psychic','1'),/0×/);
 assert.match(mnemonic('Dark','Steel','2'),/Generations II–V/);
});
test('Mastery requires three consecutive unaided correct answers with delayed recall',()=>{
 const b=freshState().eras['6'];let r;
 for(let i=0;i<3;i++)r=recordAnswer(b,'Water>Fire',true,false,1000+i);
 assert.equal(mastered(r),false);assert.equal(r.due,1002+86400000);assert.equal(b.xp,30);
 r=recordAnswer(b,'Water>Fire',true,false,1002+86400000);assert.equal(mastered(r),true);
 r=recordAnswer(b,'Water>Fire',true,true,1002+86400001);assert.equal(mastered(r),false);assert.equal(r.streak,0);assert.equal(b.xp,44);
 r=recordAnswer(b,'Water>Fire',false,false,1002+86400002);assert.equal(r.correct,5);assert.equal(r.attempts,6);assert.equal(due(r,1002+86400002),true);
});
test('Generation buckets, lesson progress, and dual stats are independent',()=>{
 const state=freshState(),b=state.eras['6'];recordAnswer(b,'Water>Fire',true);recordAnswer(b,'Rock>Fire+Flying',true);
 const s=stats(b,'6');assert.equal(s.seen,1);assert.equal(s.attempted,2);assert.equal(s.accuracy,100);assert.equal(s.total,324);
 assert.equal(stats(state.eras['1'],'1').attempted,0);assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))),state);
});
test('Practice balances outcomes and avoids repeated questions',()=>{
 const b=freshState().eras['6'];const session=buildSession('attack','6',b,10,()=>.5);
 assert.equal(session.length,10);assert.equal(new Set(session.map(q=>q.key)).size,10);
 assert.deepEqual([...new Set(session.map(q=>q.value))].sort(),[0,.5,1,2].sort());
 const detective=buildSession('immunity','6',b);assert.ok(detective.some(q=>q.value===0));assert.ok(detective.some(q=>q.value!==0));
 assert.equal(buildSession('review','6',b).length,0);
 recordAnswer(b,'Water>Fire',false,false,0);assert.equal(buildSession('review','6',b,10,()=>.5,1)[0].key,'Water>Fire');
 const dual=buildSession('dual','6',b,10,()=>.5);assert.deepEqual([...new Set(dual.map(q=>q.value))].sort(),[0,.25,.5,1,2,4].sort());
});
test('Lessons only ask about types present in the selected era',()=>{
 for(const e of ['1','2','6'])for(const l of LESSONS)for(const q of lessonQuestions(l,e))assert.equal(q.value,dualEffectiveness(q.a,q.ds,e));
 assert.equal(lessonQuestions(LESSONS.find(l=>l.id==='later'),'1').length,0);
 assert.equal(lessonQuestions(LESSONS.find(l=>l.id==='later'),'2').length,6);
});
test('Corrupted and invalid backups are rejected before replacing progress',()=>{
 assert.throws(()=>validateState({version:4}));
 const invalid=freshState();invalid.eras['6'].records['Fairy>Fire']={attempts:1,correct:3,streak:3,due:0,last:0};assert.throws(()=>validateState(invalid));
 const unknown=freshState();unknown.eras['1'].records['Fairy>Fire']={attempts:1,correct:1,streak:1,due:0,last:0};assert.throws(()=>validateState(unknown));
});
