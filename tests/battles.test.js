import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BATTLE_SETS} from '../src/battle-data.js';
import {buildMoveSession,recordMoveChoice} from '../src/battles.js';
import {byId,availablePokemon,pokemonTypes} from '../src/pokemon.js';
import {dualEffectiveness,typesFor} from '../src/data.js';
import {freshState,validateState,mastered,buildStudySession,stats} from '../src/progress.js';
const evidence=JSON.parse(readFileSync(new URL('../assets/data/move-evidence.json',import.meta.url),'utf8'));

test('Every battle move fits the exact evolution and named game, with historical move types',()=>{
  for(const [era,sets] of Object.entries(BATTLE_SETS))for(const set of sets){
    assert.ok(availablePokemon(era).some(p=>p.id===set.pokemonId));
    assert.equal(byId(set.pokemonId).name,set.pokemonName);
    assert.ok(set.moves.length>=3&&set.moves.length<=4);
    assert.equal(new Set(set.moves.map(m=>m.type)).size,set.moves.length);
    for(const m of set.moves){
      const learned=evidence.pokemon[set.pokemonId].moves.find(x=>x.slug===m.slug);
      assert.ok(learned.details.some(d=>d.versionGroup===m.versionGroup&&d.method===m.method&&d.level===m.level));
      const info=evidence.moves[m.slug],gen=evidence.versionGroups[m.versionGroup].generation;
      assert.ok(era==='1'?gen===1:era==='2'?gen>=2&&gen<=5:gen>=6);
      assert.notEqual(info.damageClass,'status');assert.ok(info.power>0);
      assert.ok(!['dragon-rage','night-shade','seismic-toss','sonic-boom','super-fang','endeavor'].includes(m.slug));
      const historic=[...info.pastTypes].sort((a,b)=>a.generation-b.generation).find(p=>gen<p.generation);
      assert.equal(m.type.toLowerCase(),historic?.type||info.type);assert.ok(typesFor(era).includes(m.type));
      assert.equal(m.pokemonId,set.pokemonId);assert.equal(m.game,set.game);
    }
  }
  assert.ok(BATTLE_SETS['1'].find(s=>s.pokemonId===7).moves.every(m=>m.type!=='Dark'));
  assert.equal(evidence.moves.bite.pastTypes.find(t=>t.generation===2).type,'normal');
});

test('Eight diverse battles per era have exact defender typing and meaningful choices without duplicates',()=>{
  for(const era of ['1','2','6'])for(const seed of [.1,.5,.9]){
    const qs=buildMoveSession(era,freshState().eras[era],8,()=>seed);
    assert.equal(qs.length,8);assert.equal(new Set(qs.map(q=>q.pokemonId+'>'+q.targetId)).size,8);
    assert.ok(new Set(qs.map(q=>q.pokemonId)).size>=5);
    for(const q of qs){assert.deepEqual(q.ds,pokemonTypes(byId(q.targetId),era));assert.equal(q.value,Math.max(...q.moves.map(m=>m.value)));assert.ok(q.moves.some(m=>m.value<q.value));for(const m of q.moves)assert.equal(m.value,dualEffectiveness(m.type,q.ds,era));}
  }
});

test('Tied best moves count equally and move choice never grants multiplier mastery or alters its accuracy',()=>{
  const s=freshState(),b=s.eras['6'];
  const qs=buildMoveSession('6',b,10000,()=>.5),q=qs.find(q=>q.moves.filter(m=>m.value===q.value).length>1);
  assert.ok(q);
  for(let i=0;i<q.moves.length;i++)if(q.moves[i].value===q.value)assert.equal(recordMoveChoice(b,q,i,1000+i).correct,true);
  assert.equal(Object.keys(b.records).length,0);assert.equal(b.battles.correct,b.battles.attempts);
  const wrong=q.moves.findIndex(m=>m.value<q.value);assert.equal(recordMoveChoice(b,q,wrong,2000).correct,false);
  assert.equal(stats(b,'6').attempted,0);assert.equal(b.battles.attempts,b.battles.correct+1);
  const [key,r]=Object.entries(b.records)[0];assert.equal(r.lastMistake.kind,'move');assert.equal(mastered(r),false);
  assert.ok(buildStudySession('6',b,6,()=>.5,2001).some(q=>q.key===key));
  assert.deepEqual(validateState(s),s);
  assert.equal(s.eras['1'].battles.attempts,0);
});
