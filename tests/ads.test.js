import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {AD_CONFIG} from '../src/ads-config.js';
import {adsEnabled,verificationTag,adsTxt,createAdController,mountAdPlacement} from '../src/ads.js';

const configured={mode:'live',publisherId:'ca-pub-1234567890123456',homeSlotId:'1234567890',consentConfigured:true};

test('Unconfigured ads, pending consent, and verification mode never request ads',async()=>{
  for(const config of [AD_CONFIG,{...configured,mode:'off'},{...configured,mode:'verification'},{...configured,consentConfigured:false},{...configured,publisherId:''},{...configured,homeSlotId:''},{...configured,publisherId:'ca-pub-123<script>'}]){
    let calls=0,visible=true;
    const update=createAdController(config,{setVisible:v=>visible=v,requestAd:async()=>calls++});
    await update('home');await update('practice');await update('home');
    assert.equal(calls,0);assert.equal(visible,false);assert.equal(adsEnabled(config),false);
  }
});

test('One unit per document survives ordinary renders and navigation without ad refresh',async()=>{
  let calls=0,visible=false;
  const update=createAdController(configured,{setVisible:v=>visible=v,requestAd:async()=>calls++});
  for(const view of ['learn','practice','chart','library','progress']){await update(view);assert.equal(calls,0);assert.equal(visible,false);}
  await update('home');assert.equal(calls,1);assert.equal(visible,true);
  for(const view of ['home','home','learn','practice','home','progress','home'])await update(view);
  assert.equal(calls,1);assert.equal(visible,true);
});

test('Hidden pages defer the initial request and provider failure collapses the placement without retries',async()=>{
  let canDisplay=false,calls=0,visible;
  const update=createAdController(configured,{canDisplay:()=>canDisplay,setVisible:v=>visible=v,requestAd:async()=>{calls++;throw new Error('Blocked');}});
  await update('home');assert.equal(calls,0);assert.equal(visible,false);
  canDisplay=true;await update('home');assert.equal(calls,1);assert.equal(visible,false);
  await update('home');assert.equal(calls,1);assert.equal(visible,false);
});

test('Localhost is ad-free even with live IDs, and disabled placement never initializes third-party globals',async()=>{
  for(const hostname of ['localhost','127.0.0.1','[::1]']){
    const host={hidden:true},doc={hidden:false,getElementById:id=>id==='home-ad'?host:null};
    const win={location:{hostname,protocol:'https:'}};
    const update=mountAdPlacement(doc,win,configured);await update('home');
    assert.equal(host.hidden,true);assert.equal(win.googlefc,undefined);assert.equal(win.adsbygoogle,undefined);
  }
});

test('Verification metadata and ads.txt use the actual account ID and reject placeholders or injection',()=>{
  assert.equal(verificationTag({...configured,mode:'verification'}),'<meta name="google-adsense-account" content="ca-pub-1234567890123456">');
  assert.equal(adsTxt(configured),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  for(const id of ['', 'ca-pub-REPLACE_ME','ca-pub-0000000000000000','ca-pub-1234567890123456" onload="bad']){
    assert.equal(verificationTag({...configured,publisherId:id}), '');assert.equal(adsTxt({...configured,publisherId:id}), '');
  }
  assert.equal(verificationTag({...configured,mode:'off'}),'');assert.equal(adsTxt({...configured,mode:'off'}),'');
});

test('Privacy and contact pages have working local assets without third-party ad scripts',()=>{
  for(const name of ['privacy.html','about.html']){
    const html=readFileSync(new URL('../'+name,import.meta.url),'utf8');
    for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]*)(?:#[^"]*)?"/g))assert.ok(existsSync(new URL('../'+match[1],import.meta.url)),`${name}: ${match[1]}`);
    assert.ok(!html.includes('pagead2.googlesyndication.com'));
  }
});
