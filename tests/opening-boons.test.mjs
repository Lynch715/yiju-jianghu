import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone,validOpening,SAVE_VERSION,STARTING_DECK} from '../engine.js';
import {CARD,RELIC,OPENING_BOONS} from '../data.js';

function find(id,predicate=()=>true){for(let seed=0;seed<3000;seed++){const g=new Game();g.start(seed,{character:false});const option=g.s.opening.options.find(x=>x.id===id);if(option&&predicate(option))return {g,option};}throw Error('missing boon '+id);}
function finish(g,option){assert.equal(g.chooseOpening(option.id),true);if(!g.s.opening.result)assert.equal(g.completeOpening(option.id==='insight'?option.cards[0]:g.s.deck[0].uid),true);assert.equal(g.leaveOpening(),true);}

test('default new runs offer 4 distinct random boons before the map, with 3 gifts and 1 tradeoff',()=>{
 const layouts=new Set(),seen=new Set();
 for(let seed=0;seed<100;seed++){
  const g=new Game();g.start(seed,{character:false});const o=g.s.opening;assert.equal(g.s.phase,'opening');assert.deepEqual(g.s.deck.map(c=>c.id),STARTING_DECK);
  assert.equal(o.options.length,4);assert.equal(new Set(o.options.map(x=>x.id)).size,4);assert.equal(o.options.filter(x=>OPENING_BOONS.find(d=>d.id===x.id).risk).length,1);assert.equal(validOpening(o),true);
  assert.equal(g.enter('battle'),false);assert.equal(g.leaveOpening(),false);assert.equal('legacy' in g.s,false);o.options.forEach(x=>seen.add(x.id));layouts.add(o.options.map(x=>x.id).join(','));
  const same=new Game();same.start(seed,{character:false});assert.deepEqual(o,same.s.opening);assert.equal(g.beginOpening(),false);
 }
 assert.equal(seen.size,8);assert.ok(layouts.size>30);
});
test('coins and vitality apply their exact benefits once',()=>{
 for(const id of ['coins','vitality']){
  const {g,option}=find(id);finish(g,option);assert.equal(g.s.gold,id==='coins'?165:90);assert.equal(g.s.maxHp,id==='vitality'?87:80);assert.equal(g.s.hp,g.s.maxHp);
  const before=clone(g.s);assert.equal(g.chooseOpening(id),false);assert.equal(g.completeOpening(),false);assert.equal(g.beginOpening(),false);assert.deepEqual(g.s,before);
 }
});
test('refinement selection is preserved, can be backed out before applying, and changes damage in combat',()=>{
 const {g,option}=find('refine');const rng=g.s.rng,deck=clone(g.s.deck);g.chooseOpening(option.id);assert.equal(g.completeOpening(-1),false);assert.deepEqual(g.s.deck,deck);
 const restored=new Game(g.s);assert.equal(restored.s.opening.selected,'refine');assert.equal(restored.backOpening(),true);assert.equal(restored.s.rng,rng);assert.equal(restored.chooseOpening('refine'),true);
 const card=restored.s.deck.find(c=>c.id==='W01');assert.equal(restored.completeOpening(card.uid),true);assert.equal(card.up,true);assert.equal(restored.backOpening(),false);
 restored.leaveOpening();restored.enter('battle');for(let n=0;n<8&&!restored.s.b.hand.some(c=>c.uid===card.uid);n++)restored.endTurn();const b=restored.s.b,e=b.enemies[0],before=e.hp;
 // Isolate refinement damage from debuffs inflicted while waiting to draw the card.
 b.weak=0;e.vuln=0;e.block=0;
 assert.equal(restored.play(card.uid,0).ok,true);assert.equal(before-e.hp,9);
});
test('removal removes only the selected copy from permanent deck and combat',()=>{
 const {g,option}=find('simplify');g.chooseOpening(option.id);const removed=g.s.deck[0].uid;assert.equal(g.completeOpening(removed),true);assert.equal(g.s.deck.length,9);g.leaveOpening();g.enter('battle');
 assert.equal([...g.s.b.hand,...g.s.b.draw].some(c=>c.uid===removed),false);assert.equal(g.s.deck.filter(c=>c.id==='W01').length,4);
});
test('card boon is limited to its saved 3 offers, awards exactly one, and has no path filter',()=>{
 const paths=new Set();for(let seed=0;seed<200;seed++){
  const g=new Game();g.start(seed,{character:false});const option=g.s.opening.options.find(x=>x.id==='insight');if(!option)continue;
  assert.equal(option.cards.length,3);assert.equal(new Set(option.cards).size,3);for(const id of option.cards){assert.ok(CARD[id].rarity>0);paths.add(CARD[id].path);}
  g.chooseOpening('insight');const before=clone(g.s);assert.equal(g.completeOpening('W01'),false);assert.deepEqual(g.s,before);const restored=new Game(g.s);assert.deepEqual(restored.s.opening, before.opening);
  assert.equal(restored.completeOpening(option.cards[0]),true);assert.equal(restored.s.deck.length,11);assert.equal(restored.s.deck.at(-1).id,option.cards[0]);assert.equal(restored.completeOpening(option.cards[1]),false);
 }
 for(const path of ['劲力','格挡','变招','血战','连击','通用'])assert.ok(paths.has(path),path);
});
test('HP tradeoff pays 8 HP for a tier-1 relic and its actual combat effects work',()=>{
 const {g,option}=find('relicWound',o=>o.relic==='R04');finish(g,option);assert.equal(g.s.hp,72);assert.deepEqual(g.s.relics,['R01','R04']);assert.equal(RELIC[option.relic].tier,1);g.enter('battle');assert.equal(g.s.b.str,2);assert.equal(g.s.b.hand.length,4);
});
test('curse tradeoff adds the curse to real combat and grants a tier-2 relic',()=>{
 const {g,option}=find('relicCurse',o=>o.relic==='R21');finish(g,option);assert.equal(g.s.deck.length,11);assert.equal(g.s.deck.at(-1).id,'CURSE');assert.equal(g.s.hp,80);assert.equal(RELIC[option.relic].tier,2);
 g.enter('battle');assert.equal(g.s.b.openDart,true);assert.equal([...g.s.b.hand,...g.s.b.draw].filter(c=>c.id==='CURSE').length,1);
});
test('rare tradeoff takes all starting money and grants one rare from the saved random result',()=>{
 const {g,option}=find('rareToll');finish(g,option);assert.equal(g.s.gold,0);assert.equal(g.s.deck.length,11);assert.equal(g.s.deck.at(-1).id,option.card);assert.equal(CARD[option.card].rarity,3);assert.equal(g.s.hp,80);
});
test('a completed boon survives reload without paying or granting twice',()=>{
 for(const boon of OPENING_BOONS){const {g,option}=find(boon.id);g.chooseOpening(option.id);if(!g.s.opening.result)g.completeOpening(boon.id==='insight'?option.cards[0]:g.s.deck[0].uid);
  const saved=clone(g.s),restored=new Game(saved);assert.deepEqual(restored.s,saved);assert.equal(validOpening(restored.s.opening),true);assert.equal(restored.chooseOpening(option.id),false);assert.equal(restored.completeOpening(),false);assert.equal(restored.backOpening(),false);assert.deepEqual(restored.s,saved);
  assert.equal(restored.leaveOpening(),true);assert.equal(restored.leaveOpening(),false);assert.equal(restored.s.step,0);assert.equal(restored.s.history.length,0);
 }
});
test('unknown options and unaffordable HP tradeoffs do not mutate resources',()=>{
 const {g}=find('relicWound');let before=clone(g.s);assert.equal(g.chooseOpening('unknown'),false);assert.deepEqual(g.s,before);g.s.hp=8;before=clone(g.s);assert.equal(g.chooseOpening('relicWound'),false);assert.deepEqual(g.s,before);
});
test('saved opening validation rejects missing payloads, duplicate offers and invalid selections',()=>{
 const {g}=find('insight');const valid=clone(g.s.opening);assert.equal(validOpening(null),false);assert.equal(validOpening(valid),true);
 for(const change of [o=>o.options.pop(),o=>o.options[1]=o.options[0],o=>o.selected='unknown',o=>o.options.find(x=>x.id==='insight').cards=['QI','U01','W01'],o=>o.options[0]=null]){const bad=clone(valid);change(bad);assert.equal(validOpening(bad),false);}
});
test('old active runs retain map and battle progress without retroactive boons',()=>{
 for(const battle of [false,true]){const g=new Game();g.start(42,{opening:false});if(battle)g.enter('battle');g.s.version=2;const saved=clone(g.s),restored=new Game(saved);assert.equal(restored.s.version,SAVE_VERSION);assert.equal(restored.s.opening,undefined);for(const f of ['phase','deck','relics','hp','rng','b'])assert.deepEqual(restored.s[f],saved[f]);}
});
