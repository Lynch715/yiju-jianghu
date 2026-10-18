import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Game,clone} from '../engine.js';
function fight(chapter=0){const g=new Game();g.start(42,{opening:false});g.s.step=chapter*15+14;g.combat('boss');g.s.hp=g.s.maxHp=5000;g.s.relics=[];g.s.b.hand=[];g.s.b.draw=[];g.s.b.discard=[];return g;}
function bossOnly(chapter){const g=fight(chapter);g.s.b.enemies=g.s.b.enemies.slice(0,1);return g;}
test('new boss revisions are saved on spawn and reload does not add health or restart mechanics',()=>{
 for(let ch=0;ch<3;ch++){const g=fight(ch),boss=g.s.b.enemies[0];assert.equal(boss.tactics.revision,2);const state=clone(g.s);for(let i=0;i<3;i++)g.s=new Game(g.s).s;assert.deepEqual(g.s,state);}
});
test('Yu retains active pressure during defensive actions and builds his own sword resource',()=>{
 const g=bossOnly(0),e=g.s.b.enemies[0];e.round=3;e.intent=g.enemyIntent(e);assert.equal(e.intent.damage,4);g.endTurn();assert.equal(e.block,15);assert.equal(e.tactics.sword,1);e.round=2;e.intent=g.enemyIntent(e);assert.equal(e.intent.damage,21);g.endTurn();assert.equal(e.tactics.sword,0);
});
test('Ding protective actions attack and newly summoned followers still cannot act on birth turn',()=>{
 const g=bossOnly(1),e=g.s.b.enemies[0];e.round=2;e.intent=g.enemyIntent(e);const hp=g.s.hp;g.endTurn();assert.equal(hp-g.s.hp,6);const born=g.s.b.enemies.find(x=>x.summoned&&x.hp>0);assert.ok(born);assert.equal(born.tactics.actions,0);assert.equal(e.block,22);assert.equal(g.s.b.lastEnemyActions.length,1);
});
test('poison followers protect the boss only after acting; defeating them rewards all attack sources once',()=>{
 const g=fight(1),[boss,follower]=g.s.b.enemies;g.s.b.enemies=[boss,follower];boss.round=0;follower.round=0;g.s.b.poison=5;g.endTurn();assert.equal(boss.block,4);g.s.b.poison=5;g.direct(follower,999);assert.equal(g.s.b.poison,3);assert.equal(boss.vuln,1);g.direct(follower,999);assert.equal(boss.vuln,1);
});
test('an uninterrupted follower sacrifice heals and strengthens only a living boss, without fake kills',()=>{
 const g=fight(1),[boss,follower]=g.s.b.enemies;g.s.b.enemies=[boss,follower];boss.hp=250;boss.round=0;follower.tactics.actions=2;g.s.b.block=999;g.endTurn();assert.equal(boss.hp,262);assert.equal(boss.str,1);assert.equal(follower.hp,0);assert.equal(g.s.stats.kills,0);assert.equal(boss.vuln,0);
 const dead=fight(1),leader=dead.s.b.enemies[0];dead.direct(leader,9999);assert.ok(dead.s.b.enemies.every(x=>x.hp<=0));
});
test('Ou charge setup has an actual attack and burst can interrupt the entire next action',()=>{
 const g=bossOnly(2),e=g.s.b.enemies[0];e.round=1;e.intent=g.enemyIntent(e);const hp=g.s.hp;g.endTurn();assert.equal(hp-g.s.hp,6);assert.equal(e.tactics.windup,100);assert.equal(e.charge,8);g.direct(e,100);g.refreshEnemyPhases();assert.equal(e.tactics.broken,true);assert.equal(e.charge,0);assert.equal(e.intent.damage,undefined);const str=e.str;g.endTurn();assert.equal(e.block,0);assert.equal(e.str,str);
});
test('Ou uninterrupted charge release earns recovery guard only after executing the attack',()=>{
 const g=bossOnly(2),e=g.s.b.enemies[0];e.round=1;e.intent=g.enemyIntent(e);g.endTurn();assert.equal(e.block,26);const hp=g.s.hp;g.endTurn();assert.equal(hp-g.s.hp,40);assert.equal(e.block,8);assert.equal(e.tactics.windup,0);assert.equal(e.intent.releaseCharge,undefined);
});
test('partial stance disruption accumulates all damage sources and changes actual release damage',()=>{
 const g=bossOnly(2),e=g.s.b.enemies[0];e.round=1;e.intent=g.enemyIntent(e);g.endTurn();g.direct(e,12);assert.equal(e.charge,8);g.direct(e,13);assert.equal(e.charge,7);assert.equal(e.tactics.windup,75);g.direct(e,25);assert.equal(e.charge,6);const hp=g.s.hp;g.endTurn();assert.equal(hp-g.s.hp,38);
});
test('old ongoing boss states keep their health, passive actions, original stance, and summon rules',()=>{
 for(let ch=0;ch<3;ch++){
  const g=bossOnly(ch),e=g.s.b.enemies[0];delete e.tactics.revision;e.hp=e.maxHp=[145,280,480][ch];e.round=[3,2,1][ch];e.intent=g.enemyIntent(e);const saved=clone(g.s),h=new Game(saved);assert.deepEqual(h.s,saved);const hp=h.s.hp;h.endTurn();assert.equal(h.s.hp,hp);assert.equal(h.s.b.enemies[0].maxHp,[145,280,480][ch]);if(ch===2)assert.equal(h.s.b.enemies[0].tactics.windup,90);
 }
});
test('Ou phase changes initialize once and late stance/recovery use the new saved revision',()=>{
 const g=bossOnly(2),e=g.s.b.enemies[0];e.hp=250;g.refreshEnemyPhases();e.weak=3;e.vuln=4;const state=clone(g.s);for(let i=0;i<4;i++)g.refreshEnemyPhases();assert.deepEqual(g.s,state);g.endTurn();assert.equal(e.tactics.windup,110);assert.equal(e.charge,4);g.endTurn();assert.equal(e.block,12);
});
test('large player attacks remain uncapped and can skip every boss phase',()=>{
 for(let ch=0;ch<3;ch++){const g=bossOnly(ch),b=g.s.b;b.block=100000;b.hand=[g.make('W27',true)];b.qi=1;assert.ok(g.play(b.hand[0].uid,b.enemies[0].key).ok);assert.equal(g.s.phase,'reward');assert.equal(g.s.stats.damage,b.enemies[0].maxHp);assert.equal(b.block,100000);}
});
test('boss reactions remain identical after save/reload with active charge, followers, and reflection',()=>{
 for(let ch=0;ch<3;ch++){const g=fight(ch);g.s.b.enemies[0].round=ch===0?3:ch===1?2:1;g.refreshEnemyPhases();g.endTurn();const h=new Game(g.s);for(let i=0;i<3;i++){g.endTurn();h.endTurn();assert.deepEqual(h.s,g.s);}}
});
test('presentation never reads upcoming mechanics, descriptions, or stance thresholds',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.doesNotMatch(source,/\.intent\b|\.trait\b|\.windup\b|\.releaseCharge\b|\.revision\b/);
 for(let ch=0;ch<3;ch++){const g=fight(ch);assert.deepEqual(g.s.journal[g.s.b.enemies[0].id].moves,{});assert.equal(g.s.b.enemies[0].lastAction,undefined);}
});
