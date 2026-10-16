import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {POKEMON,spriteUrl} from '../src/pokemon.js';

test('Entry-point assets load under both a domain root and a GitHub Pages project path',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const assets=[...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m=>m[1]);
  assert.ok(assets.length>=8);
  for(const base of ['https://example.github.io/','https://example.github.io/type-dojo/'])for(const asset of assets){
    const resolved=new URL(asset,base);
    assert.ok(resolved.href.startsWith(base),resolved.href);
    assert.ok(existsSync(new URL('../'+asset,import.meta.url)),asset);
  }
});

test('CSS images stay inside the project and point to bundled files',()=>{
  const base='https://example.github.io/type-dojo/';
  for(const name of readdirSync(new URL('../src/',import.meta.url)).filter(n=>n.endsWith('.css'))){
    const local=new URL('../src/'+name,import.meta.url),css=readFileSync(local,'utf8');
    for(const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)){
      const asset=match[1];if(asset.startsWith('data:'))continue;
      assert.ok(new URL(asset,base+'src/'+name).href.startsWith(base),`${name}: ${asset}`);
      assert.ok(existsSync(new URL(asset,local)),`${name}: ${asset}`);
    }
  }
});

test('Sprite URLs follow the module directory and resolve to real local sprite assets',()=>{
  const root=new URL('../',import.meta.url);
  for(const pokemon of POKEMON)for(const animated of [true,false]){
    const url=new URL(spriteUrl(pokemon,animated));
    assert.ok(url.href.startsWith(root.href));assert.ok(existsSync(fileURLToPath(url)));
    assert.ok(url.pathname.endsWith(`/assets/pokemon/${pokemon.id}.${animated?'gif':'png'}`));
  }
});
