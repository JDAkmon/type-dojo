// Original, short musical cues. No downloaded audio or background soundtrack.
export const CUES={
  tap:[[440,0,.055]],
  start:[[392,0,.09],[523.25,.09,.12]],
  correct:[[523.25,0,.10],[659.25,.09,.10],[783.99,.18,.16]],
  reflect:[[392,0,.13],[349.23,.11,.16]],
  complete:[[523.25,0,.12],[659.25,.13,.12],[783.99,.26,.22]],
  buddy:[[659.25,0,.075],[783.99,.075,.12]],
  badge:[[523.25,0,.09],[659.25,.09,.09],[783.99,.18,.09],[1046.5,.29,.23]]
};
export const ELEMENT_CUES={
  water:[[1200,0,.17,'noise',500,.3],[440,.02,.08,'sine',660,.5],[660,.09,.10,'sine',880,.4]],
  fire:[[800,0,.07,'noise',400,.35],[1100,.06,.07,'noise',600,.25],[500,.12,.08,'noise',250,.2]],
  electric:[[500,0,.06,'triangle',1200,.5],[900,.06,.08,'triangle',1500,.35],[1400,.14,.05,'sine',600,.3]],
  ice:[[1046,0,.10,'sine',1568,.35],[1568,.08,.10,'sine',2093,.25]],
  earth:[[180,0,.14,'triangle',70,.5],[600,.03,.13,'noise',220,.2]],
  airy:[[900,0,.18,'noise',1800,.2]],
  magic:[[659,0,.09,'sine',784,.4],[988,.08,.12,'sine',1318,.3]],
  leaf:[[1400,0,.10,'noise',700,.2],[523,.06,.12,'sine',659,.3]]
};
const ELEMENTS={Water:'water',Fire:'fire',Electric:'electric',Ice:'ice',Ground:'earth',Rock:'earth',Steel:'earth',Fighting:'earth',Normal:'earth',Flying:'airy',Bug:'leaf',Grass:'leaf',Poison:'magic',Psychic:'magic',Ghost:'magic',Dark:'magic',Dragon:'magic',Fairy:'magic'};

export function createSoundPlayer({createContext=()=>{
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  return Audio?new Audio():null;
},isHidden=()=>globalThis.document?.hidden===true,now=()=>Date.now()}={}){
  let context=null,enabled=true,battleEffects=true,volume=25,lastPlayed=-Infinity,revision=0;
  const voices=new Set();
  function stop(){
    revision++;
    for(const voice of voices){
      // Disconnect immediately so muting also silences already scheduled notes.
      try{voice.gain.disconnect();voice.oscillator.stop();}catch{}
    }
    voices.clear();
  }
  function configure(options){
    enabled=options.enabled!==false;
    battleEffects=options.battleEffects!==false;
    volume=Number.isFinite(options.volume)?Math.max(0,Math.min(100,options.volume)):25;
    stop();
  }
  async function play(name,prefix=[]){
    if(!enabled||volume===0||isHidden()||!CUES[name])return false;
    const time=now();
    if(time-lastPlayed<100)return false;
    lastPlayed=time;
    stop();
    const token=revision;
    try{
      context??=createContext();
      if(!context)return false;
      if(context.state!=='running')await context.resume();
      if(token!==revision||!enabled||volume===0||isHidden()||context.state!=='running')return false;
      const start=context.currentTime+.008;
      const notes=[...prefix,...CUES[name].map(([f,o,d])=>[f,o+(prefix.length ? .23 : 0),d])];
      for(const [frequency,offset,duration,shape='sine',endFrequency=frequency,level=1] of notes){
        const noise=shape==='noise'&&context.createBuffer&&context.createBufferSource&&context.createBiquadFilter;
        let oscillator,filter=null;
        if(noise){
          oscillator=context.createBufferSource();
          const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
          for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
          oscillator.buffer=buffer;filter=context.createBiquadFilter();filter.type='lowpass';
          filter.frequency.setValueAtTime(frequency,start+offset);filter.frequency.linearRampToValueAtTime(endFrequency,start+offset+duration);
        }else{
          oscillator=context.createOscillator();oscillator.type=shape==='noise'?'sine':shape;
          oscillator.frequency.setValueAtTime(frequency,start+offset);
          oscillator.frequency.linearRampToValueAtTime?.(endFrequency,start+offset+duration);
        }
        const gain=context.createGain();
        const at=start+offset,voice={oscillator,gain};
        gain.gain.setValueAtTime(0,at);
        gain.gain.linearRampToValueAtTime(.08*volume/100*level,at+.012);
        gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
        if(filter){oscillator.connect(filter);filter.connect(gain);}else oscillator.connect(gain);
        gain.connect(context.destination);
        voices.add(voice);
        oscillator.onended=()=>{oscillator.disconnect();filter?.disconnect();gain.disconnect();voices.delete(voice);};
        oscillator.start(at);oscillator.stop(at+duration+.015);
      }
      return true;
    }catch{stop();return false;} // Learning still works when audio is unavailable.
  }
  const playBattle=(type,correct)=>play(correct?'correct':'reflect',battleEffects?(ELEMENT_CUES[ELEMENTS[type]]||[]):[]);
  return {configure,play,playBattle,stop};
}
