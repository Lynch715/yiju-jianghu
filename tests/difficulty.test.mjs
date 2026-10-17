import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone,STARTING_DECK} from '../engine.js';
import {DIFFICULTY,combatDefinition} from '../difficulty.js';
import {ENEMY} from '../enemies.js';
function fight(ch=0,kind='boss',seed=42){const g=new Game();g.start(seed,{opening:false});g.s.step=ch*15+(kind==='boss'?14:10);g.combat(kind);return g;}
test('new runs use stronger rules; unmarked saves retain legacy future fights and pending moves',()=>{
 const g=fight(),s=clone(g.s),restored=new Game(s);assert.equal(restored.s.ruleset,DIFFICULTY);assert.deepEqual(restored.s,s);
 g.endTurn();restored.endTurn();assert.deepEqual(restored.s,g.s);
 const old=clone(s);delete old.ruleset;for(const e of old.b.enemies){delete e.ruleset;delete e.phaseName;}
 old.b.enemies[0].intent={label:'原已预告',damage:5};const loaded=new Game(old);assert.deepEqual(loaded.s,old);loaded.combat('boss');assert.equal(loaded.s.b.enemies[0].maxHp,90);
});
test('ordinary encounters and elites grow across chapters, with meaningful group health and damage',()=>{
 for(let ch=0;ch<3;ch++)for(let seed=1;seed<40;seed++){
  const g=fight(ch,'battle',seed),b=g.s.b;assert.ok(b.enemies.reduce((n,e)=>n+e.hp,0)>[35,45,60][ch]);
  for(const e of b.enemies)assert.ok(e.damageScale>=[.7,.9,1.1][ch]);
 }
 for(let ch=0;ch<3;ch++){const g=fight(ch,'elite');const e=g.s.b.enemies[0];assert.ok(e.maxHp>ENEMY[e.id].hp);assert.ok(e.damageScale>1);}
});
test('three bosses have distinct half-health transitions, announced effects and persistent growing pressure',()=>{
 for(let ch=0;ch<3;ch++){
  const g=fight(ch),b=g.s.b,e=b.enemies[0],d=combatDefinition(ENEMY[e.id],DIFFICULTY);
  assert.equal(e.maxHp,[145,280,400][ch]);assert.ok(d.enragedMoves);e.hp=Math.floor(e.maxHp/2);e.charge=8;g.refreshEnemyPhases();assert.equal(e.enraged,true);assert.equal(e.round,0);assert.equal(e.charge,0);assert.deepEqual(e.intent,d.enragedMoves[0]);
  g.s.hp=g.s.maxHp=2000;g.s.relics=[];b.enemies.slice(1).forEach(x=>x.hp=0);b.turn=4;b.hand=[];b.draw=[];b.discard=[];const str=e.str;g.endTurn();assert.equal(e.str,str+(d.enragedMoves[0].str||0)+1);assert.ok(b.log.some(x=>x.includes('久战蓄劲')));
  const saved=new Game(g.s);assert.equal(saved.s.b.enemies[0].enraged,true);assert.deepEqual(saved.s.b.enemies[0].intent,e.intent);
 }
});
test('all stronger boss attacks execute exactly the preview, including weakness, charge and multi-hit',()=>{
 for(let ch=0;ch<3;ch++)for(const enraged of [false,true]){
  const d=combatDefinition(ENEMY[['yucanghai','dingchunqiu','ouyangfeng'][ch]],DIFFICULTY);
  for(const [round,move] of (enraged?d.enragedMoves:d.moves).entries()){
   const g=fight(ch),b=g.s.b,e=b.enemies[0];b.enemies=[e];g.s.relics=[];g.s.hp=g.s.maxHp=5000;b.hand=[];b.draw=[];b.discard=[];e.enraged=enraged;e.round=round;e.str=2;e.weak=1;e.charge=3;e.intent=g.enemyIntent(e);
   const predicted=Array.from({length:move.damage?(move.hits||1):0},(_,i)=>g.previewEnemy(e,i)).reduce((a,v)=>a+v,0);
   g.endTurn();assert.equal(5000-g.s.hp,predicted+(move.poison||0),`${e.id}/${move.label}`);
   assert.equal(b.qi,Math.max(0,g.qiMax-(move.chill||0)));assert.equal(e.block,move.block||0);
  }
 }
});
const decks={
 劲力:['W01','U01','U01','U02','W13','W12','W07','W08','W17','W19','W21','W11'],
 格挡:['W01','U01','U01','U02','W22','W29','W28','W19','W23','W24','W27','W21'],
 血战:['W01','U01','U01','U02','W48','W51','W43','W44','W47','W49','W13','W19','W21','W17']
};
function bossResult(ch,ids,seed){const g=new Game();g.start(seed,{opening:false});g.s.deck=ids.map(id=>g.make(id,true));g.s.step=ch*15+14;g.s.relics=ch===0?['R01']:ch===1?['R01','R26']:['R01','R26','R25'];g.combat('boss');while(g.s.phase==='battle'&&g.s.b.turn<80)g.autoPlayTurn();assert.notEqual(g.s.phase,'battle');return g.s.phase==='reward';}
// Constructed-deck counterplay checks, separate from random full-journey acquisition.
for(let ch=0;ch<3;ch++)test(`boss ${ch+1}: basic cards fail while several legal synergistic decks can win`,()=>{
 let basic=0;const wins=Object.fromEntries(Object.keys(decks).map(x=>[x,0]));
 for(let seed=1;seed<=40;seed++){basic+=bossResult(ch,STARTING_DECK,seed);for(const [name,deck] of Object.entries(decks))wins[name]+=bossResult(ch,deck,seed);}
 assert.equal(basic,0);for(const [name,n] of Object.entries(wins))assert.ok(n>=15,`${name}: ${n}/40`);
});
