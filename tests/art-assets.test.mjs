import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {CARD,RELICS} from '../data.js';
import {RELIC_ART,relicIcon} from '../relic-art.js';
import {CARD_ART,CARD_ART_THEMES,cardArtwork} from '../card-art.js';
import {ENEMIES} from '../enemies.js';
import {PLAYERS,HEROES} from '../players.js';
import {BATTLE_SCENES} from '../battle-art.js';
import {JOURNEY_SCENES} from '../journey-art.js';
import {HOME_COVER} from '../home-art.js';
const root=new URL('../',import.meta.url);
test('every playable and temporary card has a deliberate illustration assignment',()=>{
 assert.deepEqual(Object.keys(CARD_ART).sort(),Object.keys(CARD).sort());
 for(const id of Object.keys(CARD))assert.ok(cardArtwork(id)?.art,id);
 const prompts=JSON.parse(readFileSync(new URL('art/card-prompts.json',root),'utf8'));
 for(const theme of Object.values(CARD_ART_THEMES))assert.ok(prompts.some(p=>p.id===theme.id&&p.file===theme.art&&p.prompt.includes('Subject:')));
});
test('runtime artwork is valid WebP with a bounded mobile download budget',()=>{
 const art=[...ENEMIES,...PLAYERS,...HEROES,...Object.values(CARD_ART_THEMES),...BATTLE_SCENES,...JOURNEY_SCENES,HOME_COVER];let total=0;
 for(const d of art){const bytes=readFileSync(new URL(d.art,root));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length<(d===HOME_COVER?512*1024:90000),d.art);if(JOURNEY_SCENES.includes(d))assert.ok(bytes.length<=48*1024,d.art);if(BATTLE_SCENES.includes(d))assert.ok(bytes.length<=72*1024,d.art);total+=bytes.length;}
 assert.ok(total<4800000,`all runtime art uses ${total} bytes`);
});
test('standalone embeds all art and Pages ships only the current lightweight assets',()=>{
 const html=readFileSync(new URL('dist/index.html',root),'utf8');
 assert.ok(html.includes('data:image/webp;base64,'));
 // PNG is reserved for platform icon links; gameplay illustrations must stay WebP.
 assert.ok(!html.slice(html.indexOf('<script type="module">')).includes('data:image/png;base64,'));
 assert.ok(!html.includes(HOME_COVER.art),'offline cover must be embedded');
 assert.ok(!html.includes('art:`assets/'));assert.ok(Buffer.byteLength(html)<6900000);
 const manifest=JSON.parse(readFileSync(new URL('docs/release.json',root),'utf8'));
 const expected=[...[...ENEMIES,...PLAYERS,...HEROES,...Object.values(CARD_ART_THEMES),...BATTLE_SCENES,...JOURNEY_SCENES,HOME_COVER].map(d=>d.art),'assets/icons/icon.svg','assets/icons/icon-512.png','assets/icons/icon-192.png','assets/icons/apple-touch-icon.png','assets/icons/favicon-32.png'].sort();
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

test('title art retains native resolution instead of reusing a card thumbnail',()=>{
 const bytes=readFileSync(new URL(HOME_COVER.art,root));
 assert.equal(bytes.subarray(12,16).toString(),'VP8 ');assert.equal(bytes.subarray(23,26).toString('hex'),'9d012a');
 const width=bytes.readUInt16LE(26)&0x3fff,height=bytes.readUInt16LE(28)&0x3fff;
 assert.ok(width>=1536&&height>=1024,'title illustration must retain the full-size source detail');
 assert.equal(width,HOME_COVER.width);assert.equal(height,HOME_COVER.height);
 assert.notEqual(HOME_COVER.art,cardArtwork('W03').art,'title and card download budgets must stay separate');
});

test('different techniques have distinct composition files and image bytes',()=>{
 const art=Object.keys(CARD).map(id=>cardArtwork(id).art);
 assert.equal(art.length,82);assert.equal(new Set(art).size,82);
 const hashes=art.map(path=>createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'));
 assert.equal(new Set(hashes).size,82);
});
