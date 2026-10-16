// Decorative memory cues beside formal type names in explanatory prose.
const EMOJI={Normal:'⚪',Fire:'🔥',Water:'💧',Electric:'⚡',Grass:'🌿',Ice:'❄️',Fighting:'🥊',Poison:'☠️',Ground:'🌍',Flying:'🪽',Psychic:'🔮',Bug:'🐛',Rock:'🪨',Ghost:'👻',Dragon:'🐉',Dark:'🌑',Steel:'⚙️',Fairy:'🧚'};
const typeWords=new RegExp(`\\b(${Object.keys(EMOJI).map(t=>t==='Ground'?'Ground(?!\\s+Zero\\b)':t).join('|')})\\b`,'g');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function typeText(text){
  return String(text).split(typeWords).map(part=>Object.hasOwn(EMOJI,part)?`<span class="type-word"><span class="type-text-emoji" aria-hidden="true">${EMOJI[part]}</span>${part}</span>`:escape(part)).join('');
}
