// Species typings are separate from move types. Sprite art is shared across chart eras.
export const POKEMON = [
  [1,'Bulbasaur',['Grass','Poison'],1], [4,'Charmander',['Fire'],1],
  [6,'Charizard',['Fire','Flying'],1], [7,'Squirtle',['Water'],1],
  [10,'Caterpie',['Bug'],1], [12,'Butterfree',['Bug','Flying'],1],
  [16,'Pidgey',['Normal','Flying'],1], [23,'Ekans',['Poison'],1],
  [25,'Pikachu',['Electric'],1], [35,'Clefairy',['Fairy'],1],
  [50,'Diglett',['Ground'],1], [63,'Abra',['Psychic'],1],
  [66,'Machop',['Fighting'],1], [74,'Geodude',['Rock','Ground'],1],
  [81,'Magnemite',['Electric','Steel'],1], [87,'Dewgong',['Water','Ice'],1],
  [92,'Gastly',['Ghost','Poison'],1], [94,'Gengar',['Ghost','Poison'],1],
  [95,'Onix',['Rock','Ground'],1], [114,'Tangela',['Grass'],1],
  [123,'Scyther',['Bug','Flying'],1], [124,'Jynx',['Ice','Psychic'],1],
  [130,'Gyarados',['Water','Flying'],1], [131,'Lapras',['Water','Ice'],1],
  [133,'Eevee',['Normal'],1], [143,'Snorlax',['Normal'],1],
  [144,'Articuno',['Ice','Flying'],1], [145,'Zapdos',['Electric','Flying'],1],
  [147,'Dratini',['Dragon'],1], [149,'Dragonite',['Dragon','Flying'],1],
  [197,'Umbreon',['Dark'],2], [200,'Misdreavus',['Ghost'],2],
  [185,'Sudowoodo',['Rock'],2], [227,'Skarmory',['Steel','Flying'],2],
  [260,'Swampert',['Water','Ground'],3], [302,'Sableye',['Dark','Ghost'],3],
  [376,'Metagross',['Steel','Psychic'],3], [379,'Registeel',['Steel'],3],
  [448,'Lucario',['Fighting','Steel'],4], [460,'Abomasnow',['Grass','Ice'],4],
  [471,'Glaceon',['Ice'],4], [598,'Ferrothorn',['Grass','Steel'],5],
  [641,'Tornadus',['Flying'],5]
].map(([id,name,types,generation])=>({id,name,types,generation}));

export const BUDDIES = [25,1,4,7,133];
export function pokemonTypes(pokemon, era) {
  if(pokemon.id===35 && era!=='6') return ['Normal'];
  if(pokemon.id===81 && era==='1') return ['Electric'];
  return [...pokemon.types];
}
export function availablePokemon(era) {
  const max=era==='1'?1:era==='2'?5:9;
  return POKEMON.filter(p=>p.generation<=max);
}
export function pokemonForTypes(types, era) {
  return availablePokemon(era).find(p=>{
    const actual=pokemonTypes(p,era);
    return actual.length===types.length && types.every(t=>actual.includes(t));
  });
}
export function representative(type,era) {
  return pokemonForTypes([type],era)||availablePokemon(era).find(p=>pokemonTypes(p,era).includes(type));
}
export function byId(id) { return POKEMON.find(p=>p.id===Number(id)); }
export function spriteUrl(pokemon,animate=true) {
  return `/assets/pokemon/${pokemon.id}.${animate?'gif':'png'}`;
}
