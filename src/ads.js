import {AD_CONFIG} from './ads-config.js';

export const validPublisher=id=>typeof id==='string'&&/^ca-pub-(?!0{16}$)\d{16}$/.test(id);
export const validSlot=id=>typeof id==='string'&&/^(?!0+$)\d{1,20}$/.test(id);
export const adsEnabled=config=>config?.mode==='live'&&validPublisher(config.publisherId)&&validSlot(config.homeSlotId)&&config.consentConfigured===true;
export function verificationTag(config){
  return ['verification','live'].includes(config?.mode)&&validPublisher(config.publisherId)?`<meta name="google-adsense-account" content="${config.publisherId}">`:'';
}
export function adsTxt(config){
  return verificationTag(config)?`google.com, ${config.publisherId.slice(3)}, DIRECT, f08c47fec0942fa0\n`:'';
}

// Keep the ad outside #app: ordinary UI renders must not replace or refresh it.
export function createAdController(config,{setVisible,requestAd,canDisplay=()=>true}){
  let requested=false,failed=false;
  return async view=>{
    const visible=adsEnabled(config)&&view==='home'&&canDisplay()&&!failed;
    setVisible(visible);
    if(!visible||requested)return;
    requested=true;
    try{await requestAd(config);}catch{failed=true;setVisible(false);}
  };
}

function preparePrivacyChoices(win,doc){
  win.googlefc=win.googlefc||{};
  win.googlefc.callbackQueue=win.googlefc.callbackQueue||[];
  win.googlefc.callbackQueue.push({CONSENT_API_READY:()=>{
    const button=doc.getElementById('ad-privacy-choices');
    if(button)button.hidden=false;
  }});
  doc.getElementById('ad-privacy-choices')?.addEventListener('click',()=>{
    win.googlefc.callbackQueue.push({CONSENT_API_READY:()=>win.googlefc.showRevocationMessage()});
  });
}

export function mountAdPlacement(doc,win,config=AD_CONFIG){
  const host=doc.getElementById('home-ad');
  if(!host)return ()=>{};
  return createAdController(config,{
    setVisible:visible=>{host.hidden=!visible;},
    canDisplay:()=>win.location.protocol==='https:'&&!['localhost','127.0.0.1','[::1]'].includes(win.location.hostname)&&!doc.hidden,
    requestAd:async settings=>{
      preparePrivacyChoices(win,doc);
      const unit=doc.createElement('ins');
      unit.className='adsbygoogle';unit.style.display='block';
      unit.dataset.adClient=settings.publisherId;unit.dataset.adSlot=settings.homeSlotId;
      unit.dataset.adFormat='horizontal';unit.dataset.fullWidthResponsive='false';
      host.querySelector('.ad-unit').append(unit);
      const script=doc.createElement('script');script.async=true;script.crossOrigin='anonymous';
      script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.publisherId}`;
      await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;doc.head.append(script);});
      // The visitor may have entered a lesson while the provider was loading.
      if(host.hidden||doc.hidden){await new Promise(resolve=>{
        const ready=()=>{
          if(host.hidden||doc.hidden)return;
          observer.disconnect();doc.removeEventListener('visibilitychange',ready);resolve();
        };
        const observer=new win.MutationObserver(ready);
        observer.observe(host,{attributes:true,attributeFilter:['hidden']});
        doc.addEventListener('visibilitychange',ready);
        ready();
      });}
      if(!unit.isConnected||host.hidden||doc.hidden)return;
      (win.adsbygoogle=win.adsbygoogle||[]).push({});
    }
  });
}
