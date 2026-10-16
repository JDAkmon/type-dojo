// Prepare the domain-root files AdSense needs; publishing them is a separate step.
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {AD_CONFIG} from '../src/ads-config.js';
import {validPublisher,verificationTag,adsTxt} from '../src/ads.js';

if(!validPublisher(AD_CONFIG.publisherId)||!verificationTag(AD_CONFIG)){
  throw new Error('Add your actual public publisher ID and use verification or live mode first. No placeholder ads.txt will be generated.');
}
const root=fileURLToPath(new URL('../',import.meta.url)),output=path.resolve(root,'_adsense-root');
if(path.relative(root,output)!=='_adsense-root')throw new Error('Root preview must stay inside the repository.');
console.log(`Preparing AdSense domain-root files in ${output}`);
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
const html=await readFile(new URL('../deploy/adsense-root.html',import.meta.url),'utf8');
await writeFile(path.join(output,'index.html'),html.replace('<!-- ADSENSE_VERIFICATION -->',verificationTag(AD_CONFIG)));
await writeFile(path.join(output,'ads.txt'),adsTxt(AD_CONFIG));
await writeFile(path.join(output,'.nojekyll'),'');
console.log('Publish these files at https://jdakmon.github.io/ (not under /type-dojo/).');
