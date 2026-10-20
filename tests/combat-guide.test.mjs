import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone} from '../engine.js';
import {COMBAT_RULE,enemyReadout} from '../combat-guide.js';
import {enemyActionView} from '../enemy-action.js';
import {fixture} from './fixtures.mjs';

test('enemy explanations use adjusted current hit values and explain guard bypass and conditions',()=>{
 const g=fixture([]),e=g.s.b.enemies[0];e.intent={damage:10,hits:2,poison:2,poisonOnHit:true,chill:1,woundOnHit:1,drainRatio:.5};e.weak=1;e.pin=3;
 const before=clone(g.s),view=enemyReadout(g,e);assert.equal(view.effects[0].name,'攻击 4＋7');assert.match(view.effects[0].text,/共11伤害/);assert.ok(view.effects.some(x=>x.text.includes('伤及你的气血时，才会')));assert.ok(view.effects.some(x=>x.text.includes('每一击伤及')));assert.ok(view.effects.some(x=>x.text.includes('50%')));assert.deepEqual(g.s,before);
 assert.match(COMBAT_RULE.poison.text,/不消耗格挡/);assert.match(COMBAT_RULE.status.text,/不能打出/);assert.doesNotMatch(COMBAT_RULE.status.text,/回合结束.*自动消耗/);
});
test('reading real normal, elite and boss effects covers every public tag without changing a save',()=>{
 const seen=new Set();let count=0;
 for(let seed=1;seed<=30;seed++)for(let chapter=0;chapter<3;chapter++)for(const kind of ['battle','elite','boss']){
  const g=new Game();g.start(seed,{opening:false,trialLevel:1});g.s.step=chapter*15+(kind==='boss'?14:5);g.combat(kind);g.s.hp=g.s.maxHp=100000;
  for(let turn=0;turn<5;turn++){
   const before=clone(g.s);
   for(const e of g.s.b.enemies){seen.add(e.id);const result=enemyReadout(g,e);assert.equal(result.effects.length,enemyActionView(g,e).tags.length);for(const x of result.effects){assert.notEqual(x.text,'以当前显示的效果为准。',x.name);assert.ok(x.text.length>8,x.name);count++;}}
   assert.deepEqual(g.s,before);g.endTurn();
  }
 }
 assert.equal(seen.size,25);assert.ok(count>5000);
});
test('current explanations reveal no future names, hidden thresholds or generated actions',()=>{
 const g=fixture([]),e=g.s.b.enemies[0];e.intent={label:'隐藏招式名',damage:7,windup:123456};e.tactics={windup:123456,revision:2,pressureDamage:98765};
 g.enemyIntent=()=>{throw Error('must never predict another action');};
 const before=clone(g.s),text=JSON.stringify(enemyReadout(g,e));for(const secret of ['隐藏招式名','123456','98765','revision','pressureDamage'])assert.ok(!text.includes(secret));assert.deepEqual(g.s,before);
});
test('dead and newly summoned enemies never advertise actionable damage',()=>{
 const g=fixture([]),e=g.s.b.enemies[0];e.hp=0;assert.equal(enemyReadout(g,e).state,'dead');assert.deepEqual(enemyReadout(g,e).effects,[]);e.hp=10;e.bornTurn=g.s.b.turn;assert.equal(enemyReadout(g,e).state,'waiting');assert.deepEqual(enemyReadout(g,e).effects,[]);
});
test('active elite and boss stances explain counterplay without exposing progress counters',()=>{
 const g=fixture([]),e=g.s.b.enemies[0];e.id='chengkun';e.tactics={kind:'chengkun',mines:2,fuse:98765,disarm:123456};let before=clone(g.s),view=enemyReadout(g,e);assert.match(view.stances[0].text,/每消耗一张牌可拆1层/);assert.match(view.stances[0].text,/12点气血/);assert.ok(!JSON.stringify(view).includes('98765'));assert.ok(!JSON.stringify(view).includes('123456'));assert.deepEqual(g.s,before);
 e.id='ouyangfeng';e.tactics={kind:'ouyangfeng',windup:123456};before=clone(g.s);view=enemyReadout(g,e);assert.match(view.stances[0].text,/每出一张攻击牌/);assert.ok(!JSON.stringify(view).includes('123456'));assert.deepEqual(g.s,before);
});
