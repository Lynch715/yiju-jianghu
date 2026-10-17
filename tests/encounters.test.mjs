import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone} from '../engine.js';
import {ENCOUNTER_GROUPS,ENEMY} from '../enemies.js';
import {CARD,describe} from '../data.js';
function encounter(chapter,kind,seed=42,localStep=2){const g=new Game();g.start(seed,{opening:false});g.s.step=chapter*6+(kind==='boss'?5:kind==='elite'?2:localStep);assert.equal(g.enter(kind),true);return g;}
function find(title,chapter=0,kind='battle'){for(let seed=0;seed<600;seed++){const g=encounter(chapter,kind,seed);if(g.s.b.formation===title)return g;}throw Error('Unreachable formation: '+title);}
test('all declared formations are reachable and every chapter has solo, duo and trio normal encounters',()=>{
 for(let ch=0;ch<3;ch++)for(const kind of ['battle','elite','boss']){
  const expected=kind==='boss'?[ENCOUNTER_GROUPS[ch].boss]:ENCOUNTER_GROUPS[ch][kind==='battle'?'normal':'elite'];
  const seen=new Set(),sizes=new Set();
  for(let seed=0;seed<300;seed++){
   const g=encounter(ch,kind,seed),b=g.s.b;seen.add(b.formation);sizes.add(b.enemies.length);
   assert.ok(b.enemies.length>=1&&b.enemies.length<=3);assert.equal(new Set(b.enemies.map(e=>e.key)).size,b.enemies.length);assert.equal(new Set(b.enemies.map(e=>e.name)).size,b.enemies.length);
   for(const e of b.enemies){assert.ok(e.hp>0);assert.equal(e.hp,e.maxHp);assert.ok(ENEMY[e.id]);}
  }
  assert.deepEqual([...seen].sort(),expected.map(x=>x.title).sort());if(kind==='battle')assert.deepEqual([...sizes].sort(),[1,2,3]);
 }
});
test('the first road can roll two foes but never a three-person opening ambush',()=>{
 const sizes=new Set();for(let seed=0;seed<150;seed++)sizes.add(encounter(0,'battle',seed,0).s.b.enemies.length);assert.deepEqual([...sizes].sort(),[1,2]);
});
test('first-chapter trio has tuned health, staggered techniques and matching actual damage',()=>{
 const g=find('三路合围'),b=g.s.b;g.s.relics=[];g.s.hp=g.s.maxHp=4000;
 assert.deepEqual(b.enemies.map(e=>e.hp),[15,15,16]);assert.deepEqual(b.enemies.map(e=>e.intent.label),['松风剑','摧心掌','剑阵守势']);
 assert.deepEqual(b.enemies.map(e=>g.previewEnemy(e)),[3,3,0]);g.endTurn();assert.equal(g.s.hp,3994);assert.equal(b.enemies[2].block,5);assert.equal(b.vuln,1);
 assert.deepEqual(b.enemies.map(e=>g.previewEnemy(e)),[4,0,4]);g.endTurn();assert.equal(g.s.hp,3986);
});
test('duplicate foes have independent targets, HP and turns; a kill does not end a three-foe battle',()=>{
 const g=find('三路合围'),b=g.s.b,card=g.make('W01');g.s.relics=[];b.hand=[card];b.qi=3;const hp=b.enemies.map(e=>e.hp);
 g.play(card.uid,1);assert.deepEqual(b.enemies.map(e=>e.hp),[hp[0],hp[1]-6,hp[2]]);
 b.enemies[1].hp=0;assert.equal(g.checkEnd(),false);assert.equal(g.s.phase,'battle');
 g.s.hp=g.s.maxHp=1000;g.endTurn();assert.ok(b.log.some(x=>x.includes('青城弟子·甲 · 松风剑')));assert.ok(!b.log.some(x=>x.includes('青城弟子·乙 · 摧心掌')));
});
test('AOE hits all three live targets, while hitting the selected third foe leaves the others unchanged',()=>{
 const g=find('三路合围'),b=g.s.b;g.s.relics=[];b.hand=[g.make('W60'),g.make('W01')];b.qi=10;
 const before=b.enemies.map(e=>e.hp);g.play(b.hand[0].uid,2);assert.deepEqual(b.enemies.map(e=>e.hp),before.map(hp=>hp-8));
 const next=b.enemies.map(e=>e.hp);g.play(b.hand[0].uid,2);assert.deepEqual(b.enemies.map(e=>e.hp),[next[0],next[1],next[2]-6]);
});
test('bosses bring same-faction followers and victory requires the whole group to be defeated',()=>{
 for(let ch=0;ch<3;ch++){
  const g=encounter(ch,'boss'),b=g.s.b;assert.equal(b.enemies.length,ch===1?3:2);assert.equal(b.enemies[0].role,'');assert.ok(b.enemies.slice(1).every(e=>e.role==='随从'&&e.damageScale<1));
  assert.ok(b.enemies.slice(1).every(e=>e.id===['qingcheng','xingxiu','baituo'][ch]));
  b.enemies[0].hp=0;assert.equal(g.checkEnd(),false);assert.equal(g.s.reward,null);
  for(const e of b.enemies)e.hp=0;assert.equal(g.checkEnd(),true);assert.equal(g.s.phase,'reward');assert.equal(g.s.reward.gold,65);assert.equal(g.s.stats.wins,1);
 }
});
test('formation tuning and staggered actions survive saving without rerolling or double-scaling',()=>{
 const g=find('三路合围'),restored=new Game(clone(g.s));assert.deepEqual(restored.s,g.s);g.endTurn();restored.endTurn();assert.deepEqual(restored.s,g.s);
});
test('renaming U01 preserves deck identities, refinement and resources; old battle logs migrate',()=>{
 const g=encounter(0,'battle'),deck=clone(g.s.deck);g.s.b.log.push('出招 · 基础守势（1真气）');const restored=new Game(g.s);
 assert.equal(CARD.U01.name,'抱元守一');assert.equal(describe({id:'U01'}),'获得5格挡。');assert.equal(describe({id:'U01',up:true}),'获得8格挡。');
 assert.deepEqual(restored.s.deck,deck);assert.equal(restored.s.hp,g.s.hp);assert.equal(restored.s.rng,g.s.rng);assert.equal(restored.s.b.qi,g.s.b.qi);assert.ok(restored.s.b.log.at(-1).includes('抱元守一'));assert.ok(!restored.s.b.log.join('').includes('基础守势'));
});
test('Ding Chunqiu followers actually guard and poison while his cold suppresses next-turn energy',()=>{
 const g=encounter(1,'boss'),b=g.s.b;g.s.relics=[];g.s.hp=g.s.maxHp=4000;b.hand=[];b.draw=[];b.discard=[];
 assert.deepEqual(b.enemies.map(e=>e.intent.label),['化功大法','星宿护身','三阴蜈蚣爪']);
 g.endTurn();assert.equal(g.s.hp,3997);assert.equal(b.enemies[1].block,3);assert.equal(b.qi,2);assert.equal(b.poison,0);assert.equal([...b.hand,...b.draw,...b.discard].filter(c=>c.id==='QI').length,1);
});
test('an ongoing old solo battle keeps its foe, announced move, resources and RNG after loading',()=>{
 const g=encounter(0,'battle');g.s.b.enemies=g.s.b.enemies.slice(0,1);delete g.s.b.formation;
 const e=g.s.b.enemies[0];delete e.damageScale;delete e.guardScale;delete e.callSign;delete e.role;e.name=ENEMY[e.id].name;e.hp=21;e.maxHp=28;e.intent={label:'旧局招式',damage:5};
 const saved=clone(g.s),restored=new Game(saved);assert.deepEqual(restored.s,saved);assert.equal(restored.s.b.enemies.length,1);
});
