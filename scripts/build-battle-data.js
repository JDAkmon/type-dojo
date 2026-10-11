// Build a small offline catalog from the independently saved source evidence.
import {readFileSync,writeFileSync} from 'node:fs';
import {MOVE_EXAMPLES} from '../src/move-examples.js';
import {byId,pokemonTypes} from '../src/pokemon.js';
const e=JSON.parse(readFileSync(new URL('../assets/data/move-evidence.json',import.meta.url),'utf8'));
const names=new Map(Object.values(MOVE_EXAMPLES).flatMap(x=>Object.values(x)).filter(Boolean).map(m=>[m.slug,m.move]));
const games={'red-blue':'Red / Blue','black-2-white-2':'Black 2 / White 2','omega-ruby-alpha-sapphire':'Omega Ruby / Alpha Sapphire'};
const catalog={};
for(const [era,vg] of [['1','red-blue'],['2','black-2-white-2'],['6','omega-ruby-alpha-sapphire']]){
  const gen=e.versionGroups[vg].generation;
  catalog[era]=[];
  for(const id of [7,4,25,114,66,74,35,133,92,197,471,23,185]){
    const p=e.pokemon[id];if(!p)continue;
    const seen=new Set(),moves=[];
    const native=pokemonTypes(byId(id),era).map(t=>t.toLowerCase());
    const learnset=[...p.moves].sort((a,b)=>Number(native.includes(e.moves[b.slug]?.type))-Number(native.includes(e.moves[a.slug]?.type)));
    for(const entry of learnset){
      const info=e.moves[entry.slug],detail=entry.details.find(d=>d.versionGroup===vg&&['level-up','machine','tutor'].includes(d.method));
      if(!info||!detail||info.damageClass==='status'||info.generation>gen||!info.power)continue;
      const historical=[...info.pastTypes].sort((a,b)=>a.generation-b.generation).find(t=>gen<t.generation);
      const type=(historical?.type||info.type).replace(/^./,c=>c.toUpperCase());
      if(seen.has(type)||moves.length===4)continue;seen.add(type);
      moves.push({pokemonId:id,pokemonName:p.name,moveId:info.id,slug:entry.slug,move:names.get(entry.slug)||entry.slug.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),type,versionGroup:vg,game:games[vg],method:detail.method,level:detail.level,pokemonSource:`https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/pokemon/${id}/index.json`,moveSource:`https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/move/${info.id}/index.json`});
    }
    if(moves.length>=3)catalog[era].push({pokemonId:id,pokemonName:p.name,game:games[vg],moves});
  }
}
writeFileSync(new URL('../src/battle-data.js',import.meta.url),`// Generated from assets/data/move-evidence.json by scripts/build-battle-data.js.\nexport const BATTLE_SETS=${JSON.stringify(catalog,null,2)};\n`);
console.log(Object.fromEntries(Object.entries(catalog).map(([era,sets])=>[era,sets.length])));
