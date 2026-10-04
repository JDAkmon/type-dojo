import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {POKEMON,pokemonTypes,pokemonForTypes,representative} from '../src/pokemon.js';
import {typesFor,dualEffectiveness} from '../src/data.js';

test('Defending sprites match the complete typing used by the question',()=>{
  for(const era of ['1','2','6']) {
    const ts=typesFor(era);
    for(const a of ts)for(const d of ts){
      const types=a===d?[a]:[a,d],p=pokemonForTypes(types,era);
      if(p)assert.deepEqual(pokemonTypes(p,era).sort(),[...types].sort());
    }
  }
  // A Fire/Flying Charizard cannot represent a single Fire defender.
  assert.notEqual(pokemonForTypes(['Fire'],'6').name,'Charizard');
  assert.equal(pokemonForTypes(['Fire','Flying'],'6').name,'Charizard');
  assert.equal(dualEffectiveness('Rock',pokemonTypes(pokemonForTypes(['Fire','Flying'],'6'),'6'),'6'),4);
  // No pure Ghost or Flying Pokémon exists in the Generation I selection.
  assert.equal(pokemonForTypes(['Ghost'],'1'),undefined);
  assert.equal(pokemonForTypes(['Flying'],'1'),undefined);
});
test('Species art respects era availability and historical type changes',()=>{
  const clefairy=POKEMON.find(p=>p.name==='Clefairy'),magnemite=POKEMON.find(p=>p.name==='Magnemite');
  assert.deepEqual(pokemonTypes(clefairy,'1'),['Normal']);
  assert.deepEqual(pokemonTypes(clefairy,'6'),['Fairy']);
  assert.deepEqual(pokemonTypes(magnemite,'1'),['Electric']);
  assert.deepEqual(pokemonTypes(magnemite,'2'),['Electric','Steel']);
  for(const era of ['1','2','6'])for(const type of typesFor(era)) {
    const p=representative(type,era);
    assert.ok(pokemonTypes(p,era).includes(type));
    assert.ok(p.generation<=(era==='1'?1:era==='2'?5:9));
  }
});
test('Every species has both local animation and still art for reduced motion',()=>{
  for(const p of POKEMON)for(const ext of ['gif','png'])assert.ok(existsSync(new URL(`../assets/pokemon/${p.id}.${ext}`,import.meta.url)),`${p.name}.${ext}`);
});
