import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone} from '../engine.js';
import {CARD,describe} from '../data.js';
import {fixture,play} from './fixtures.mjs';
for(const up of [false,true]){
 test(`golden body ${up?'refined':'base'}: real energy payment, no cap, attacks still spend block`,()=>{
  const g=fixture(['W22']),b=g.s.b,c=b.hand[0];c.up=up;const cost=up?2:3;
  b.qi=cost-1;assert.equal(g.cost(c),cost);const before=clone(g.s);assert.equal(g.play(c.uid,0).ok,false);assert.deepEqual(g.s,before);
  b.qi=cost;assert.equal(g.play(c.uid,0).ok,true);assert.equal(b.qi,0);assert.equal(b.powers.W22,up);
  b.block=10000;b.enemies[0].intent={damage:17,label:'试掌'};g.endTurn();assert.equal(b.block,9983);assert.equal(g.s.hp,40);
 });
 test(`tai chi sword ${up?'refined':'base'}: uncapped block damage and correct energy cost`,()=>{
  for(const block of [0,40,100,1000,10000]){
   const g=fixture(['W27']),b=g.s.b,c=b.hand[0],e=b.enemies[0];c.up=up;b.block=block;b.str=999;e.hp=e.maxHp=100000;const qi=b.qi;
   assert.equal(g.cost(c),up?0:1);assert.equal(g.play(c.uid,0).ok,true);assert.equal(e.hp,100000-block);assert.equal(b.block,block);assert.equal(b.qi,qi-(up?0:1));
  }
 });
 test(`golden body + empty fist + tai chi sword ${up?'refined':'base'} scales across turns and survives a save`,()=>{
  const g=fixture(['W22','W23','W26']),b=g.s.b;b.enemies[0].hp=b.enemies[0].maxHp=100000;b.block=1000;
  play(g,'W22',[],up);play(g,'W23',[],up);play(g,'W26',[],up);
  const built=up?1792:1527;assert.equal(b.block,built);b.enemies[0].intent={damage:20,label:'试掌'};g.endTurn();assert.equal(b.block,built-20);
  const restored=new Game(JSON.parse(JSON.stringify(g.s)));assert.equal(restored.s.b.block,built-20);
  for(const game of [g,restored]){game.s.b.hand=[game.make('W27',up)];assert.equal(game.play(game.s.b.hand[0].uid,0).ok,true);}
  assert.deepEqual(restored.s,g.s);assert.equal(b.enemies[0].hp,100000-(built-20));assert.equal(b.block,built-20);
  g.combat('battle');assert.equal(g.s.b.block,0);assert.equal(g.power('W22'),null,'retention applies only to the battle it was played in');
 });
}
test('without golden body block still clears at the next turn',()=>{const g=fixture();g.s.b.block=10000;g.s.b.enemies[0].intent={label:'等待'};g.endTurn();assert.equal(g.s.b.block,0);});
test('tai chi sword still obeys weakness, vulnerability and enemy block, while ignoring strength',()=>{const g=fixture(['W27']),b=g.s.b,e=b.enemies[0];b.block=1000;b.str=999;b.weak=1;e.vuln=1;e.block=25;play(g,'W27');assert.equal(e.hp,900);assert.equal(e.block,0);assert.equal(b.block,1000);});
test('the current card table and descriptions expose the same unlimited rules',()=>{assert.deepEqual(CARD.W22.cost,[3,2]);assert.deepEqual(CARD.W27.cost,[1,0]);for(const up of [false,true]){assert.doesNotMatch(describe({id:'W22',up}),/至多|30|40/);assert.match(describe({id:'W22',up}),/本场战斗/);assert.match(describe({id:'W27',up}),/无上限/);}});
