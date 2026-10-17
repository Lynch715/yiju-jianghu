import test from 'node:test';
import assert from 'node:assert/strict';
import {runGame} from './playthrough.mjs';
import {Game} from '../engine.js';
const winningSeeds={劲力:10,格挡:45,变招:91,血战:71};
for(const policy of Object.keys(winningSeeds))for(const seed of [7,42,123,2026,1016,winningSeeds[policy]])test(`complete journey: ${policy}, seed ${seed}, uses real resource and reward rules`,()=>{
 const r=runGame(policy,seed);
 assert.ok(['win','lost'].includes(r.phase),'cannot hang in any scene');
 assert.ok(r.iterations<1200);assert.ok(r.plays>0);assert.ok(r.hp>=0);
 if(seed===winningSeeds[policy])assert.equal(r.phase,'win',`${policy} must be able to win a full game`);
 if(r.phase==='win'){
  assert.equal(r.state.history.length,45);assert.equal(r.state.history.filter(x=>x.kind==='boss').length,3);assert.ok(r.state.history.filter(x=>x.kind==='elite').length<=9);assert.equal(r.state.history.filter(x=>x.kind==='treasure').length,3);
  assert.ok(r.state.stats.wins>=9);assert.ok(r.state.history.some(x=>x.kind==='rest'));assert.ok(r.state.history.some(x=>x.kind==='event'));assert.ok(r.deck>12);assert.ok(r.relics>=7);
 }
});
test('all generated events have a legal no-cost exit and do not advance twice',()=>{for(const id of ['master','shrine','traveller','cliff']){const g=new Game();g.start(undefined,{opening:false,classic:true});g.s.step=1;g.enter('event');g.s.scene.event=id;assert.equal(g.eventChoice(2),true);g.finishNode();assert.equal(g.s.step,2);}});
test('failure is a valid terminal screen without awarding victory loot',()=>{const g=new Game();g.start(undefined,{opening:false});g.enter('battle');g.s.hp=1;g.s.b.enemies[0].intent={damage:99,label:'绝招'};g.endTurn();assert.equal(g.s.phase,'lost');assert.equal(g.s.reward,null);assert.equal(g.s.stats.wins,0);});
