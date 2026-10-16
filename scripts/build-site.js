// GitHub Pages only needs the app and its public assets.
import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {AD_CONFIG} from '../src/ads-config.js';
import {verificationTag} from '../src/ads.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(root,'_site');
// Verify the absolute target before cleaning the generated directory.
if(path.relative(root,output)!=='_site')throw new Error('Build output must stay inside this repository.');
console.log(`Building static site in ${output}`);
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const entry of ['index.html','privacy.html','about.html','favicon.svg','src','assets']){
  await cp(path.join(root,entry),path.join(output,entry),{recursive:true});
}
const tag=verificationTag(AD_CONFIG);
if(tag){
  const {readFile}=await import('node:fs/promises');
  const entry=path.join(output,'index.html');
  await writeFile(entry,(await readFile(entry,'utf8')).replace('</head>',`  ${tag}\n</head>`));
}
await writeFile(path.join(output,'.nojekyll'),'');
console.log('GitHub Pages artifact ready.');
