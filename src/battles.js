import {BATTLE_SETS} from './battle-data.js';
import {availablePokemon,pokemonTypes} from './pokemon.js';
import {dualEffectiveness,multiplier,mnemonic} from './data.js';
import {matchupKey} from './matchup.js';

export function buildMoveSession(era,bucket,count=8,random=Math.random){
  const pool=[];
  for(const set of BATTLE_SETS[era])for(const target of availablePokemon(era)){
    const ds=pokemonTypes(target,era);
    const moves=set.moves.map(m=>({...m,value:dualEffectiveness(m.type,ds,era)}));
    const value=Math.max(...moves.map(m=>m.value));
    if(new Set(moves.map(m=>m.value)).size<2)continue;
    const best=moves.find(m=>m.value===value),key=matchupKey(best.type,ds);
    const score=Math.max(...moves.map(m=>{const r=bucket.records[matchupKey(m.type,ds)];return r&&(r.streak===0||r.moveMisses)?5:0;}))+random()*4;
    pool.push({a:best.type,ds,key,value,moves,pokemonId:set.pokemonId,targetId:target.id,game:set.game,score});
  }
  const ranked=pool.sort((a,b)=>b.score-a.score),chosen=[];
  // Start with a variety of partners, then fill without duplicate battles.
  for(const q of ranked){if(chosen.length>=count)break;if(!chosen.some(x=>x.pokemonId===q.pokemonId))chosen.push(q);}
  for(const q of ranked){if(chosen.length>=count)break;if(!chosen.includes(q))chosen.push(q);}
  return chosen.map(q=>({...q,moves:q.moves.map(m=>({m,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.m)})).map(q=>({q,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.q);
}

export function recordMoveChoice(bucket,q,index,now=Date.now()){
  const selected=q.moves[index];
  if(!selected)throw new Error('Choose an available move.');
  const correct=selected.value===q.value;
  bucket.battles??={attempts:0,correct:0};
  bucket.battles.attempts++;bucket.battles.correct+=Number(correct);
  if(correct){
    // A move choice does not demonstrate that the numerical multiplier is known.
    bucket.xp+=10;
    const day=new Date(now).toLocaleDateString('en-CA');if(!bucket.days.includes(day))bucket.days.push(day);
  }else{
    const key=matchupKey(selected.type,q.ds),old=bucket.records[key]||{attempts:0,correct:0,streak:0,due:0,last:0,assisted:0,retained:false,wrongAnswers:{}};
    bucket.records[key]={...old,moveMisses:(old.moveMisses||0)+1,due:now,last:now,lastMistake:{kind:'move',selected:null,betterType:q.a,at:now}};
    bucket.xp+=2;
    const day=new Date(now).toLocaleDateString('en-CA');if(!bucket.days.includes(day))bucket.days.push(day);
  }
  return {value:selected.value,correct,assisted:false,moveIndex:index};
}

export function mistakeExplanation(q,selected,era){
  const start=`You chose ${multiplier(selected)}; this matchup is ${multiplier(q.value)}.`;
  if(q.value===0)return `${start} ${q.ds.find(d=>dualEffectiveness(q.a,[d],era)===0)} blocks ${q.a}-type attacks completely. An immunity overrides the other type.`;
  if(q.ds.length===2)return `${start} Check both defending types: ${q.ds.map(d=>`${q.a} → ${d} is ${multiplier(dualEffectiveness(q.a,[d],era))}`).join(', ')}. Multiply those two values.`;
  if(selected!==q.value&&dualEffectiveness(q.ds[0],[q.a],era)===selected)return `${start} The direction matters: ${q.a} is attacking ${q.ds[0]}. The reverse matchup has a different result.`;
  return `${start} ${mnemonic(q.a,q.ds[0],era)}`;
}
