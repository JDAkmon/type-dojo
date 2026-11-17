import {pairsFor, typesFor, dualEffectiveness} from './data.js';
import {matchupKey} from './matchup.js';
export const dayKey=(now=Date.now())=>new Date(now).toISOString().slice(0,10);
export function validDay(day){return typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && dayKey(Date.parse(day))===day;}
export const EVOLUTIONS={1:[[1,'Bulbasaur'],[2,'Ivysaur'],[3,'Venusaur']],4:[[4,'Charmander'],[5,'Charmeleon'],[6,'Charizard']],7:[[7,'Squirtle'],[8,'Wartortle'],[9,'Blastoise']]};
export function evolutionStage(bucket){const recall=Object.values(bucket.records).filter(r=>r.retained&&r.streak>=3).length;return Math.max(bucket.buddyStage||0,bucket.lessons.length>=5&&recall>=10?2:bucket.lessons.length>=2?1:0);}
export function evolvedBuddy(id,bucket){const line=EVOLUTIONS[id];if(!line)return null;const [species,name]=line[evolutionStage(bucket)];return {id:species,name};}
// Versioned, deterministic shuffle: independent of personal progress and timezone.
export function dailyQuestions(era,day){
 if(!validDay(day)||!['1','2','6'].includes(era))throw new Error('Invalid daily challenge.');
 let seed=2166136261;for(const c of 'dojo-v1:'+era+':'+day)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const choose=pool=>pool[Math.floor(random()*pool.length)];
 const pairs=pairsFor(era), questions=[0,.5,1,2].map(value=>choose(pairs.filter(q=>q.value===value)));
 const ts=typesFor(era),a=choose(ts),d=choose(ts),e=choose(ts.filter(t=>t!==d)),ds=[d,e];
 questions.push({a,ds,key:matchupKey(a,ds),value:dualEffectiveness(a,ds,era)});
 for(let i=questions.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[questions[i],questions[j]]=[questions[j],questions[i]];}return questions;
}
export function dailyShare(day,era,score){return `Type Dojo · Daily Gym · ${day} UTC\n${era==='1'?'Gen I':era==='2'?'Gen II–V':'Gen VI+'} · ${score}/5 · First completed attempt\nhttps://jdakmon.github.io/type-dojo/#home`;}
