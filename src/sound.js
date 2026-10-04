// Original, short musical cues. No downloaded audio or background soundtrack.
export const CUES={
  tap:[[440,0,.055]],
  start:[[392,0,.09],[523.25,.09,.12]],
  correct:[[523.25,0,.10],[659.25,.09,.10],[783.99,.18,.16]],
  reflect:[[392,0,.13],[349.23,.11,.16]],
  complete:[[523.25,0,.12],[659.25,.13,.12],[783.99,.26,.22]],
  buddy:[[659.25,0,.075],[783.99,.075,.12]]
};

export function createSoundPlayer({createContext=()=>{
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  return Audio?new Audio():null;
},isHidden=()=>globalThis.document?.hidden===true,now=()=>Date.now()}={}){
  let context=null,enabled=true,volume=25,lastPlayed=-Infinity,revision=0;
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
    volume=Number.isFinite(options.volume)?Math.max(0,Math.min(100,options.volume)):25;
    stop();
  }
  async function play(name){
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
      for(const [frequency,offset,duration] of CUES[name]){
        const oscillator=context.createOscillator(),gain=context.createGain();
        const at=start+offset,voice={oscillator,gain};
        oscillator.type='sine';
        oscillator.frequency.setValueAtTime(frequency,at);
        gain.gain.setValueAtTime(0,at);
        gain.gain.linearRampToValueAtTime(.08*volume/100,at+.012);
        gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
        oscillator.connect(gain);gain.connect(context.destination);
        voices.add(voice);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices.delete(voice);};
        oscillator.start(at);oscillator.stop(at+duration+.015);
      }
      return true;
    }catch{stop();return false;} // Learning still works when audio is unavailable.
  }
  return {configure,play,stop};
}
