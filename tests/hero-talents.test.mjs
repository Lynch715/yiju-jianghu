import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,clone,STARTING_DECK} from '../engine.js';
import {HEROES,TALENTS,validPlayer,validCharacterDraft} from '../players.js';
import {describeCombatCard} from '../card-preview.js';
import {runGame} from './playthrough.mjs';
function create(id='linghu',talent='steady'){
 const g=new Game();g.start(123);assert.ok(g.chooseHero(id));
 if(id==='custom'){g.setCharacterName('柳听风');g.choosePlayerPortrait('female-qing');assert.ok(g.chooseTalent(talent));}
 assert.ok(g.finishCharacter());return g;
}
function duel(id,talent){const g=create(id,talent);g.s.phase='map';g.combat('battle');g.s.hp=60;g.s.relics=[];const b=g.s.b;b.enemies=b.enemies.slice(0,1);Object.assign(b.enemies[0],{hp:10000,maxHp:10000,block:0,tactics:undefined});delete b.enemies[0].tactics;b.hand=[];b.draw=Array.from({length:30},()=>g.make('W01'));b.discard=[];b.qi=100;return g;}
function cast(g,id){const c=g.make(id);g.s.b.hand.push(c);assert.ok(g.play(c.uid).ok);return c;}
function reset(g){g.s.b.hand=[];g.s.b.draw=Array.from({length:30},()=>g.make('W01'));g.beginTurn();g.s.b.qi=100;}
test('six distinct named heroes cover both genders, with exclusive talents and unchanged opening RNG',()=>{
 assert.equal(HEROES.filter(h=>h.gender==='male').length,3);assert.equal(HEROES.filter(h=>h.gender==='female').length,3);assert.equal(new Set(HEROES.map(h=>h.talent)).size,6);
 let baseline;for(const h of HEROES){const g=create(h.id);assert.equal(g.s.player.name,h.name);assert.equal(g.s.player.talent,h.talent);assert.ok(validPlayer(g.s.player));assert.deepEqual(g.s.deck.map(c=>c.id),STARTING_DECK);assert.equal(g.s.maxHp,80);assert.equal(g.s.gold,90);if(!baseline)baseline=clone(g.s);assert.deepEqual(g.s.opening,baseline.opening);assert.equal(g.s.rng,baseline.rng);}
});
test('selection saves and resumes; invalid heroes, foreign talents and mid-run switching are rejected',()=>{
 const g=new Game();g.start(123);const before=clone(g.s);for(const id of ['constructor','__proto__','bad',null,{},1])assert.equal(g.chooseHero(id),false);assert.deepEqual(g.s,before);
 g.chooseHero('qiao');assert.equal(g.chooseTalent('steady'),false);assert.equal(g.choosePlayerPortrait('female-qing'),false);assert.equal(g.setCharacterName('黄蓉'),false);const h=new Game(g.s);assert.ok(validCharacterDraft(h.s.character));assert.ok(h.finishCharacter());const fixed=clone(h.s);assert.equal(h.chooseHero('long'),false);assert.equal(h.chooseTalent('jade'),false);assert.deepEqual(h.s,fixed);
});
test('custom heroes choose exactly one common talent; vigor applies once across reload and appearance edit',()=>{
 assert.equal(TALENTS.filter(t=>t.common).length,4);const g=create('custom','vigor');assert.equal(g.s.maxHp,88);assert.equal(g.s.hp,88);assert.equal(g.finishCharacter(),false);
 const h=new Game(g.s);h.editCharacter();assert.equal(h.chooseHero('long'),false);assert.equal(h.chooseTalent('steady'),false);h.setCharacterName('新名字');h.choosePlayerPortrait('male-bai');assert.ok(h.finishCharacter());assert.equal(h.s.maxHp,88);assert.equal(h.s.player.talent,'vigor');assert.equal(h.s.player.hero,'custom');
});
test('legacy profiles and unfinished drafts receive no retroactive talent or resources',()=>{
 const g=new Game();g.start(42,{opening:false});g.combat('battle');g.s.version=7;const before=clone(g.s),h=new Game(g.s);assert.equal(h.s.player.talent,undefined);for(const k of ['hp','maxHp','b','deck','rng'])assert.deepEqual(h.s[k],before[k]);
 g.start(42);delete g.s.character.hero;delete g.s.character.talent;delete g.s.character.selectionMode;g.setCharacterName('旧侠客');g.choosePlayerPortrait('male-qing');assert.ok(g.finishCharacter());assert.equal(g.s.player.talent,undefined);
});
test('validation rejects forged named/custom talent pairs while preserving old identities',()=>{
 const base={name:'柳听风',portrait:'female-qing'};assert.ok(validPlayer(base));for(const p of [{hero:'linghu',talent:'dragon'},{hero:'custom',talent:'jade'},{hero:'bad',talent:'steady'},{talent:'steady'},{hero:'custom'}])assert.equal(validPlayer({...base,...p}),false);
});
test('Linghu draws once per turn after the first manual skill, including after save/reload',()=>{
 const g=duel('linghu');cast(g,'U01');assert.equal(g.s.b.hand.length,1);const h=new Game(g.s);cast(h,'U01');assert.equal(h.s.b.hand.length,1);reset(h);const n=h.s.b.hand.length;cast(h,'U01');assert.equal(h.s.b.hand.length,n+1);
});
test('Qiao refunds energy on every third manual attack; repeated resolutions do not count as extra cards',()=>{
 const g=duel('qiao');for(let i=1;i<=6;i++){const qi=g.s.b.qi;cast(g,'W01');assert.equal(g.s.b.qi,qi-1+(i%3===0?1:0));}reset(g);g.s.b.repeat=3;cast(g,'W01');assert.equal(g.s.b.turnFlags.attacks,1);assert.equal(g.s.b.qi,99);
});
test('Guo Jing direct block bonus applies once per turn, stacks with relics and ignores indirect blocks',()=>{
 const g=duel('guojing');g.s.relics=['R06'];g.block(2);const n=g.s.b.block;cast(g,'U01');assert.equal(g.s.b.block-n,11);cast(g,'U01');assert.equal(g.s.b.block-n,16);const h=new Game(g.s);cast(h,'U01');assert.equal(h.s.b.block-n,21);reset(h);cast(h,'U01');assert.equal(h.s.b.block,11);
});
test('Huang Rong draws only on the third manual card, with turn flags preserved by reload',()=>{
 const g=duel('huangrong');cast(g,'U01');cast(g,'W01');assert.equal(g.s.b.hand.length,0);const h=new Game(g.s);cast(h,'W01');assert.equal(h.s.b.hand.length,1);cast(h,'U01');assert.equal(h.s.b.hand.length,1);reset(h);const n=h.s.b.hand.length;cast(h,'W01');cast(h,'W01');cast(h,'U01');assert.equal(h.s.b.hand.length,n+1);
});
test('Xiaolongnu boosts only the first hit of the first attack, never each segment, target or repeat',()=>{
 const g=duel('long'),b=g.s.b,e=b.enemies[0];b.repeat=2;const hp=e.hp;cast(g,'W08');assert.equal(hp-e.hp,6*6+3); // W08: 6x2, repeated twice, plus one talent bonus.
 const next=e.hp;cast(g,'W01');assert.equal(next-e.hp,6);reset(g);const h=new Game(g.s);const before=h.s.b.enemies[0].hp;cast(h,'W01');assert.equal(before-h.s.b.enemies[0].hp,9);
});
test('talent damage/block previews match actual settlement and never mutate the live save',()=>{
 for(const [id,card,expect] of [['long','W01','9'],['guojing','U01','8']]){const g=duel(id),c=g.make(card);g.s.b.hand.push(c);const before=clone(g.s);assert.ok(describeCombatCard(g,c,0).includes(expect));assert.deepEqual(g.s,before);const e=g.s.b.enemies[0],hp=e.hp,block=g.s.b.block;g.play(c.uid,0);assert.equal(card==='W01'?hp-e.hp:g.s.b.block-block,Number(expect));}
});
test('Guo Xiang victory healing respects max HP and does not replay on reload',()=>{
 const g=duel('guoxiang');g.s.hp=79;g.s.b.enemies[0].hp=1;cast(g,'W01');assert.equal(g.s.phase,'reward');assert.equal(g.s.hp,80);g.s.hp=50;const h=new Game(g.s);assert.equal(h.s.hp,50);
});
for(const [id,block,qi,hand] of [['steady',6,3,5],['breath',0,4,5],['insight',0,3,6]])test(`custom ${id} applies on the first turn of each battle only`,()=>{
 const g=create('custom',id);g.s.phase='map';g.combat('battle');assert.equal(g.s.b.block,block);assert.equal(g.s.b.qi,qi);assert.equal(g.s.b.hand.length,hand);const before=clone(g.s),h=new Game(g.s);assert.deepEqual(h.s,before);h.beginTurn();assert.equal(h.s.b.block,0);assert.equal(h.s.b.qi,3);assert.equal(h.s.b.hand.length,10);h.s.phase='map';h.combat('battle');assert.equal(h.s.b.block,block);assert.equal(h.s.b.hand.length,hand);
});
for(const id of [...HEROES.map(h=>h.id),'custom'])test(`new identity ${id} completes a legal journey simulation from real opening/resources`,()=>{
 const r=runGame('随缘',42,true,{hero:id,talent:'insight'});assert.ok(['win','lost'].includes(r.phase));assert.ok(r.iterations<1200);assert.ok(r.plays>0);assert.ok(validPlayer(r.state.player));assert.equal(r.state.player.hero,id);
});
