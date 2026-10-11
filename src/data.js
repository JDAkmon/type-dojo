import {matchupKey} from './matchup.js';
export const TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
export const COLORS = { Normal:'#8b8c9c',Fire:'#e98152',Water:'#578ddd',Electric:'#cfaa31',Grass:'#69a46a',Ice:'#64b4b8',Fighting:'#c2715d',Poison:'#a26ec2',Ground:'#bf9470',Flying:'#8e9bcd',Psychic:'#d577a3',Bug:'#98a44f',Rock:'#ac9a68',Ghost:'#8373b2',Dragon:'#7773d0',Dark:'#776c80',Steel:'#7797a6',Fairy:'#cc8fb8' };
// Rows are attacking types; each list names defending types. All omitted cells are 1×.
const rows = {
  Normal:[[],['Rock','Steel'],['Ghost']],
  Fire:[['Grass','Ice','Bug','Steel'],['Fire','Water','Rock','Dragon'],[]],
  Water:[['Fire','Ground','Rock'],['Water','Grass','Dragon'],[]],
  Electric:[['Water','Flying'],['Electric','Grass','Dragon'],['Ground']],
  Grass:[['Water','Ground','Rock'],['Fire','Grass','Poison','Flying','Bug','Dragon','Steel'],[]],
  Ice:[['Grass','Ground','Flying','Dragon'],['Fire','Water','Ice','Steel'],[]],
  Fighting:[['Normal','Ice','Rock','Dark','Steel'],['Poison','Flying','Psychic','Bug','Fairy'],['Ghost']],
  Poison:[['Grass','Fairy'],['Poison','Ground','Rock','Ghost'],['Steel']],
  Ground:[['Fire','Electric','Poison','Rock','Steel'],['Grass','Bug'],['Flying']],
  Flying:[['Grass','Fighting','Bug'],['Electric','Rock','Steel'],[]],
  Psychic:[['Fighting','Poison'],['Psychic','Steel'],['Dark']],
  Bug:[['Grass','Psychic','Dark'],['Fire','Fighting','Poison','Flying','Ghost','Steel','Fairy'],[]],
  Rock:[['Fire','Ice','Flying','Bug'],['Fighting','Ground','Steel'],[]],
  Ghost:[['Psychic','Ghost'],['Dark'],['Normal']],
  Dragon:[['Dragon'],['Steel'],['Fairy']],
  Dark:[['Psychic','Ghost'],['Fighting','Dark','Fairy'],[]],
  Steel:[['Ice','Rock','Fairy'],['Fire','Water','Electric','Steel'],[]],
  Fairy:[['Fighting','Dragon','Dark'],['Fire','Poison','Steel'],[]]
};
export const ERAS = {
  '1':{name:'Generation I',short:'Gen I',subtitle:'Red · Blue · Yellow',description:'The original 15 types. Bug and Poison beat each other; Ghost does not affect Psychic; Ice is neutral against Fire.'},
  '2':{name:'Generations II–V',short:'Gen II–V',subtitle:'Gold & Silver → Black 2 & White 2',description:'Dark and Steel arrive. Ghost now beats Psychic, Poison no longer beats Bug, Bug is resisted by Poison, and Fire resists Ice. Steel resists Ghost and Dark.'},
  '6':{name:'Generation VI onward',short:'Gen VI+',subtitle:'X & Y onward · 18 standard types',description:'Fairy joins the chart. Steel no longer resists Ghost or Dark. Remakes use their release generation’s chart, not the original game’s chart.'}
};
export function typesFor(era) { if(!ERAS[era]) throw new Error('Unknown chart era'); return TYPES.filter(t => era !== '1' || !['Dark','Steel','Fairy'].includes(t)).filter(t=>era==='6'||t!=='Fairy'); }
export function effectiveness(attack, defend, era='6') {
  const valid = typesFor(era);
  if(!valid.includes(attack)||!valid.includes(defend)) throw new Error('Type unavailable in this era');
  if(era==='1') {
    if(attack==='Bug'&&defend==='Poison'||attack==='Poison'&&defend==='Bug') return 2;
    if(attack==='Ghost'&&defend==='Psychic') return 0;
    if(attack==='Ice'&&defend==='Fire') return 1;
  }
  if(era==='2'&&['Ghost','Dark'].includes(attack)&&defend==='Steel') return .5;
  const [strong,resisted,immune] = rows[attack];
  return immune.includes(defend)?0:strong.includes(defend)?2:resisted.includes(defend)?.5:1;
}
export function dualEffectiveness(attack, defenders, era='6') {
  if(!Array.isArray(defenders)||defenders.length<1||defenders.length>2||new Set(defenders).size!==defenders.length) throw new Error('Choose one or two different defender types');
  return defenders.reduce((total,t)=>total*effectiveness(attack,t,era),1);
}
export const LABELS = {'0':'No effect','0.25':'Barely effective','0.5':'Not very effective','1':'Normally effective','2':'Super effective','4':'Super effective'};
export const multiplier = n => `${n===.5?'½':n===.25?'¼':n}×`;
const memories = {
 'Fire>Grass':'Fire burns leaves and grass.', 'Fire>Ice':'Heat melts ice.', 'Fire>Bug':'Tiny bugs cannot take the heat.', 'Fire>Steel':'A furnace melts metal.',
 'Water>Fire':'Water puts out fire.', 'Water>Ground':'A flood washes away the earth.', 'Water>Rock':'Waves wear down stone.',
 'Electric>Water':'Picture a lightning bolt hitting a pool.', 'Electric>Flying':'Lightning strikes high in the sky.',
 'Grass>Water':'Plants drink up water.', 'Grass>Ground':'Roots break through soil.', 'Grass>Rock':'Roots crack a stone path.',
 'Ice>Grass':'Frost kills tender plants.', 'Ice>Ground':'The ground freezes solid.', 'Ice>Flying':'Icy wings cannot stay aloft.', 'Ice>Dragon':'Picture a cold-blooded dragon shivering.',
 'Fighting>Normal':'A trained fighter outmatches an ordinary opponent.', 'Fighting>Ice':'A karate chop breaks a block of ice.', 'Fighting>Rock':'A martial artist breaks a stone slab.', 'Fighting>Dark':'A hero fights dirty tricks.', 'Fighting>Steel':'A strong fighter bends a steel bar.',
 'Poison>Grass':'Toxins make a plant wilt.', 'Poison>Fairy':'Poison spoils a magical forest.', 'Poison>Bug':'Bug spray poisons insects. This matchup is only 2× in Generation I.',
 'Ground>Fire':'Throw soil over a campfire to smother it.', 'Ground>Electric':'The earth grounds electricity.', 'Ground>Poison':'Picture the earth burying a toxic spill.', 'Ground>Rock':'An earthquake splits a boulder.', 'Ground>Steel':'An earthquake buckles steel beams.',
 'Flying>Grass':'A bird plucks leaves from a plant.', 'Flying>Fighting':'A fighter cannot reach a bird in the air.', 'Flying>Bug':'Birds eat bugs.',
 'Psychic>Fighting':'Mind over muscle.', 'Psychic>Poison':'Picture a focused mind purging toxins.',
 'Bug>Grass':'Bugs munch leaves.', 'Bug>Psychic':'A creepy-crawly breaks your concentration.', 'Bug>Dark':'Picture a tiny bug outsmarting a sneaky villain.', 'Bug>Poison':'In the original games, imagine a bug thriving in toxic sludge. This rule changes after Generation I.',
 'Rock>Fire':'A ring of stones contains a campfire.', 'Rock>Ice':'A rock shatters ice.', 'Rock>Flying':'A stone knocks a bird out of the sky.', 'Rock>Bug':'A stone squashes a bug.',
 'Ghost>Psychic':'A haunting frightens the mind. In Generation I, the game instead makes Psychic immune.', 'Ghost>Ghost':'Only a spirit can really fight another spirit.',
 'Dragon>Dragon':'Send a dragon to battle a dragon.', 'Dark>Psychic':'Dark tricks disrupt a focused mind.', 'Dark>Ghost':'Picture darkness swallowing a ghost.',
 'Steel>Ice':'A steel pick breaks ice.', 'Steel>Rock':'A metal drill cuts through stone.', 'Steel>Fairy':'Imagine iron breaking a fairy’s spell.',
 'Fairy>Fighting':'Magic outwits brute strength.', 'Fairy>Dragon':'In fairy tales, magic defeats the dragon.', 'Fairy>Dark':'A fairy’s light drives away darkness.',
 'Normal>Ghost':'An ordinary punch passes through a ghost.', 'Fighting>Ghost':'You cannot punch a spirit.', 'Ghost>Normal':'Picture the normal world ignoring a haunting.',
 'Electric>Ground':'The ground safely carries away the charge: zero damage.', 'Ground>Flying':'An earthquake cannot hit something in the air.', 'Psychic>Dark':'A dark mind blocks psychic tricks.', 'Poison>Steel':'Metal cannot be poisoned.', 'Dragon>Fairy':'A fairy’s magic completely blocks a dragon’s attack.'
};
const resistanceMemories = {
 'Normal>Rock':'An ordinary hit barely dents a boulder.', 'Normal>Steel':'An everyday attack bounces off metal armor.',
 'Fire>Fire':'Adding a flame to a bonfire does not bother it much.', 'Fire>Water':'Water douses the incoming flame.', 'Fire>Rock':'A stone fireplace withstands the heat.', 'Fire>Dragon':'A fire-breathing dragon is used to heat.',
 'Water>Water':'A splash disappears into a pool.', 'Water>Grass':'A thirsty plant drinks up the splash.', 'Water>Dragon':'Picture an ancient dragon shrugging off a splash.',
 'Electric>Electric':'An electric creature is already charged up.', 'Electric>Grass':'Imagine a plant wrapped in insulating leaves.', 'Electric>Dragon':'Picture a dragon’s scales shrugging off a little lightning spark.',
 'Grass>Fire':'Leaves burn up before they can bother a flame.', 'Grass>Grass':'Plants tangle together without doing much harm.', 'Grass>Poison':'Toxic sludge makes incoming leaves wilt.', 'Grass>Flying':'A bird rises above the tangled plants.', 'Grass>Bug':'The bug eats the leaves sent its way.', 'Grass>Dragon':'A mighty dragon shrugs off a handful of leaves.', 'Grass>Steel':'Soft leaves cannot dent metal armor.',
 'Ice>Fire':'Fire melts the incoming ice. This resistance begins in Generation II.', 'Ice>Water':'Picture an ice cube melting into a larger pool.', 'Ice>Ice':'An icy creature is already used to the cold.', 'Ice>Steel':'Imagine a steel shield stopping flying ice shards.',
 'Fighting>Poison':'Picture toxic fumes weakening a fighter’s punch.', 'Fighting>Flying':'A bird dodges a punch by flying higher.', 'Fighting>Psychic':'A focused mind anticipates a fighter’s punch.', 'Fighting>Bug':'A tiny bug is a difficult punching target.', 'Fighting>Fairy':'Picture a magical charm softening a punch.',
 'Poison>Poison':'A poisonous creature is already used to toxins.', 'Poison>Ground':'Picture soil absorbing a toxic spill.', 'Poison>Rock':'Imagine poison sliding off a stone wall.', 'Poison>Ghost':'A spirit has little physical body for poison to harm.',
 'Ground>Grass':'Roots hold soil together against an earth attack.', 'Ground>Bug':'Picture a burrowing bug comfortable in shifting soil.',
 'Flying>Electric':'A bird has trouble flying through a lightning storm.', 'Flying>Rock':'A solid cliff withstands wind and wings.', 'Flying>Steel':'Metal armor withstands a wing strike.',
 'Psychic>Psychic':'A trained mind recognizes another mind’s tricks.', 'Psychic>Steel':'Imagine a metal helmet shielding the mind.',
 'Bug>Fire':'An attacking bug hesitates at the heat.', 'Bug>Fighting':'Picture a fighter brushing an insect aside.', 'Bug>Poison':'A toxic cloud holds off attacking bugs. This resistance starts in Generation II.', 'Bug>Flying':'A bird snaps up an incoming bug.', 'Bug>Ghost':'Picture a bug’s bite slipping through a spirit.', 'Bug>Steel':'A little bite barely dents metal.', 'Bug>Fairy':'Imagine a magical forest charming its bugs into calm.',
 'Rock>Fighting':'A fighter breaks the incoming stone.', 'Rock>Ground':'The earth absorbs a falling rock.', 'Rock>Steel':'A steel shield stops the stone.',
 'Ghost>Dark':'Imagine darkness swallowing an incoming haunting.', 'Dragon>Steel':'A dragon’s claws scrape against a steel shield.',
 'Dark>Fighting':'A disciplined fighter resists dirty tricks.', 'Dark>Dark':'A sneaky creature already knows those tricks.', 'Dark>Fairy':'A fairy’s light holds back dark tricks.',
 'Steel>Fire':'A furnace softens the incoming metal.', 'Steel>Water':'Picture water cushioning a falling metal blade.', 'Steel>Electric':'Imagine a magnet holding back a metal weapon.', 'Steel>Steel':'Two metal shields clash with little advantage.',
 'Fairy>Fire':'Imagine a flame burning through a delicate enchantment.', 'Fairy>Poison':'Toxic sludge spoils a fairy’s magic.', 'Fairy>Steel':'Iron armor wards off a fairy’s spell.'
};
export function mnemonic(attack,defend,era='6') {
  const value=effectiveness(attack,defend,era);
  if(era==='1'&&attack==='Ghost'&&defend==='Psychic') return 'An original-game quirk: Ghost passes straight through Psychic. Trust the game’s 0× rule, even though later games reverse it.';
  if(era==='1'&&attack==='Ice'&&defend==='Fire') return 'In Generation I, Ice deals normal damage to Fire. Fire only gains Ice resistance in Generation II.';
  if(era==='2'&&['Ghost','Dark'].includes(attack)&&defend==='Steel') return 'Old steel armor blocks spooky shadows. Steel resists Ghost and Dark only in Generations II–V.';
  if(value===2||value===0) return memories[`${attack}>${defend}`]||`${attack} deals ${multiplier(value)} damage to ${defend}.`;
  if(value===.5) {
    if(resistanceMemories[`${attack}>${defend}`]) return `${resistanceMemories[`${attack}>${defend}`]} ${defend} takes half damage from ${attack}.`;
    const reverse=memories[`${defend}>${attack}`];
    return reverse&&effectiveness(defend,attack,era)===2?`${reverse} Here, ${defend} also withstands ${attack}: half damage.`:`Picture ${defend} wearing a shield labeled “${attack}”: this attack does half damage. Memorize this direction; resistance is not always mutual.`;
  }
  return `No special advantage here: ${attack} deals normal damage to ${defend}. Learn the direction—swapping attacker and defender can change the result.`;
}
export function pairsFor(era) { return typesFor(era).flatMap(a=>typesFor(era).map(d=>({a,ds:[d],key:matchupKey(a,[d]),value:effectiveness(a,d,era)}))); }
export const LESSONS = [
 {id:'basics',title:'The first three',tag:'START HERE',description:'Meet Fire, Water, and Grass. Learn who beats whom.',types:['Fire','Water','Grass'],text:'The move’s type attacks the Pokémon’s type. Water beats Fire (2×). Fire beats Grass (2×). Grass beats Water (2×). The reverse attacks are resisted (½×). A type is not the same as a move: a Water Pokémon can use a move of another type.',pairs:[['Water','Fire'],['Fire','Grass'],['Grass','Water'],['Fire','Water'],['Grass','Fire'],['Water','Grass'],['Fire','Fire'],['Water','Water']]},
 {id:'elements',title:'A spark of understanding',tag:'LESSON 02',description:'Electricity, ice, and the difference between 0× and 1×.',types:['Electric','Ice','Ground'],text:'Super effective means 2× damage; resistance means ½×; neutral means 1×; immunity means 0×. Electric beats Water and Flying, but cannot hit Ground at all. Ice beats Grass, Ground, Flying, and Dragon. Type advantage alone is not a guaranteed win.',pairs:[['Electric','Water'],['Electric','Ground'],['Ice','Grass'],['Ice','Ground'],['Electric','Flying'],['Ice','Dragon'],['Electric','Fire'],['Ice','Fire']]},
 {id:'physical',title:'Earth, sky & a little muscle',tag:'LESSON 03',description:'Connect physical types with pictures you can remember.',types:['Rock','Ground','Flying','Fighting','Bug'],text:'Ground is soil; Rock is stone. They are different types. Ground beats Electric but Rock does not. Birds eat bugs, rocks knock birds down, and fighters smash rocks. Remember the attack’s direction: Flying attacks hit Ground normally, but Ground attacks cannot hit Flying.',pairs:[['Ground','Electric'],['Rock','Electric'],['Flying','Bug'],['Rock','Flying'],['Fighting','Rock'],['Ground','Flying'],['Bug','Grass'],['Rock','Ice']]},
 {id:'strange',title:'Expect the unexpected',tag:'LESSON 04',description:'Learn Psychic, Poison, Ghost, and tricky immunities.',types:['Psychic','Poison','Ghost','Normal'],text:'Some rules are game logic rather than everyday logic. Normal and Fighting attacks cannot hit Ghost. Psychic beats Fighting and Poison. Ghost beats Psychic in Generation II onward, but does no damage in Generation I. The selected era always determines the correct answer.',pairs:[['Normal','Ghost'],['Fighting','Ghost'],['Psychic','Fighting'],['Psychic','Poison'],['Ghost','Psychic'],['Bug','Poison'],['Poison','Bug'],['Ghost','Normal']]},
 {id:'later',title:'The chart grows up',tag:'LESSON 05',description:'Discover the types added in later games.',types:['Dark','Steel','Fairy'],text:'Generation II adds Dark and Steel. Dark is immune to Psychic. Steel is immune to Poison. Generation VI adds Fairy, which is immune to Dragon and weak to Steel and Poison. Steel loses its Ghost and Dark resistances in Generation VI.',pairs:[['Psychic','Dark'],['Poison','Steel'],['Fighting','Dark'],['Fire','Steel'],['Ghost','Steel'],['Dark','Steel'],['Dragon','Fairy'],['Steel','Fairy']]},
 {id:'dual',title:'Two types. One calculation.',tag:'LESSON 06',description:'Multiply the matchups to unlock 4× and ¼× damage.',types:['Fire','Flying','Rock'],text:'For two different defending types, multiply both matchups. Rock → Fire/Flying is 2× × 2× = 4×. Grass → Fire/Flying is ½× × ½× = ¼×. Water → Water/Ground is ½× × 2× = 1×. An immunity makes the whole result zero. These are chart multipliers; abilities, moves, weather, and Terastallization can add other rules.',pairs:[['Rock','Fire','Flying'],['Grass','Fire','Flying'],['Water','Water','Ground'],['Electric','Water','Ground'],['Ice','Ground','Flying'],['Fire','Grass','Water'],['Ground','Rock','Flying'],['Water','Fire','Ground']]}
];
