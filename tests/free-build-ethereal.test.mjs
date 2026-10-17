import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,clone,SAVE_VERSION} from '../engine.js';
import {CARD,isEthereal,describe} from '../data.js';
import {fixture,play} from './fixtures.mjs';

test('baseline simulation fixture uses the same ten cards without direction binding',()=>{
 for(const seed of [0,1,7,42,123,2026]){
  const g=new Game();g.start(seed,{opening:false});assert.equal(g.s.deck.length,10);
  assert.deepEqual(g.s.deck.map(c=>c.id),[...Array(5).fill('W01'),...Array(4).fill('U01'),'U02']);
  assert.deepEqual(g.s.relics,['R01']);assert.equal('legacy' in g.s,false);assert.equal(g.s.version,SAVE_VERSION);
 }
});
test('first-victory choices are normal random rewards, with no guaranteed direction card',()=>{
 const offered=new Set();
 for(let seed=0;seed<100;seed++){const g=new Game();g.start(seed,{opening:false});g.enter('battle');for(const e of g.s.b.enemies)e.hp=0;g.checkEnd();assert.equal(g.s.reward.cards.length,3);for(const id of g.s.reward.cards)assert.ok(CARD[id]);offered.add(g.s.reward.cards[0]);}
 assert.ok(offered.size>8,'first reward should not be a fixed legacy selection');
});
test('master events draw from all martial arts without any saved direction',()=>{
 const paths=new Set();
 for(let seed=0;seed<80;seed++){const g=new Game();g.start(seed,{opening:false,classic:true});g.s.step=1;g.enter('event');g.s.scene.event='master';assert.equal(g.eventChoice(0),true);const c=g.s.deck.at(-1);assert.ok(c.id.startsWith('W'));paths.add(CARD[c.id].path);}
 assert.ok(paths.has('劲力')&&paths.has('格挡')&&paths.has('变招')&&paths.has('血战'));
});
test('v1 migration preserves existing assets, battle piles, upgrades and RNG while unbinding direction',()=>{
 const g=fixture(['W14','W01'],['R01','R02']);g.s.version=1;g.s.legacy='劲力';g.s.deck.push(g.make('W13',true));g.s.b.log=['暂退 · 太祖长拳','获得6护体'];g.s.b.hand[0].retain=true;
 const old=clone(g.s),restored=new Game(old);assert.equal(restored.s.version,SAVE_VERSION);assert.equal(restored.s.legacy,undefined);
 for(const field of ['deck','relics','hp','step','rng','stats'])assert.deepEqual(restored.s[field],old[field]);
 for(const field of ['hand','draw','discard','exhaust','powers','qi','turnFlags'])assert.deepEqual(restored.s.b[field],old.b[field]);
 assert.deepEqual(restored.s.b.log,['消耗 · 太祖长拳','获得6格挡']);assert.equal(old.legacy,'劲力','migration must not mutate the original imported object');
});
test('all active game descriptions use new terminology',()=>{
 for(const path of ['app.js','data.js'])assert.doesNotMatch(readFileSync(new URL('../'+path,import.meta.url),'utf8'),/暂退|护体|忘却|LEGACIES|legacyPage/);
});
test('ethereal metadata and refinement descriptions are visible and consistent',()=>{
 for(const id of ['W14','U10'])for(const up of [false,true]){assert.equal(isEthereal({id,up}),true);assert.match(describe({id,up}),/虚无/);}
 assert.equal(isEthereal({id:'W16',up:false}),true);assert.equal(isEthereal({id:'W16',up:true}),false);
 assert.doesNotMatch(describe({id:'W16',up:true}),/虚无/);assert.equal(isEthereal({id:'W01'}),false);
});
test('unplayed ethereal is consumed at end turn, ordinary cards are discarded, original deck preserved',()=>{
 const g=fixture(['W14','W01']);const [ghost,ordinary]=g.s.b.hand,deck=clone(g.s.deck);g.s.b.enemies[0].intent={label:'等待'};g.endTurn();
 assert.ok(g.s.b.exhaust.some(c=>c.uid===ghost.uid));assert.ok(g.s.b.discard.some(c=>c.uid===ordinary.uid));assert.equal(g.s.stats.exhausted,1);assert.deepEqual(g.s.deck,deck);
 assert.ok(g.s.b.log.some(x=>x.includes('虚无触发')));
});
test('playing a non-exhaust ethereal attack normally sends it to discard, not consumption',()=>{
 const g=fixture(['W14']);const c=g.s.b.hand[0];play(g,'W14');assert.ok(g.s.b.discard.some(x=>x.uid===c.uid));assert.equal(g.s.b.exhaust.length,0);assert.equal(g.s.stats.exhausted,0);
});
test('ethereal takes precedence over Retain',()=>{
 const g=fixture(['U17','W14']);const c=g.s.b.hand[1];play(g,'U17',[c.uid]);assert.equal(c.retain,true);g.endTurn();assert.ok(g.s.b.exhaust.some(x=>x.uid===c.uid));assert.equal(c.retain,undefined);
});
test('refinement can remove ethereal and preserve it until ordinary discard',()=>{
 const g=fixture(['U16','W16']);const c=g.s.b.hand[1];play(g,'U16',[c.uid]);assert.equal(c.up,true);g.endTurn();assert.ok(g.s.b.discard.some(x=>x.uid===c.uid));assert.ok(!g.s.b.exhaust.some(x=>x.uid===c.uid));
});
test('played and unplayed dodge each consume exactly once',()=>{
 for(const used of [true,false]){const g=fixture(['U10']);const c=g.s.b.hand[0];if(used)play(g,'U10');g.endTurn();assert.equal(g.s.b.exhaust.filter(x=>x.uid===c.uid).length,1);assert.equal(g.s.stats.exhausted,1);}
});
test('end-turn ethereal triggers muscle sutra and northern darkness, guarding against current enemy attack',()=>{
 const g=fixture(['W14','W16']);g.s.b.powers.W38=false;g.s.b.powers.W37=false;g.s.b.powers.W22=false;
 g.s.b.enemies[0].intent={damage:5,label:'劈砍'};g.endTurn();
 assert.equal(g.s.hp,40);assert.equal(g.s.b.block,1);assert.equal(g.s.b.exhaust.length,2);
 assert.equal(g.s.b.log.filter(x=>x.includes('回复1真气')).length,2);assert.equal(g.s.b.qi,3,'unused end-turn energy is reset next turn normally');
});
test('dark embrace drawing an ethereal during cleanup consumes it in the same turn',()=>{
 const g=fixture(['W14']);g.s.b.powers.W36=false;const second=g.make('W16');g.s.b.draw.push(second);g.endTurn();
 assert.deepEqual(g.s.b.exhaust.map(c=>c.id),['W14','W16']);assert.ok(!g.s.b.hand.some(c=>c.uid===second.uid));
});
test('ethereal triggers chess and doll without incorrectly counting discard as consumption',()=>{
 const g=fixture(['W14','U10','W01'],['R09','R18']);g.endTurn();
 assert.equal(g.s.stats.exhausted,2);assert.equal(g.s.b.log.filter(x=>x.includes('棋子袋')).length,2);assert.equal(g.s.b.log.filter(x=>x.includes('罗汉木偶')).length,1);
});
test('holy flame can end battle through ethereal triggers before enemies act',()=>{
 const g=fixture(['W14','U10'],['R17']);g.s.b.enemies[0].hp=6;g.endTurn();assert.equal(g.s.phase,'reward');assert.equal(g.s.hp,40);assert.equal(g.s.stats.exhausted,2);
});
test('ethereal and pending retain remain deterministic through save/restore',()=>{
 const g=fixture(['W14','W16','W01']);g.s.b.hand[0].retain=true;g.s.b.powers.W36=true;const restored=new Game(clone(g.s));g.endTurn();restored.endTurn();assert.deepEqual(restored.s,g.s);
});
