import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOVE_EXAMPLES,moveExample} from '../src/move-examples.js';
import {byId,availablePokemon} from '../src/pokemon.js';
import {typesFor} from '../src/data.js';

// Extracted independently from PokéAPI's species, move, and game endpoint data.
// This checks the exact evolution's learnset, rather than trusting the UI labels.
const evidence=JSON.parse(readFileSync(new URL('../assets/data/move-evidence.json',import.meta.url),'utf8'));
const fixedDamage=new Set(['dragon-rage','night-shade','seismic-toss','sonic-boom','super-fang','endeavor']);
test('Every move example belongs to that exact Pokémon and a game in the chosen chart era',()=>{
  let verified=0;
  for(const era of ['1','2','6'])for(const type of typesFor(era)){
    const example=moveExample(type,era);
    if(era==='1'&&type==='Dragon'){assert.equal(example,null);continue;}
    assert.ok(example,`${era} ${type}`);
    assert.ok(availablePokemon(era).some(p=>p.id===example.pokemonId));
    assert.equal(byId(example.pokemonId).name,example.pokemonName);
    const species=evidence.pokemon[example.pokemonId];
    const learnset=species.moves.find(m=>m.slug===example.slug);
    assert.ok(learnset.details.some(d=>d.versionGroup===example.versionGroup&&d.method===example.method&&d.level===example.level),`${example.pokemonName}: ${example.move}, ${example.game}`);
    const move=evidence.moves[example.slug],gen=evidence.versionGroups[example.versionGroup].generation;
    assert.ok(era==='1'?gen===1:era==='2'?gen>=2&&gen<=5:gen>=6);
    assert.ok(move.generation<=gen);
    assert.notEqual(move.damageClass,'status');
    assert.ok(!fixedDamage.has(example.slug));
    const historical=move.pastTypes.sort((a,b)=>a.generation-b.generation).find(p=>gen<p.generation);
    assert.equal((historical?.type||move.type),type.toLowerCase());
    assert.equal(move.id,example.moveId);
    verified++;
  }
  assert.equal(verified,49);
});
test('Squirtle uses Bubble Beam only in verified games, and Water Gun for the II–V era',()=>{
  assert.deepEqual(['1','2','6'].map(era=>{
    const m=moveExample('Water',era);return [m.pokemonId,m.slug,m.versionGroup,m.method,m.level];
  }),[
    [7,'bubble-beam','red-blue','machine',0],
    [7,'water-gun','black-2-white-2','level-up',13],
    [7,'bubble-beam','lets-go-pikachu-lets-go-eevee','level-up',27]
  ]);
});
test('Species and fixed-damage exceptions cannot silently teach the wrong rule',()=>{
  assert.equal(moveExample('Psychic','1').pokemonId,63); // Abra, not Kadabra's learnset
  assert.equal(moveExample('Psychic','1').method,'machine');
  assert.equal(moveExample('Bug','1').pokemonId,15); // Beedrill has Twineedle; Caterpie does not
  assert.equal(moveExample('Bug','1').slug,'twineedle');
  assert.equal(moveExample('Dragon','1'),null); // Dragon Rage's 40 HP ignores normal multipliers
  assert.equal(Object.keys(MOVE_EXAMPLES['1']).length,15);
});
