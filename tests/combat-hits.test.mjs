import test from 'node:test';import assert from 'node:assert/strict';
import {Game,clone} from '../engine.js';import {fixture} from './fixtures.mjs';
import {captureCombatAction,combatStepFeedback,playCombatSteps} from '../combat-ui.js';
const hits=trace=>trace.steps.filter(s=>['player-hit','enemy-hit'].includes(s.kind));
function cast(g){const c=g.s.b.hand[0];return captureCombatAction(g,()=>g.play(c.uid,g.s.b.enemies[0].key,[]));}
function enemyChain({block=12,hits=3,damage=5,next=0,round=1}={}){const g=fixture([]),b=g.s.b;b.block=block;b.reflectNextStacks=next;b.reflectRoundStacks=round;b.enemies[0].intent={label:'连掌',damage,hits};return g;}
test('a player two-hit card records both impacts, and the closing step never repeats their total',()=>{
 const g=fixture(['W08']),trace=cast(g),strikes=hits(trace);assert.deepEqual(strikes.map(s=>s.hit),[1,2]);assert.deepEqual(strikes.map(s=>s.snapshot.enemies[0].hp),[1994,1988]);
 assert.deepEqual(strikes.map((s,i)=>combatStepFeedback(i?strikes[i-1].snapshot:trace.steps[0].snapshot,s).find(c=>c.kind==='damage')?.text),['−6','−6']);assert.deepEqual(combatStepFeedback(strikes.at(-1).snapshot,trace.steps.at(-1)),[]);
});
test('each enemy hit is followed by its own actual reflection before the next hit',()=>{
 const g=enemyChain(),trace=captureCombatAction(g,()=>g.endTurn()),impact=trace.steps.filter(s=>['enemy-hit','reaction'].includes(s.kind));
 assert.deepEqual(impact.map(s=>[s.kind,s.hit]),[['enemy-hit',1],['reaction',1],['enemy-hit',2],['reaction',2],['enemy-hit',3],['reaction',3]]);
 assert.deepEqual(impact.map(s=>[s.snapshot.hp,s.snapshot.block,s.snapshot.enemies[0].hp]),[[40,7,2000],[40,7,1995],[40,2,1995],[40,2,1990],[37,0,1990],[37,0,1988]]);
 let previous=trace.before;const text=[];for(const step of trace.steps){text.push(...combatStepFeedback(previous,step).map(x=>x.text));previous=step.snapshot;}
 assert.ok(text.includes('格挡 −5'));assert.ok(text.includes('−3 · 格挡2'));assert.deepEqual(text.filter(t=>t.startsWith('斗转反震')),['斗转反震 −5','斗转反震 −5','斗转反震 −2']);assert.equal(text.includes('−12'),false);
});
test('single-hit reflection and round reflection run in order and only return actual blocked damage',()=>{
 const g=enemyChain({block:30,hits:2,next:1,round:2}),trace=captureCombatAction(g,()=>g.endTurn());assert.deepEqual(trace.steps.filter(s=>s.kind==='reaction').map(s=>[s.hit,s.label,s.snapshot.enemies[0].hp]),[[1,'乾坤反震',1995],[1,'斗转反震',1985],[2,'斗转反震',1975]]);assert.equal(g.s.b.reflectNextStacks,0);
});
test('reflection killing an attacker cancels its remaining impacts before moving to the next enemy',()=>{
 const g=enemyChain({block:30}),b=g.s.b;b.enemies[0].hp=3;const follower={...clone(b.enemies[0]),key:9,name:'后手',hp:100,maxHp:100,intent:{label:'后掌',damage:2}};b.enemies.push(follower);
 const trace=captureCombatAction(g,()=>g.endTurn());assert.deepEqual(hits(trace).map(s=>[s.actor,s.hit]),[[b.enemies[0].key,1],[9,1]]);assert.equal(trace.steps.find(s=>s.kind==='reaction').snapshot.enemies[0].alive,false);
});
test('a player multi-hit stops on lethal damage and its self-cost is shown before the first strike',()=>{
 const g=fixture(['W44']);g.s.b.enemies[0].hp=7;const trace=cast(g),strikes=hits(trace),cost=trace.steps.findIndex(s=>s.kind==='player-effect');assert.deepEqual(strikes.map(s=>s.damage),[6,1]);assert.ok(cost<trace.steps.findIndex(s=>s.kind==='player-hit'));assert.equal(trace.steps[cost].snapshot.hp,37);
});
test('repeated attacks keep every hit, share their visible sequence, and spend energy only once',async()=>{
 const g=fixture(['W08']);g.s.b.repeat=100;g.s.b.enemies[0].hp=g.s.b.enemies[0].maxHp=100000;const trace=cast(g),strikes=hits(trace);assert.equal(strikes.length,202);assert.deepEqual(strikes.map(s=>s.hit),Array.from({length:202},(_,i)=>i+1));assert.equal(g.s.b.qi,28);assert.equal(g.s.b.turnFlags.plays,1);const seen=[];await playCombatSteps(trace.steps,s=>{if(s.kind==='player-hit')seen.push(s.hit);});assert.equal(seen.length,202);
});
test('area multi-hit attacks preserve actual target and segment order',()=>{
 const g=fixture(['W60']),base=clone(g.s.b.enemies[0]);g.s.b.enemies.push({...base,key:7,name:'第二人'});const trace=cast(g);assert.deepEqual(hits(trace).map(s=>[s.target,s.hit,s.damage]),[[0,1,4],[0,2,4],[7,3,4],[7,4,4]]);
});
test('player death ends a multi-hit midway without inventing a third impact',()=>{
 const g=enemyChain({block:0,damage:20,round:0});g.s.hp=25;const trace=captureCombatAction(g,()=>g.endTurn());assert.deepEqual(hits(trace).map(s=>s.snapshot.hp),[5,0]);assert.equal(g.s.phase,'lost');assert.equal(trace.steps.some(s=>s.kind==='player-start'),false);
});
test('direct relic damage is separate from the following multi-hit attack',()=>{
 const g=fixture(['W41','QI','CURSE'],['R17']),trace=cast(g),effects=trace.steps.filter(s=>s.kind==='effect');assert.equal(effects[0].label,'圣火令');assert.equal(effects[0].snapshot.enemies[0].hp,1994);assert.deepEqual(hits(trace).map(s=>s.snapshot.enemies[0].hp),[1989,1984]);
});
test('tracing and reduced-motion playback never change saved outcomes or consume extra RNG',async()=>{
 const g=enemyChain({next:2,round:3}),h=new Game(g.s),trace=captureCombatAction(g,()=>g.endTurn());h.endTurn();assert.deepEqual(g.s,h.s);const saved=JSON.stringify(g.s);await playCombatSteps(trace.steps,()=>{});assert.equal(JSON.stringify(g.s),saved);assert.equal(Object.hasOwn(g,'onCombatStep'),false);
});
test('the first displayed hit contains no unperformed count or future enemy move',()=>{
 const g=enemyChain(),trace=captureCombatAction(g,()=>g.endTurn()),first=hits(trace)[0];assert.equal(first.hit,1);assert.equal('hits' in first,false);assert.equal('totalHits' in first,false);assert.ok(first.snapshot.enemies.every(e=>!('intent' in e)&&!('label' in e)));
});
