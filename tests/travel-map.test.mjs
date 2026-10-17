import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone,SAVE_VERSION} from '../engine.js';
import {journeyChapter,validJourney,JOURNEY_FLOORS,JOURNEY_TOTAL} from '../journey.js';
import {CARD} from '../data.js';
import {runGame} from './playthrough.mjs';
const start=(seed=42)=>{const g=new Game();g.start(seed,{opening:false});return g;};
const finish=g=>{const phase=g.s.phase;if(phase==='battle'){g.s.b.enemies.forEach(e=>e.hp=0);g.checkEnd();g.chooseRewardCard();g.chooseRewardRelic();return g.leaveReward();}if(phase==='event')g.eventChoice(2);if(phase==='treasure')g.chooseTreasure('coins');return phase==='rest'?g.rest('leave'):g.finishNode();};
const reach=(step,seed=42)=>{const g=start(seed);while(g.s.step<step){assert.ok(g.enterNode(g.availableNodes[0].id));assert.ok(finish(g));}return g;};
for(let ch=0;ch<3;ch++)test(`chapter ${ch+1}: 15 layers, no orphan nodes, reachable treasure, rest and boss for 150 seeds`,()=>{
 for(let seed=0;seed<150;seed++){
  const map=journeyChapter(seed,ch);assert.equal(map.rows.length,JOURNEY_FLOORS);assert.equal(new Set(map.nodes.map(n=>n.id)).size,map.nodes.length);
  let reached=new Set(map.rows[0].map(n=>n.id));
  for(let floor=0;floor<15;floor++){
   for(const n of map.rows[floor]){assert.ok(reached.has(n.id));if(floor<14)assert.ok(map.edges.some(([a])=>a===n.id));assert.ok(n.x>10&&n.x<90);}
   if(floor<14){const next=new Set(map.edges.filter(([a])=>reached.has(a)).map(([,b])=>b));map.rows[floor+1].forEach(n=>assert.ok(next.has(n.id)));reached=next;}
  }
  assert.deepEqual(map.rows[7].map(n=>n.kind),['treasure']);assert.ok(map.rows[13].every(n=>n.kind==='rest'));assert.deepEqual(map.rows[14].map(n=>n.kind),['boss']);
  for(const [a,b] of map.edges){assert.equal(map.nodes.find(n=>n.id===b).floor,map.nodes.find(n=>n.id===a).floor+1);}
 }
});
test('different seeds change paths, while inspecting a map does not consume gameplay RNG',()=>{
 assert.notDeepEqual(journeyChapter(42,0).edges,journeyChapter(123,0).edges);
 const g=start(),before=clone(g.s);for(let i=0;i<50;i++){g.chapterMap();g.chapterMap(2);g.availableNodes;}assert.deepEqual(g.s,before);
 assert.deepEqual(new Game(g.s).chapterMap(),g.chapterMap());assert.equal(validJourney(g.s),true);
});
test('a chosen fork gates the next layer and cannot be bypassed, replayed or entered twice',()=>{
 const g=start(),first=g.availableNodes[0];assert.equal(g.enterNode(g.chapterMap().rows[4][0].id),false);g.enterNode(first.id);const pending=clone(g.s);assert.equal(g.enterNode(first.id),false);assert.deepEqual(g.s,pending);assert.equal(validJourney(g.s),true);finish(g);
 const expected=g.chapterMap().edges.filter(([a])=>a===first.id).map(([,b])=>b).sort();assert.deepEqual(g.availableNodes.map(n=>n.id).sort(),expected);
 const unreachable=g.chapterMap().rows[1].find(n=>!expected.includes(n.id));assert.ok(unreachable);const before=clone(g.s);assert.equal(g.enterNode(unreachable.id),false);assert.equal(g.finishNode(),false);assert.deepEqual(g.s,before);
});
test('completed and pending travel survives save/reload without rerolling routes, loot or enemy moves',()=>{
 const g=reach(6);g.enterNode(g.availableNodes[0].id);const restored=new Game(g.s);assert.deepEqual(restored.s,g.s);assert.equal(validJourney(restored.s),true);assert.deepEqual(restored.chapterMap(),g.chapterMap());
 if(g.s.phase==='battle'){g.endTurn();restored.endTurn();assert.deepEqual(restored.s,g.s);}
});
test('treasure offers real relics or 65 coins, pays only once and requires a choice before leaving',()=>{
 for(const coins of [false,true]){
  const g=reach(7);g.enterNode(g.availableNodes[0].id);assert.equal(g.s.phase,'treasure');const before=clone(g.s);assert.equal(g.finishNode(),false);assert.equal(g.chooseTreasure('R99'),false);assert.deepEqual(g.s,before);
  const pick=coins?'coins':g.s.scene.relics[0];assert.ok(g.chooseTreasure(pick));assert.equal(g.chooseTreasure('coins'),false);
  assert.equal(g.s.gold,before.gold+(coins?65:0));assert.equal(g.s.relics.length,before.relics.length+(coins?0:1));assert.equal(validJourney(g.s),true);
  const copy=new Game(g.s);assert.equal(copy.chooseTreasure(pick),false);assert.ok(copy.finishNode());assert.equal(copy.s.step,8);assert.equal(copy.s.journey.path.length,8);assert.equal(copy.finishNode(),false);
 }
});
test('three boss thresholds are 15,30,45 and every completed chapter resets adjacency at the next entrance',()=>{
 const g=reach(14);assert.equal(g.chapter,0);assert.equal(g.availableNodes[0].kind,'boss');g.enterNode(g.availableNodes[0].id);finish(g);assert.equal(g.s.step,15);assert.equal(g.chapter,1);assert.equal(g.availableNodes.length,2);assert.equal(validJourney(g.s),true);
 const end=reach(JOURNEY_TOTAL);assert.equal(end.s.phase,'win');assert.equal(end.s.history.length,45);assert.equal(end.s.history.filter(h=>h.kind==='boss').length,3);assert.equal(end.availableNodes.length,0);assert.equal(validJourney(end.s),true);
});
test('legacy version-5 battle keeps its chapter, 18-step length, enemy resources and original finish line',()=>{
 const source=new Game();source.start(42,{opening:false,classic:true});source.s.step=11;source.enter('boss');source.s.b.enemies[0].hp-=9;source.s.b.qi=1;const old=clone(source.s);old.version=5;const before=clone(old),g=new Game(old);assert.equal(g.s.version,SAVE_VERSION);assert.equal(g.totalSteps,18);assert.equal(g.chapter,1);assert.equal(g.chapterLength,6);assert.equal(g.s.journey,undefined);assert.deepEqual(g.s.b,before.b);for(const k of ['deck','relics','hp','gold','rng','step'])assert.deepEqual(g.s[k],before[k]);assert.equal(validJourney(g.s),true);
 const legacy=start();delete legacy.s.journey;legacy.s.step=17;legacy.enter('boss');finish(legacy);assert.equal(legacy.s.phase,'win');assert.equal(legacy.s.step,18);
});
test('travel validation rejects missing/forged steps, disconnected jumps and mismatched scenes',()=>{
 const g=reach(5);for(const mutate of [s=>s.journey.path.pop(),s=>s.journey.path[1]=s.journey.path[0],s=>s.journey.active='j1-0-14-0',s=>s.seed=NaN]){const bad=clone(g.s);mutate(bad);assert.equal(validJourney(bad),false);}
 g.enterNode(g.availableNodes[0].id);const bad=clone(g.s);bad.phase='treasure';assert.equal(validJourney(bad),false);
});
test('new encounters have real costs/rewards, legal exits and cannot be claimed twice',()=>{
 for(const event of ['clinic','cache','stone','ferry'])for(const option of [0,1,2]){
  const g=reach(1);const eventNode=g.availableNodes.find(n=>n.kind==='event');assert.ok(eventNode);g.enterNode(eventNode.id);g.s.scene.event=event;g.s.gold=100;g.s.hp=30;
  const before=clone(g.s);assert.equal(g.eventChoice(9),false);assert.deepEqual(g.s,before);assert.ok(g.eventChoice(option));assert.equal(g.eventChoice(option),false);
  if(option===0&&event==='clinic'){assert.equal(g.s.gold,75);assert.equal(g.s.hp,48);}if(option===0&&event==='cache'){assert.equal(g.s.gold,45);assert.equal(g.s.relics.length,before.relics.length+1);}if(event==='stone'&&option!==2)assert.ok(g.s.deck.some(c=>c.up&&CARD[c.id].type===(option===0?'a':'s')));if(event==='ferry'&&option===0){assert.equal(g.s.hp,25);assert.equal(g.s.deck.length,before.deck.length+1);}
  assert.ok(g.finishNode());assert.equal(g.finishNode(),false);
 }
});
test('legacy 18-step playthroughs remain playable under the original route rules',()=>{for(const policy of ['劲力','格挡','变招','血战']){const result=runGame(policy,policy==='格挡'?3:2,true,{classic:true});assert.equal(result.phase,'win');assert.equal(result.state.history.length,18);assert.equal(result.state.journey,undefined);}});
