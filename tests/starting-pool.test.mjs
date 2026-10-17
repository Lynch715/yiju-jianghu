import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,clone,STARTING_DECK} from '../engine.js';

const expected=[...Array(5).fill('W01'),...Array(4).fill('U01'),'U02'];
test('a new journey starts on the map with baseline cards, not a free card pool or direction',()=>{
 for(const seed of [0,1,7,42,123,2026]){
  const g=new Game();g.start(seed,{opening:false});assert.equal(g.s.phase,'map');assert.deepEqual(g.s.deck.map(c=>c.id),expected);
  assert.equal(new Set(g.s.deck.map(c=>c.uid)).size,10);assert.ok(g.s.deck.every(c=>!c.up));assert.deepEqual(g.s.relics,['R01']);assert.equal('legacy' in g.s,false);
  assert.deepEqual(STARTING_DECK,expected);g.enter('battle');assert.equal(g.s.b.hand.length,5);
  assert.deepEqual([...g.s.b.hand,...g.s.b.draw].map(c=>c.id).sort(),[...expected].sort());
 }
});
test('unfinished v0.3 selections resume with the baseline deck instead of granting chosen core cards',()=>{
 for(const ids of [[],['W13'],Array(10).fill('W44')]){
  const g=new Game();g.start(42,{opening:false});g.s.phase='draft';g.s.deck=ids.map(id=>g.make(id));const saved=clone(g.s),restored=new Game(saved);
  assert.equal(restored.s.phase,'map');assert.deepEqual(restored.s.deck.map(c=>c.id),expected);assert.equal(restored.s.seed,42);assert.equal(restored.s.rng,saved.rng);
  assert.equal(new Set(restored.s.deck.map(c=>c.uid)).size,10);assert.deepEqual(saved.deck,g.s.deck,'must not mutate imported data');restored.enter('battle');assert.equal(restored.s.phase,'battle');
 }
});
test('already started custom runs retain their cards and combat progress',()=>{
 const g=new Game();g.start(42,{opening:false});g.s.deck=[g.make('W13'),...Array.from({length:9},()=>g.make('W44'))];g.enter('battle');const saved=clone(g.s);
 const restored=new Game(saved);assert.deepEqual(restored.s,saved);assert.ok(restored.s.b.hand.some(c=>c.id==='W44'));
});
test('new cards come from three random victory options; players can pick one or skip',()=>{
 const offers=new Set();
 for(let seed=0;seed<20;seed++){
  const g=new Game();g.start(seed,{opening:false});g.enter('battle');for(const e of g.s.b.enemies)e.hp=0;g.checkEnd();
  assert.equal(g.s.phase,'reward');assert.equal(g.s.reward.cards.length,3);assert.equal(new Set(g.s.reward.cards).size,3);
  const reward=[...g.s.reward.cards],n=g.s.deck.length;offers.add(reward.join(','));
  assert.equal(g.chooseRewardCard('W01'),false);const chosen=seed%2?reward[0]:null;assert.equal(g.chooseRewardCard(chosen),true);
  assert.equal(g.s.deck.length,n+(chosen?1:0));if(chosen)assert.equal(g.s.deck.at(-1).id,chosen);
  assert.equal(g.chooseRewardCard(reward[1]),false);assert.equal(g.leaveReward(),true);assert.equal(g.s.phase,'map');assert.equal(g.s.step,1);
 }
 assert.ok(offers.size>10);
});
test('UI has no free starting-pool page, handlers or controls',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/beginDraft|draftPage|draft-add|draft-finish|draft-search|从卡池中，选你的十招/);
});
