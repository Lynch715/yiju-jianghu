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
 assert.ok(html.includes('data:image/webp;base64,'));
 // PNG is reserved for platform icon links; gameplay illustrations must stay WebP.
 assert.ok(!html.slice(html.indexOf('<script type="module">')).includes('data:image/png;base64,'));
 assert.ok(!html.includes('art:`assets/'));assert.ok(Buffer.byteLength(html)<2300000);
 const manifest=JSON.parse(readFileSync(new URL('docs/release.json',root),'utf8'));
 const expected=[...[...ENEMIES,...PLAYERS,...Object.values(CARD_ART_THEMES)].map(d=>d.art),'assets/icons/icon.svg','assets/icons/icon-512.png','assets/icons/icon-192.png','assets/icons/apple-touch-icon.png','assets/icons/favicon-32.png'].sort();
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

test('home-screen identity and platform icons resolve within the deployed project path',()=>{
 const html=readFileSync(new URL('docs/index.html',root),'utf8'),offline=readFileSync(new URL('dist/index.html',root),'utf8');
 const app=JSON.parse(readFileSync(new URL('docs/manifest.webmanifest',root),'utf8'));
 assert.equal(app.name,'一局一江湖');assert.equal(app.short_name,'一局一江湖');assert.equal(app.display,'standalone');
 const base='https://lynch715.github.io/yiju-jianghu/manifest.webmanifest';
 for(const field of ['id','start_url','scope'])assert.equal(new URL(app[field],base).pathname,'/yiju-jianghu/');
 assert.match(html,/<meta name="apple-mobile-web-app-title" content="一局一江湖">/);
 assert.match(html,/<link rel="manifest" href="manifest.webmanifest\?v=/);
 assert.match(html,/<link rel="apple-touch-icon" href="assets\/icons\/apple-touch-icon.png\?v=/);
 assert.ok(app.icons.some(i=>i.purpose==='maskable'&&i.sizes==='512x512'));
 const pngs=[['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180],['favicon-32.png',32]];
 for(const [name,size] of pngs){const bytes=readFileSync(new URL('docs/assets/icons/'+name,root));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);assert.ok(bytes.length<50000);}
 for(const icon of app.icons)assert.ok(new URL(icon.src,base).pathname.startsWith('/yiju-jianghu/assets/icons/'));
 assert.ok(!/<link rel="manifest"/.test(offline));assert.ok(!/href="assets\/icons\//.test(offline));assert.match(offline,/rel="apple-touch-icon" href="data:image\/png;base64,/);
});
