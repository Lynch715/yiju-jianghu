import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,CARD,RELICS,describe} from '../data.js';
import {Game,clone} from '../engine.js';
import {fixture,play} from './fixtures.mjs';

test('catalogue has exactly 60 martial cards, 20 general cards and 30 unique relics',()=>{
 assert.equal(CARDS.length,80);assert.equal(CARDS.filter(x=>x.id.startsWith('W')).length,60);assert.equal(RELICS.length,30);
 assert.equal(new Set(CARDS.map(x=>x.id)).size,80);assert.equal(new Set(RELICS.map(x=>x.id)).size,30);
 for(const d of CARDS)for(const up of [false,true])assert.ok(!/[{}]/.test(describe({id:d.id,up})));
});
for(const up of [false,true])for(const d of CARDS)test(`${d.id} ${up?'refined':'base'} resolves through actual play, selections and card lifecycle`,()=>{
 const g=fixture([d.id,'QI','CURSE','W01','U01','U02']);const b=g.s.b,c=b.hand[0];c.up=up;
 if(d.id==='W49')g.s.hp=20;
 const spec=g.selection(c),selected=spec.candidates.slice(0,spec.max).map(x=>x.uid),qi=b.qi;
 const r=g.play(c.uid,0,selected);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(b.hand.some(x=>x.uid===c.uid),false);
 if(d.type==='p')assert.equal(b.powers[d.id],up);else assert.ok([...b.discard,...b.exhaust].some(x=>x.uid===c.uid));
 assert.ok(Number.isFinite(g.s.hp)&&Number.isFinite(b.qi)&&Number.isFinite(b.block));assert.equal(b.turnFlags.plays,1);
 assert.ok(b.log.some(x=>x.includes(d.name)));assert.ok(qi>=0);
});

// Independent numeric expectations from the approved card table, with no strength or relics.
const attacks={W01:[6,9],W02:[5,7],W03:[8,12],W04:[6,9],W07:[14,18],W08:[12,16],W09:[5,7],W10:[10,14],W11:[6,9],W14:[10,14],W15:[24,30],W19:[5,7],W32:[9,12],W33:[8,11],W34:[18,24],W43:[12,16],W44:[18,24],W46:[9,12],W47:[8,10],W50:[9,12],W52:[8,11],W53:[6,9],W55:[8,10],W56:[4,6],W58:[7,10],W60:[8,10],U08:[3,5],U11:[7,10],U12:[6,9],U18:[4,6],U19:[5,8]};
for(const [id,damage] of Object.entries(attacks))for(const up of [false,true])test(`${id}: damage matches ${up?'refined':'base'} design`,()=>{const g=fixture([id]);play(g,id,[],up);assert.equal(g.s.b.enemies[0].hp,2000-damage[up?1:0]);});
const guards={W02:[3,5],W05:[7,10],W06:[5,8],W09:[5,7],W19:[7,10],W20:[8,11],W21:[5,8],W23:[18,24],W24:[7,10],W25:[12,16],W30:[9,12],W57:[7,10],U01:[5,8],U10:[3,5],U13:[7,10],U20:[8,11]};
for(const [id,amount] of Object.entries(guards))for(const up of [false,true])test(`${id}: guard matches ${up?'refined':'base'} design`,()=>{const g=fixture([id]);play(g,id,[],up);assert.equal(g.s.b.block,amount[up?1:0]);});

test('base strike + strength and multi-hit apply strength per hit',()=>{const g=fixture(['W08']);g.s.b.str=3;play(g,'W08');assert.equal(g.s.b.enemies[0].hp,1982);});
test('heavy palm uses a total triple strength multiplier',()=>{const g=fixture(['W07']);g.s.b.str=3;play(g,'W07');assert.equal(g.s.b.enemies[0].hp,1977);});
test('vulnerable, weak and enemy guard settle in correct order',()=>{const g=fixture(['W01']);g.s.b.weak=1;const e=g.s.b.enemies[0];e.vuln=1;e.block=3;play(g,'W01');assert.equal(e.hp,1997);assert.equal(e.block,0);});
test('temporary strength expires but permanent strength survives turn end',()=>{const g=fixture(['W16']);g.s.b.str=2;play(g,'W16');assert.equal(g.s.b.str,5);g.endTurn();assert.equal(g.s.b.str,2);});
test('Purple mist grows only on following turns',()=>{const g=fixture(['W12']);play(g,'W12');assert.equal(g.s.b.str,0);g.endTurn();assert.equal(g.s.b.str,2);});
test('dragon elephant grants strength on every same-name copy',()=>{const g=fixture(['W13','W13']);play(g,'W13');assert.equal(g.s.b.str,2);assert.equal(g.reason(g.s.b.hand[0]),'');play(g,'W13');assert.equal(g.s.b.str,4);assert.deepEqual(g.powerCopies('W13'),[false,false]);});
test('tai chi block is not consumed and ignores strength',()=>{const g=fixture(['W27']);g.s.b.block=40;g.s.b.str=100;play(g,'W27');assert.equal(g.s.b.enemies[0].hp,1960);assert.equal(g.s.b.block,40);});
test('empty fist floors its percentage and golden body preserves all remaining block',()=>{const g=fixture(['W26']);g.s.b.block=7;play(g,'W26');assert.equal(g.s.b.block,10);g.s.b.powers.W22=false;g.s.b.block=60;g.s.b.enemies[0].intent={block:0,label:'观察'};g.endTurn();assert.equal(g.s.b.block,60);});
test('without golden body unused block clears at next player turn',()=>{const g=fixture();g.s.b.block=60;g.s.b.enemies[0].intent={label:'观察'};g.endTurn();assert.equal(g.s.b.block,0);});
test('single reflection spends its token and only reflects blocked amount',()=>{const g=fixture(['W24']);play(g,'W24');g.s.b.enemies[0].intent={damage:5,hits:2,label:'双击'};g.endTurn();assert.equal(g.s.b.enemies[0].hp,1995);assert.equal(g.s.hp,37);});
test('round reflection returns the full blocked amount on every hit',()=>{const g=fixture(['W25']);play(g,'W25');g.s.b.block=100;g.s.b.enemies[0].intent={damage:10,hits:3,label:'三击'};g.endTurn();assert.equal(g.s.b.enemies[0].hp,1970);});
test('direct block buff applies once and does not buff exhaust-triggered block',()=>{const g=fixture(['W35','QI','QI'],['R06']);g.s.b.powers.W29=false;g.s.b.powers.W38=false;const ids=g.s.b.hand.slice(1).map(c=>c.uid);play(g,'W35',ids);assert.equal(g.s.b.block,23);});
test('northern darkness + fold plum + muscle sutra forms the approved 18 block / 2 energy combo',()=>{const g=fixture(['W35','QI','QI']);g.s.b.qi=3;g.s.b.powers.W38=false;g.s.b.powers.W37=false;play(g,'W35',g.s.b.hand.slice(1).map(c=>c.uid));assert.equal(g.s.b.block,18);assert.equal(g.s.b.qi,4);assert.equal(g.s.b.exhaust.length,2);});
test('northern darkness and small formless trigger on all four consumed cards',()=>{const g=fixture(['W35','QI','QI','W35','QI','QI']);g.s.b.powers.W37=false;g.s.b.powers.W36=true;const before=g.s.b.draw.length;let c=g.s.b.hand[0];g.play(c.uid,0,g.s.b.hand.filter(c=>c.id==='QI').slice(0,2).map(c=>c.uid));c=g.s.b.hand.find(c=>c.id==='W35');g.play(c.uid,0,g.s.b.hand.filter(c=>c.id==='QI').slice(0,2).map(c=>c.uid));assert.equal(g.s.b.qi,32);assert.equal(g.s.b.draw.length,before-8);});
test('exhausting statuses cleans draw cycle without deleting original deck',()=>{const g=fixture(['W42','QI','CURSE']);const deck=clone(g.s.deck);play(g,'W42',g.s.b.hand.slice(1).map(c=>c.uid));assert.equal(g.s.b.exhaust.length,3);assert.deepEqual(g.s.deck,deck);});
test('required selection failure is atomic; optional selection can be skipped',()=>{const g=fixture(['W31','W01','W32']);const before=clone(g.s);assert.equal(g.play(g.s.b.hand[0].uid,0,[]).ok,false);assert.deepEqual(g.s,before);play(g,'W32');});
test('self-damage bypasses block, triggers before damage, cannot actively kill player',()=>{const g=fixture(['W43','W01'],['R07']);g.s.b.powers.W51=false;g.s.b.powers.W48=false;g.s.b.block=20;play(g,'W43');assert.equal(g.s.hp,38);assert.equal(g.s.b.str,1);assert.equal(g.s.b.block,30);assert.equal(g.s.b.enemies[0].hp,1987);g.s.hp=2;g.s.b.hand.push(g.make('W43'));const before=clone(g.s);assert.equal(g.play(g.s.b.hand.at(-1).uid,0).ok,false);assert.deepEqual(g.s,before);});
test('enemy damage and curse loss do not activate self-damage engines',()=>{const g=fixture(['CURSE'],['R07']);g.s.b.powers.W51=false;g.endTurn();assert.equal(g.s.b.str,0);assert.equal(g.s.hp,28);});
test('blood payoffs: palm, claws and finger activate after self-loss',()=>{for(const [id,damage,draws] of [['W46',15,0],['W47',12,0],['W52',8,1]]){const g=fixture([id]);g.s.b.turnFlags.self=true;play(g,id);assert.equal(g.s.b.enemies[0].hp,2000-damage);assert.equal(g.s.b.hand.length,draws);}});
test('nine yang heals on victory once in addition to medicine pouch',()=>{const g=fixture(['W01'],['R01']);g.s.b.powers.W48=true;g.s.b.enemies[0].hp=1;play(g,'W01');assert.equal(g.s.phase,'reward');assert.equal(g.s.hp,49);});
test('every shenzhao copy can heal and is consumed separately',()=>{const g=fixture(['W49','W49']);play(g,'W49');assert.equal(g.s.hp,46);assert.equal(g.reason(g.s.b.hand[0]),'');play(g,'W49');assert.equal(g.s.hp,52);assert.equal(g.s.b.exhaust.length,2);});
test('blood blade heals on ordinary kills but not summoned kills',()=>{for(const summoned of [false,true]){const g=fixture(['W50'],['R15']);const e=g.s.b.enemies[0];e.hp=1;e.summoned=summoned;play(g,'W50');assert.equal(g.s.hp,summoned?40:43);assert.equal(g.s.b.str,summoned?0:2);}});
test('mutual combat duplicates X using original paid energy, without extra manual play',()=>{const g=fixture(['W18','W59']);g.s.b.qi=3;play(g,'W18');play(g,'W59');assert.equal(g.s.b.enemies[0].hp,1984);assert.equal(g.s.b.turnFlags.plays,2);assert.equal(g.s.b.turnFlags.attacks,1);assert.equal(g.s.b.qi,0);});
test('mutual combat pays self-cost twice; second resolution cancels if unsafe',()=>{for(const hp of [40,4]){const g=fixture(['W18','W43']);g.s.hp=hp;play(g,'W18');play(g,'W43');assert.equal(g.s.hp,hp===40?36:2);assert.equal(g.s.b.enemies[0].hp,hp===40?1976:1988);}});
test('mutual combat recalculates no-form hand instead of duplicating consumed cards',()=>{const g=fixture(['W18','W41','W01','U01']);play(g,'W18');play(g,'W41');assert.equal(g.s.b.enemies[0].hp,1990);});
test('jade maiden and quanzhen read last manual card, not triggered actions',()=>{const g=fixture(['U10','W55','U10','W04']);play(g,'U10');play(g,'W55');assert.equal(g.s.b.enemies[0].hp,1988);play(g,'U10');play(g,'W04');assert.equal(g.s.b.hand.length,1);});
test('six yang discount applies to one skill and expires even if held',()=>{const g=fixture(['W58','U01','U01']);play(g,'W58');assert.equal(g.cost(g.s.b.hand[0]),0);play(g,'U01');assert.equal(g.cost(g.s.b.hand[0]),1);});
test('refinement in combat is temporary; original deck upgrades survive exhaust',()=>{const g=fixture(['U16','W01']);const original=clone(g.s.deck),c=g.s.b.hand[1];play(g,'U16',[c.uid]);assert.equal(c.up,true);g.retireSelected([c.uid]);assert.equal(g.s.b.exhaust.find(x=>x.uid===c.uid).up,true);assert.deepEqual(g.s.deck,original);});
test('retain lasts exactly one end-of-turn boundary',()=>{const g=fixture(['U17','W03']);const c=g.s.b.hand[1];play(g,'U17',[c.uid]);g.endTurn();assert.ok(g.s.b.hand.some(x=>x.uid===c.uid));assert.equal(c.retain,undefined);});
test('card overflow goes to discard; no phantom draw from exhaust',()=>{const g=fixture(Array(10).fill('W01'));g.draw(2);assert.equal(g.s.b.hand.length,10);assert.equal(g.s.b.discard.length,2);g.s.b.draw=[];g.s.b.discard=[];g.draw(20);assert.equal(g.s.b.hand.length,10);});
test('battle save roundtrip continues deterministically from selected/exhausted state',()=>{const g=fixture(['W35','QI','W01']);play(g,'W35',[g.s.b.hand[1].uid]);const restored=new Game(JSON.parse(JSON.stringify(g.s)));g.endTurn();restored.endTurn();assert.deepEqual(restored.s,g.s);});
test('rest, shop removal, event reward, boss reward and final transition all gate correctly',()=>{
 const g=new Game();g.start(42,{opening:false,classic:true});g.s.step=3;assert.ok(g.enter('rest'));const c=g.s.deck[0];assert.ok(g.rest('upgrade',c.uid));assert.equal(c.up,true);assert.equal(g.s.step,4);
 assert.ok(g.enter('shop'));g.s.gold=500;assert.ok(g.buyCard(0));assert.equal(g.buyCard(0),false);assert.ok(g.removeCard(c.uid));assert.equal(g.removeCard(g.s.deck[0].uid),false);g.finishNode();
 g.s.step=17;g.s.phase='map';g.enter('boss');for(const e of g.s.b.enemies)e.hp=0;g.checkEnd();assert.equal(g.s.reward.cards.length,3);assert.equal(g.s.reward.relics.length,3);assert.equal(g.leaveReward(),false);g.chooseRewardCard(g.s.reward.cards[0]);g.chooseRewardRelic(g.s.reward.relics[0]);g.leaveReward();assert.equal(g.s.phase,'win');assert.equal(g.s.history.at(-1).step,17);
});
test('all rewards avoid owned powers and relics, while ordinary cards may repeat',()=>{const g=new Game();g.start(undefined,{opening:false,classic:true});for(let i=0;i<100;i++){for(const id of g.offerCards())assert.ok(!(CARD[id].type==='p'&&g.s.deck.some(c=>c.id===id)));for(const id of g.offerRelics(3,[1,2,3]))assert.ok(!g.has(id));}});
test('pin reduction affects only first segment and preview matches the actual damage',()=>{const g=fixture(['U09']);g.s.b.enemies[0].intent={damage:10,hits:2,label:'连击'};play(g,'U09');assert.equal(g.previewEnemy(g.s.b.enemies[0]),4);assert.equal(g.previewEnemy(g.s.b.enemies[0],1),10);g.endTurn();assert.equal(g.s.hp,26);});
test('bee healing never activates between encounters',()=>{const g=fixture([],['R22']);g.s.phase='event';g.s.hp=30;g.bee();assert.equal(g.s.hp,30);});
test('event rewards cannot be claimed twice before leaving',()=>{const g=new Game();g.start(undefined,{opening:false,classic:true});g.s.step=1;g.enter('event');g.s.scene.event='traveller';const before=g.s.gold;assert.equal(g.eventChoice(1),true);assert.equal(g.eventChoice(1),false);assert.equal(g.s.gold,before+35);});
