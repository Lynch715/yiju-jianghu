import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HEROES,PLAYERS,playerArtwork,validPlayer} from '../players.js';
import {Game,clone} from '../engine.js';
const root=new URL('../',import.meta.url);
test('all eight named heroes have unique dedicated source art, runtime art and saved prompts',()=>{
 const prompts=JSON.parse(readFileSync(new URL('art/hero-prompts.json',root)));assert.equal(prompts.length,HEROES.length);const hashes=new Set();
 for(const h of HEROES){assert.ok(h.art.startsWith('assets/heroes/runtime/'));const source=readFileSync(new URL(`assets/heroes/originals/${h.id}.png`,root)),runtime=readFileSync(new URL(h.art,root));assert.equal(source.subarray(1,4).toString(),'PNG');assert.ok(source.readUInt32BE(16)>=1024);assert.ok(source.readUInt32BE(20)>source.readUInt32BE(16));assert.equal(source[25],6,'RGBA source is required');assert.equal(runtime.subarray(0,4).toString(),'RIFF');assert.equal(runtime.subarray(8,12).toString(),'WEBP');assert.ok(runtime.length<70000);hashes.add(createHash('sha256').update(runtime).digest('hex'));const p=prompts.find(p=>p.id===h.id);assert.equal(p.source,`assets/heroes/originals/${h.id}.png`);assert.ok(p.transparent_background);assert.ok(p.prompt.includes(h.name));assert.ok(p.prompt.includes('Pose:'));}
 assert.equal(hashes.size,HEROES.length);assert.equal(PLAYERS.length,6);
});
test('old named profiles resolve new art without rewriting saved identity or game progress',()=>{
 for(const h of HEROES){const g=new Game();g.start(42);g.chooseHero(h.id);g.finishCharacter();g.s.phase='map';g.combat('battle');const before=clone(g.s);assert.equal(playerArtwork(g.s.player).art,h.art);assert.equal(playerArtwork(g.s.player).title,h.name);assert.deepEqual(g.s,before);const loaded=new Game(before);assert.deepEqual(loaded.s,before);assert.equal(playerArtwork(loaded.s.player).art,h.art);assert.ok(validPlayer(loaded.s.player));}
});
test('custom avatars, explicit costume changes and renamed heroes retain their intended artwork',()=>{
 for(const p of PLAYERS)assert.equal(playerArtwork({name:'自创侠客',portrait:p.id,hero:'custom',talent:'steady'}).art,p.art);
 for(const h of HEROES){assert.equal(playerArtwork({name:'换过名字',hero:h.id,portrait:h.portrait}).art,h.art);const other=PLAYERS.find(p=>p.id!==h.portrait);assert.equal(playerArtwork({name:h.name,hero:h.id,portrait:other.id}).art,other.art);}
 assert.equal(playerArtwork({portrait:'bad'}).id,'male-qing');
});
test('roster, battle, results and records use the shared artwork resolver; both builds include hero assets',()=>{
 const app=readFileSync(new URL('app.js',root),'utf8');assert.match(app,/function playerFigure[^\n]+playerArtwork\(profile\)/);assert.ok(app.includes('playerFigure({hero:h.id,portrait:h.portrait})'));assert.ok(app.includes('playerFigure(r.player'));assert.ok(app.includes('playerFigure()'));
 const manifest=JSON.parse(readFileSync(new URL('docs/release.json',root))),offline=readFileSync(new URL('dist/index.html',root),'utf8');for(const h of HEROES){assert.ok(manifest.files.some(f=>f.path===h.art));assert.ok(!offline.includes(h.art));assert.ok(offline.includes('HERO_IMAGE_DATA'));}
});
