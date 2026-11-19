import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {dualEffectiveness} from '../src/data.js';
import {freshState,STORAGE_KEY} from '../src/progress.js';
import {SESSION_KEY} from '../src/session.js';
import {RECOVERY_KEY} from '../src/storage.js';

// Test the built artifact at a Pages-style project path, with isolated saves.
const root=fileURLToPath(new URL('../_site/',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith('/type-dojo/'))throw new Error('Wrong project');
    const file=path.resolve(root,pathname.slice('/type-dojo/'.length)||'index.html');
    if(path.relative(root,file).startsWith('..'))throw new Error('Outside artifact');
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/type-dojo/`;
let browser,passed=0;
const launchOptions={headless:true};
if(process.env.PLAYWRIGHT_EXECUTABLE_PATH)launchOptions.executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH;
async function run(name,fn,options={}){
  const context=await browser.newContext({viewport:{width:1365,height:900},reducedMotion:'reduce',...options});
  const errors=[];
  context.on('page',page=>{
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  });
  try{await fn(await context.newPage(),context);assert.deepEqual(errors,[]);passed++;console.log(`PASS ${name}`);}
  finally{await context.close();}
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
const session=page=>page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),SESSION_KEY);
async function startLesson(page){
  await page.goto(base+'#learn');await page.locator('[data-lesson="basics"]').click();await page.locator('[data-action="lesson-start"]').click();
}
async function correctAnswer(page,era='6'){
  const a=(await page.locator('.battle-types>div').first().locator('.type-badge').textContent()).trim();
  const ds=(await page.locator('.battle-types>div').last().locator('.type-badge').allTextContents()).map(t=>t.trim());
  await page.locator(`[data-answer="${dualEffectiveness(a,ds,era)}"]`).click();
}
try{
  browser=await chromium.launch(launchOptions);
  await run('Learning guides and app introduction are readable without JavaScript',async(page,context)=>{
    const pages=['','guides/index.html','guides/type-effectiveness.html','guides/type-immunities.html','guides/dual-types.html','guides/generation-differences.html'];
    for(const route of pages){
      await page.goto(base+route);assert.equal(await page.locator('h1').count(),1);
      assert.ok((await page.locator('main').textContent()).length>500);
      for(const width of [320,390,1365]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');}
      if(route.includes('guides/')&&!route.endsWith('index.html')){await page.locator('summary').click();assert.equal(await page.locator('details[open]').count(),1);assert.match(await page.locator('link[rel="canonical"]').getAttribute('href'),/https:\/\/jdakmon.github.io\/type-dojo\/guides\//);}
      const links=await page.locator('main a').evaluateAll(as=>as.map(a=>a.href));
      for(const url of new Set(links.filter(u=>u.startsWith(base))))assert.ok((await context.request.get(url.split('#')[0])).ok(),url);
    }
    const sitemap=await (await context.request.get(base+'sitemap.xml')).text();assert.match(sitemap,/guides\/generation-differences.html/);
    if(process.env.AUDIT_SCREENSHOTS){await page.goto(base+'guides/dual-types.html');await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(process.env.AUDIT_SCREENSHOTS,'learning-guide-mobile.png'),fullPage:true});}
  },{javaScriptEnabled:false});

  await run('Daily gym resumes, preserves and shares the first score until reset',async (page,context)=>{
    await page.goto(base);await page.locator('[data-mode="daily"]').click();
    assert.equal(await page.locator('[data-action="hint"]').count(),0);
    for(let i=0;i<5;i++){await correctAnswer(page);if(i===2){await page.reload();assert.equal((await session(page)).answers.length,3);}await page.locator('[data-action="next"]').click();}
    const day=(await session(page)).dailyDay;assert.equal((await saved(page)).eras['6'].daily[day],5);
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.sharedScore=text;}}}));
    await page.locator('[data-action="share-daily"]').click();assert.match(await page.evaluate(()=>window.sharedScore),/5\/5/);
    await page.locator('[data-action="again"]').click();
    for(let i=0;i<5;i++){const q=(await session(page)).questions[i];await page.locator(`[data-answer="${q.value===0?1:0}"]`).click();await page.locator('[data-action="next"]').click();}
    assert.equal((await saved(page)).eras['6'].daily[day],5);
    const otherTab = await context.newPage();
    await otherTab.goto(base);
    await otherTab.locator('[data-action="restart-journey"]').click();
    await otherTab.locator('input[name="reset-scope"][value="era"]').check();
    await otherTab.getByRole('button',{name:'Restart selected progress'}).click();
    const clearedScore = page.getByText('No saved daily score for this date.',{exact:false});
    await clearedScore.waitFor();
    assert.equal(await page.locator('[data-action="share-daily"]').count(),0);
    await page.reload();
    await clearedScore.waitFor();
  });
  await run('Starter evolution renders all stages with local still sprites',async page=>{
    await page.goto(base);
    for(const stage of [0,1,2]){
      await page.evaluate(({key,stage})=>{const s=JSON.parse(localStorage.getItem(key))||{version:1,era:'6',eras:Object.fromEntries(['1','2','6'].map(e=>[e,{records:{},lessons:[],xp:0,days:[],challenge:null,battles:{attempts:0,correct:0}}]))};s.eras['6'].buddyStage=stage;localStorage.setItem(key,JSON.stringify(s));},{key:STORAGE_KEY,stage});
      await page.reload();await page.locator('[data-buddy="7"]').click();
      assert.match(await page.locator('.evolution-card>b').textContent(),new RegExp(['Squirtle','Wartortle','Blastoise'][stage]));
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete));assert.equal(await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).length),0);
    }
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.AUDIT_SCREENSHOTS){await mkdir(process.env.AUDIT_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.AUDIT_SCREENSHOTS,'daily-evolution-mobile.png'),fullPage:true});}
  });

  await run('Mobile library and navigation fit 320px and 390px; desktop also fits',async page=>{
    for(const width of [320,390,1365]){
      await page.setViewportSize({width,height:844});
      for(const route of ['home','learn','practice','library','chart','progress']){
        await page.goto(base+'#'+route);await page.locator('main h1').waitFor();
        await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
        const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.naturalWidth).length}));
        assert.ok(dimensions.scroll<=width,`${route} at ${width}px expands to ${dimensions.scroll}px`);
        assert.equal(dimensions.broken,0);
      }
    }
    await page.setViewportSize({width:390,height:844});await page.goto(base+'#library');
    await page.locator('[data-type="Steel"]').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.AUDIT_SCREENSHOTS){await mkdir(process.env.AUDIT_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.AUDIT_SCREENSHOTS,'mobile-library-fixed.png'),fullPage:true});}
  });
  await run('Unreadable progress is archived and can be downloaded before replacement',async page=>{
    const state=freshState();state.eras['6'].xp=1000;state.eras['6'].days=['invalid-day'];
    const raw=JSON.stringify(state);
    await page.goto(base);await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:STORAGE_KEY,raw});await page.reload();
    await page.locator('[data-action="recover-save"]').waitFor();
    await page.locator('#era').selectOption('2');
    const archive=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),RECOVERY_KEY);
    assert.equal(archive[0].raw,raw);assert.equal((await saved(page)).era,'2');
    const download=page.waitForEvent('download');await page.locator('[data-action="recover-save"]').click();
    assert.equal(await readFile(await (await download).path(),'utf8'),raw);
    await page.reload();await page.locator('[data-action="recover-save"]').waitFor();
  });
  await run('A full recovery archive prevents overwriting the original save',async(page,context)=>{
    await context.addInitScript(({key,recovery})=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(k===recovery)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};
      localStorage.setItem(key,'unreadable original');
    },{key:STORAGE_KEY,recovery:RECOVERY_KEY});
    await page.goto(base);await page.locator('#era').selectOption('1');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),'unreadable original');
    await page.locator('[data-action="recover-save"]').waitFor();
  });
  await run('History Back and Forward restore the route for the bare app URL',async page=>{
    await page.goto(base);
    await page.getByRole('link',{name:'Type library',exact:true}).click();
    await page.goBack();
    await page.locator('.pokemon-hero').waitFor();
    assert.equal(page.url(),base);
    await page.goForward();
    await page.locator('.library-layout').waitFor();
    assert.equal(page.url(),base+'#library');
  });
  await run('Skip and navigation links work by keyboard without advancing or losing the quiz',async page=>{
    await page.goto(base);
    await page.locator('[data-mode="attack"]').click();
    const skip = page.getByRole('link',{name:'Skip to content'});
    await skip.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
    assert.equal(page.url(),base+'#practice');
    await page.reload();
    await page.locator('.battle-panel').waitFor();
    await correctAnswer(page);
    await skip.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
    assert.equal((await session(page)).index,0);
    assert.equal((await session(page)).answers.length,1);
    await page.getByRole('link',{name:'Type library',exact:true}).focus();
    await page.keyboard.press('Enter');
    const leavePrompt = page.getByRole('dialog');
    await leavePrompt.getByRole('button',{name:'Keep practicing'}).click();
    assert.equal((await session(page)).index,0);
    await page.goBack();
    await leavePrompt.getByRole('button',{name:'Leave session'}).click();
    await page.locator('.pokemon-hero').waitFor();
    assert.equal(await page.evaluate(()=>location.hash),'');
  });
  await run('Keyboard flow and interrupted lessons resume without replaying answers',async page=>{
    await startLesson(page);
    await page.locator('[data-answer="2"]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'next');
    await page.keyboard.press('Enter');assert.equal((await session(page)).index,1);
    assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H1');
    await page.locator('[data-action="hint"]').click();await page.reload();
    assert.equal((await session(page)).index,1);assert.equal((await session(page)).hint,true);
    assert.equal((await saved(page)).eras['6'].xp,10);await page.locator('.hint-box').waitFor();
  });
  await run('Lesson completion is saved on the final answer and survives a refresh',async page=>{
    await startLesson(page);
    for(let i=0;i<8;i++){await correctAnswer(page);if(i<7)await page.locator('[data-action="next"]').click();}
    assert.deepEqual((await saved(page)).eras['6'].lessons,['basics']);
    await page.reload();assert.equal((await session(page)).index,7);assert.equal((await session(page)).answered,true);
    await page.locator('[data-action="next"]').click();await page.reload();
    assert.equal((await saved(page)).eras['6'].xp,80);await page.locator('.result-panel').waitFor();
    await page.locator('[data-nav="practice"]').first().click();await page.locator('[data-mode="challenge"]').waitFor();
  });
  await run('Challenge badges are awarded before viewing results and only once after reload',async page=>{
    await page.goto(base+'#practice');await page.locator('[data-mode="challenge"]').click();
    for(let i=0;i<20;i++){await correctAnswer(page);if(i<19)await page.locator('[data-action="next"]').click();}
    assert.equal((await saved(page)).eras['6'].challenge.bestCorrect,20);
    await page.reload();await page.locator('[data-action="next"]').click();await page.reload();
    const result=(await saved(page)).eras['6'].challenge;
    assert.equal(result.attempts,1);assert.ok(result.passedAt);await page.locator('.result-panel').waitFor();
  });
  await run('Practice again preserves Water focus and the arena link exits results',async page=>{
    await page.goto(base+'#library');await page.locator('[data-type="Water"]').click();await page.locator('[data-action="type-practice"]').click();
    for(let i=0;i<18;i++){await correctAnswer(page);await page.locator('[data-action="next"]').click();}
    await page.reload();await page.locator('[data-action="again"]').click();
    const next=await session(page);assert.equal(next.questions.length,18);assert.ok(next.questions.every(q=>q.a==='Water'));assert.equal(next.focusType,'Water');
    for(let i=0;i<18;i++){await correctAnswer(page);await page.locator('[data-action="next"]').click();}
    await page.locator('[data-nav="practice"]').first().click();await page.locator('[data-mode="moves"]').waitFor();
    assert.equal(await session(page),null);
  });
  await run('Other tabs share progress without changing the active quiz or its era',async(page,context)=>{
    await startLesson(page);await correctAnswer(page);await page.locator('[data-action="next"]').click();
    const other=await context.newPage();await other.goto(base+'#practice');await other.locator('#era').selectOption('1');
    await other.locator('[data-mode="attack"]').click();await correctAnswer(other,'1');
    assert.equal(await page.locator('#era').inputValue(),'6');
    assert.equal((await session(page)).index,1);await correctAnswer(page);
    const state=await saved(page);assert.equal(state.eras['6'].xp,20);assert.equal(state.eras['1'].xp,10);
    assert.equal(await other.locator('#era').inputValue(),'1');
    await other.reload();assert.equal(await other.locator('#era').inputValue(),'1');await other.locator('.feedback').waitFor();
  });
  await run('Move-choice sessions retain verified choices and scores across reloads in every era',async page=>{
    for(const era of ['1','2','6']){
      await page.goto(base+'#practice');await page.locator('#era').selectOption(era);await page.locator('[data-mode="moves"]').click();
      await page.locator('[data-move="0"]').click();const before=await session(page);await page.reload();
      const after=await session(page);assert.deepEqual(after.answers,before.answers);
      assert.deepEqual(after.questions[0].moves,before.questions[0].moves);
      assert.equal((await saved(page)).eras[era].battles.attempts,1);
      await page.locator('[data-action="exit"]').click();await page.getByRole('dialog').getByRole('button',{name:'Leave session',exact:true}).click();
    }
  });
  console.log(`${passed} browser regressions passed.`);
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
