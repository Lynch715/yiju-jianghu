import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {CARD,RELICS} from '../data.js';
import {RELIC_ART,relicIcon} from '../relic-art.js';
import {CARD_ART,CARD_ART_THEMES,cardArtwork} from '../card-art.js';
import {ENEMIES} from '../enemies.js';
import {PLAYERS} from '../players.js';
const root=new URL('../',import.meta.url);
test('every playable and temporary card has a deliberate illustration assignment',()=>{
 assert.deepEqual(Object.keys(CARD_ART).sort(),Object.keys(CARD).sort());
 for(const id of Object.keys(CARD))assert.ok(cardArtwork(id)?.art,id);
 const prompts=JSON.parse(readFileSync(new URL('art/card-prompts.json',root),'utf8'));
 for(const theme of Object.values(CARD_ART_THEMES))assert.ok(prompts.some(p=>p.id===theme.id&&p.file===theme.art&&p.prompt.includes('Subject:')));
});
test('runtime artwork is valid WebP with a bounded mobile download budget',()=>{
 const art=[...ENEMIES,...PLAYERS,...Object.values(CARD_ART_THEMES)];let total=0;
 for(const d of art){const bytes=readFileSync(new URL(d.art,root));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length<90000,d.art);total+=bytes.length;}
 assert.ok(total<1500000,`all runtime art uses ${total} bytes`);
});
test('standalone embeds all art and Pages ships only the current lightweight assets',()=>{
 const html=readFileSync(new URL('dist/index.html',root),'utf8');
 assert.ok(html.includes('data:image/webp;base64,'));assert.ok(!html.includes('data:image/png;base64,'));
 assert.ok(!html.includes('art:`assets/'));assert.ok(Buffer.byteLength(html)<2300000);
 const manifest=JSON.parse(readFileSync(new URL('docs/release.json',root),'utf8'));
 const expected=[...ENEMIES,...PLAYERS,...Object.values(CARD_ART_THEMES)].map(d=>d.art).sort();
 assert.deepEqual(manifest.files.filter(f=>f.path.startsWith('assets/')).map(f=>f.path).sort(),expected);
 for(const file of manifest.files)assert.equal(statSync(new URL('docs/'+file.path,root)).size,file.bytes);
});

test('all 30 relics have unique object art with self-contained and noncolliding SVG definitions',()=>{
 assert.deepEqual(Object.keys(RELIC_ART).sort(),RELICS.map(r=>r.id).sort());
 assert.equal(new Set(Object.values(RELIC_ART)).size,30);
 const seen=new Set();
 for(const r of [...RELICS,...RELICS]){
  const svg=relicIcon(r.id);assert.ok(svg.includes(r.name+'外观'));assert.ok(!/<(?:script|image)|https?:|href=/i.test(svg.replace('http://www.w3.org/2000/svg','')));
  const ids=[...svg.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);for(const id of ids){assert.ok(!seen.has(id));seen.add(id);}
  for(const ref of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(ref[1]));
 }
 assert.equal(relicIcon('unknown'),'');assert.ok(Buffer.byteLength(readFileSync(new URL('relic-art.js',root),'utf8'))<20000);
});
