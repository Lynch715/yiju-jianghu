import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Game,clone,SAVE_VERSION} from '../engine.js';
import {ENEMIES,ENEMY,ENCOUNTERS} from '../enemies.js';
import {CHAPTERS} from '../data.js';
function spawn(id,key=0,round=0){const d=ENEMY[id];return {id,name:d.name,kind:d.rank==='normal'?'bandit':d.rank,hp:d.hp-10,maxHp:d.hp,key,round,str:0,weak:0,vuln:0,pin:0,charge:0,block:0,enraged:false};}
function duel(id,round=0){const g=new Game();g.start(42,{opening:false,classic:true});g.s.step=ENEMY[id].chapter*6;g.combat(ENEMY[id].rank==='normal'?'battle':ENEMY[id].rank);g.s.relics=[];g.s.hp=g.s.maxHp=4000;const b=g.s.b;b.hand=[];b.draw=[];b.discard=[];b.enemies=[spawn(id,0,round)];b.enemies[0].intent=g.enemyIntent(b.enemies[0]);return g;}
function allPiles(g){const b=g.s.b;return [...b.hand,...b.draw,...b.discard,...b.exhaust];}
for(const d of ENEMIES)test(`${d.name}: each announced technique applies its actual numerical effects`,()=>{
 for(let round=0;round<d.moves.length;round++){
  const g=duel(d.id,round),e=g.s.b.enemies[0],i=e.intent,b=g.s.b,hp=g.s.hp,enemyHp=e.hp;
  assert.equal(i.label,d.moves[round].label);const announced=g.previewEnemy(e)*(i.hits||1);assert.equal(g.endTurn(),true);
  assert.equal(hp-g.s.hp,announced+(i.poison||0),i.label+' health damage');assert.equal(e.block,i.block||0,i.label+' block');assert.equal(e.str,i.str||0);
  assert.equal(e.hp-enemyHp,i.leech?Math.min(i.leech,announced,10):0,i.label+' life steal');assert.equal(e.charge,i.charge||0);
  assert.equal(b.weak,i.weak||0);assert.equal(b.vuln,i.vuln||0);assert.equal(b.poison||0,Math.max(0,(i.poison||0)-1));assert.equal(b.qi,3-(i.chill||0));
  assert.equal(allPiles(g).filter(c=>c.id==='QI').length,i.status||0);assert.equal(g.s.phase,'battle');
 }
});
test('all three chapters generate their actual named foes and all 16 identities are reachable',()=>{
 const seen=new Set();for(let chapter=0;chapter<3;chapter++)for(const kind of ['battle','elite','boss'])for(let seed=0;seed<60;seed++){
  const g=new Game();g.start(seed,{opening:false,classic:true});g.s.step=chapter*6+(kind==='boss'?5:kind==='elite'?2:0);assert.equal(g.enter(kind),true);
  for(const e of g.s.b.enemies){const d=ENEMY[e.id];assert.ok(d);assert.equal(d.chapter,chapter);assert.equal(e.name,d.name+(e.callSign?'·'+e.callSign:''));assert.equal(e.intent.label,d.moves[e.round%d.moves.length].label);seen.add(e.id);}
  if(kind==='boss')assert.equal(g.s.b.enemies[0].name,CHAPTERS[chapter].boss);
 }
 assert.equal(seen.size,16);assert.equal(ENCOUNTERS.length,3);
});
test('poison ignores block, ticks once per enemy turn and decays to zero',()=>{
 const g=duel('xingxiu'),b=g.s.b,e=b.enemies[0];b.poison=3;b.block=999;const before=g.s.hp;
 for(let n=0;n<4;n++){e.intent={label:'静候'};g.endTurn();}
 assert.equal(before-g.s.hp,6);assert.equal(b.poison,0);
});
test('cold pressure is capped at two and expires after its affected player turn',()=>{
 const g=duel('hebiweng'),e=g.s.b.enemies[0];e.intent={label:'寒气测试',chill:9};g.endTurn();assert.equal(g.s.b.qi,1);assert.equal(g.s.b.qiPenalty,2);
 e.intent={label:'静候'};g.endTurn();assert.equal(g.s.b.qi,3);assert.equal(g.s.b.qiPenalty,0);
});
test('a full block prevents blood-drinking healing; partial damage caps healing at actual HP lost',()=>{
 for(const block of [20,8,0]){const g=duel('xuedaolaozu',1),b=g.s.b,e=b.enemies[0],before=e.hp;b.block=block;g.endTurn();assert.equal(e.hp-before,block===20?0:block===8?2:4);}
});
test('Xuanming partners protect one another and killing the crane breaks the deer combo',()=>{
 const g=duel('hebiweng'),b=g.s.b,he=spawn('hebiweng',0,2),lu=spawn('luzhangke',1,2);b.enemies=[he,lu];he.intent=g.enemyIntent(he);lu.intent=g.enemyIntent(lu);g.endTurn();assert.equal(he.block,6);assert.equal(lu.block,11);
 he.intent={label:'观战'};lu.intent=clone(ENEMY.luzhangke.moves[1]);assert.equal(g.previewEnemy(lu),9);const hp=g.s.hp;g.endTurn();assert.equal(hp-g.s.hp,9);
 he.hp=0;lu.intent=clone(ENEMY.luzhangke.moves[1]);assert.equal(g.previewEnemy(lu),7);const after=g.s.hp;g.endTurn();assert.equal(after-g.s.hp,7);
});
test('enemy vulnerability lasts for incoming attacks and multi-foe intent preview includes preceding debuffs',()=>{
 const g=duel('riyue'),b=g.s.b,e=b.enemies[0];b.vuln=1;e.intent={label:'试剑',damage:10};assert.equal(g.previewEnemy(e),15);const hp=g.s.hp;g.endTurn();assert.equal(hp-g.s.hp,15);assert.equal(b.vuln,0);
 const first=spawn('riyue'),second=spawn('baituo',1);b.enemies=[first,second];first.intent={label:'破防',vuln:1};second.intent={label:'突袭',damage:10};assert.equal(g.previewEnemy(second),15);const before=g.s.hp;g.endTurn();assert.equal(before-g.s.hp,15);
});
test('Ouyang charge is spent by the next attack and his half-health transition updates visible intent immediately',()=>{
 const g=duel('ouyangfeng',1),b=g.s.b,e=b.enemies[0];g.endTurn();assert.equal(e.charge,4);assert.equal(e.intent.label,'蛤蟆功');assert.equal(g.previewEnemy(e),23);const hp=g.s.hp;g.endTurn();assert.equal(hp-g.s.hp,23);assert.equal(e.charge,0);
 e.hp=94;e.charge=4;const c=g.make('W01');b.hand=[c];b.qi=3;assert.equal(g.play(c.uid,0).ok,true);assert.equal(e.enraged,true);assert.equal(e.round,0);assert.equal(e.charge,0);assert.equal(e.intent.label,'逆练蛤蟆功');assert.ok(b.log.some(x=>x.includes('进入逆练阶段')));
 const prior=g.s.hp;g.endTurn();assert.equal(g.s.hp,prior);assert.equal(e.str,1);assert.equal(e.charge,2);assert.equal(e.intent.label,'逆转经脉');assert.equal(g.previewEnemy(e),7);g.endTurn();assert.equal(prior-g.s.hp,21);assert.equal(e.charge,0);
});
test('first-hit reduction and reflect work for each segment of Tian Boguang fast blades',()=>{
 const g=duel('tianboguang'),b=g.s.b,e=b.enemies[0];e.pin=2;b.block=20;b.reflectPool=20;const hp=e.hp;assert.equal(g.previewEnemy(e,0),1);assert.equal(g.previewEnemy(e,1),3);g.endTurn();assert.equal(e.hp,hp-7);assert.equal(g.s.hp,4000);
});
test('new combat statuses, partner intents and charge survive a deterministic save roundtrip',()=>{
 const g=duel('ouyangfeng',1);g.endTurn();g.s.b.poison=2;g.s.b.nextQiLoss=1;const saved=clone(g.s),restored=new Game(saved);assert.deepEqual(restored.s,saved);g.endTurn();restored.endTurn();assert.deepEqual(restored.s,g.s);
});
test('pre-portrait battles map to novel characters without losing their HP, RNG or currently shown action',()=>{
 const g=duel('yucanghai');g.s.step=5;g.s.version=3;const e=g.s.b.enemies[0];delete e.id;e.name='黑风寨主';e.hp=42;e.maxHp=90;e.intent={label:'旧预告',damage:11};const saved=clone(g.s),restored=new Game(saved),newEnemy=restored.s.b.enemies[0];
 assert.equal(restored.s.version,SAVE_VERSION);assert.equal(newEnemy.id,'yucanghai');assert.equal(newEnemy.name,'余沧海');assert.equal(newEnemy.hp,42);assert.equal(newEnemy.maxHp,90);assert.deepEqual(newEnemy.intent,saved.b.enemies[0].intent);assert.equal(restored.s.rng,saved.rng);assert.equal(saved.b.enemies[0].name,'黑风寨主');
});
test('all enemy runtime portraits exist and each character has its own prompt',()=>{
 const prompts=JSON.parse(readFileSync(new URL('../art/enemy-prompts.json',import.meta.url),'utf8'));assert.equal(prompts.length,ENEMIES.length);assert.equal(new Set(prompts.map(x=>x.id)).size,ENEMIES.length);
 for(const d of ENEMIES){assert.ok(prompts.some(x=>x.id===d.id&&x.name===d.name&&x.prompt.includes('Subject:')));for(const path of [d.art,...(existsSync(new URL(`../assets/enemies/${d.id}.png`,import.meta.url))?[`assets/enemies/${d.id}.png`]:[])]){const bytes=readFileSync(new URL('../'+path,import.meta.url));if(bytes.subarray(1,4).toString()!=='PNG'){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}assert.ok(bytes.length>10000,d.name);}}
});

test('defeating the last foe by reflect ends combat before a pending poison tick',()=>{
 const g=duel('qingcheng'),b=g.s.b,e=b.enemies[0];e.hp=1;e.intent={label:'试剑',damage:5};g.s.hp=1;b.block=5;b.reflectPool=5;b.poison=9;g.endTurn();assert.equal(g.s.phase,'reward');assert.ok(g.s.hp>0);
});
