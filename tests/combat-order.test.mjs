import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone} from '../engine.js';
import {fixture} from './fixtures.mjs';
import {captureCombatAction,playCombatSteps,combatFeedback} from '../combat-ui.js';
function trio(){const g=fixture([]),base=clone(g.s.b.enemies[0]);delete base.tactics;g.s.b.enemies=[9,2,5].map((key,i)=>({...clone(base),key,name:'对手'+(i+1),intent:{label:'已完成招式'+i,damage:[5,7,9][i]}}));return g;}
const enemySteps=trace=>trace.steps.filter(s=>s.kind==='enemy');
test('formation order is stable rather than key-sorted, and each snapshot contains only its own resolved damage',()=>{
 const g=trio(),trace=captureCombatAction(g,()=>g.endTurn()),steps=enemySteps(trace);
 assert.deepEqual(steps.map(s=>s.actor),[9,2,5]);assert.deepEqual(steps.map(s=>s.snapshot.hp),[35,28,19]);
 let previous=trace.steps.find(s=>s.kind==='enemy-start').snapshot;
 for(const [i,step] of steps.entries()){assert.equal(combatFeedback(previous,step.snapshot,{enemyTurn:true}).find(x=>x.kind==='damage')?.text,['−5','−7','−9'][i]);previous=step.snapshot;}
 assert.equal(trace.steps.at(-1).kind,'player-start');assert.equal(trace.steps.at(-1).snapshot.turn,2);
});
test('reflection finishes before the next enemy; killing an attacker cancels its remaining hits',()=>{
 const g=trio(),b=g.s.b;b.enemies=b.enemies.slice(0,2);b.enemies[0].hp=3;b.enemies[0].intent.hits=3;b.block=30;b.reflectRoundStacks=1;b.powers.W22=false;
 const steps=enemySteps(captureCombatAction(g,()=>g.endTurn()));assert.equal(steps.length,2);
 assert.equal(steps[0].snapshot.enemies[0].alive,false);assert.equal(steps[0].snapshot.block,25);assert.equal(steps[1].snapshot.block,18);assert.equal(g.s.hp,40);
});
test('an already defeated enemy is skipped without changing remaining formation order',()=>{
 const g=trio();g.s.b.enemies[1].hp=0;assert.deepEqual(enemySteps(captureCombatAction(g,()=>g.endTurn())).map(s=>s.actor),[9,5]);
});
test('a lethal enemy attack ends the queue immediately and never starts another player turn',()=>{
 const g=trio();g.s.hp=4;const trace=captureCombatAction(g,()=>g.endTurn());assert.deepEqual(enemySteps(trace).map(s=>s.actor),[9]);assert.equal(trace.steps.at(-1).snapshot.hp,0);assert.equal(g.s.phase,'lost');assert.equal(trace.steps.some(s=>s.kind==='player-start'),false);
});
test('poison resolves after all enemies but before the next player turn and block reset',()=>{
 const g=trio();g.s.b.poison=3;g.s.b.block=30;const trace=captureCombatAction(g,()=>g.endTurn()),end=trace.steps.find(s=>s.kind==='round-end');
 assert.equal(enemySteps(trace).at(-1).snapshot.hp,40);assert.equal(end.snapshot.hp,37);assert.equal(end.snapshot.block,9);assert.equal(trace.steps.at(-1).snapshot.block,0);
});
test('summons are shown in the trace but never act on their birth round',()=>{
 const g=new Game();g.start(42,{opening:false});g.s.step=29;g.combat('boss');g.s.hp=g.s.maxHp=5000;g.s.relics=[];const b=g.s.b;b.enemies=b.enemies.slice(0,1);b.hand=[];b.draw=[];b.discard=[];const boss=b.enemies[0];boss.round=2;boss.intent=g.enemyIntent(boss);
 const trace=captureCombatAction(g,()=>g.endTurn()),born=b.enemies.find(e=>e.summoned&&e.hp>0);assert.ok(born);assert.equal(born.tactics.actions,0);assert.equal(enemySteps(trace).some(s=>s.actor===born.key),false);assert.ok(enemySteps(trace)[0].snapshot.enemies.some(e=>e.key===born.key));
});
test('capture neither changes combat outcomes nor persists playback data, and snapshots stay immutable',()=>{
 const g=trio(),h=new Game(g.s),trace=captureCombatAction(g,()=>g.endTurn());h.endTurn();assert.deepEqual(g.s,h.s);assert.equal(Object.hasOwn(g,'onCombatStep'),false);assert.equal('steps' in g.s.b,false);
 const firstHp=enemySteps(trace)[0].snapshot.hp;g.s.hp=1;g.s.b.enemies[0].hp=0;assert.equal(enemySteps(trace)[0].snapshot.hp,firstHp);assert.equal(enemySteps(trace)[0].snapshot.enemies[0].hp,2000);
});
test('observer is restored after errors and captures no unperformed or future enemy moves',()=>{
 const g=trio(),watch=()=>{};g.onCombatStep=watch;assert.throws(()=>captureCombatAction(g,()=>{throw Error('stop');}),/stop/);assert.equal(g.onCombatStep,watch);
 const c=g.make('W01');g.s.b.hand=[c];const trace=captureCombatAction(g,()=>g.play(c.uid,9));assert.equal(trace.steps.length,1);assert.equal(trace.steps[0].kind,'player');assert.ok(trace.steps[0].snapshot.enemies.every(e=>!('label' in e)&&!('intent' in e)));
});
test('automatic assistance records player cards first, then the enemy queue, then the next turn',()=>{
 const g=trio();g.s.b.hand=[g.make('U01'),g.make('W01')];g.s.b.qi=3;const trace=captureCombatAction(g,()=>g.autoPlayTurn()),firstEnemy=trace.steps.findIndex(s=>s.kind==='enemy');
 assert.equal(trace.steps.filter(s=>s.kind==='player').length,2);assert.ok(trace.steps.slice(firstEnemy).every(s=>s.kind!=='player'));assert.equal(trace.steps.at(-1).kind,'player-start');
});
test('playback awaits each action before starting the next, including reduced-motion presenters',async()=>{
 const log=[];let release;const waiting=new Promise(r=>{release=r;});const playing=playCombatSteps([1,2,3],async step=>{log.push('start'+step);if(step===1)await waiting;log.push('end'+step);});
 assert.deepEqual(log,['start1']);release();await playing;assert.deepEqual(log,['start1','end1','start2','end2','start3','end3']);
 const instant=[];await playCombatSteps([1,2,3],step=>{instant.push(step);});assert.deepEqual(instant,[1,2,3]);
});
