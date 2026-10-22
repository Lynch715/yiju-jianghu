import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,clone} from '../engine.js';
import {CHALLENGE_REVISION,talentChallenge,validChallenge} from '../difficulty.js';
import {HEROES,TALENTS,validCharacterDraft} from '../players.js';
import {ENEMY} from '../enemies.js';
import {createClearRecord,validClearRecord,recordGroup,serializeRecords,parseRecords} from '../records.js';
import {enemyActionView} from '../enemy-action.js';
function fresh(hero='linghu',talent='steady',level=1,seed=42){const g=new Game();g.start(seed,{trialLevel:level});g.chooseHero(hero);if(hero==='custom'){g.setCharacterName('新侠客');g.choosePlayerPortrait('female-qing');g.chooseTalent(talent);}assert.ok(g.finishCharacter());g.s.phase='map';return g;}
test('new creation captures challenge rules equally for all six heroes and four common talents',()=>{
 for(const [hero,talent] of [...HEROES.map(h=>[h.id]),...TALENTS.filter(t=>t.common).map(t=>['custom',t.id])]){const g=fresh(hero,talent);assert.equal(g.s.challengeRevision,CHALLENGE_REVISION);assert.equal(g.s.deck.length,10);assert.equal(g.s.gold,90);assert.equal(g.s.maxHp,talent==='vigor'?88:80);g.combat('battle');assert.ok(g.s.b.enemies.every(e=>e.challengeRevision===CHALLENGE_REVISION));}
});
test('drafts preserve the challenge marker through reload; v0.20 drafts gain no retroactive difficulty',()=>{
 const g=new Game();g.start(42);assert.equal(g.s.character.challengeRevision,1);assert.ok(validCharacterDraft(g.s.character));g.chooseHero('qiao');const loaded=new Game(g.s);assert.ok(loaded.finishCharacter());assert.equal(loaded.s.challengeRevision,1);
 const old=new Game();old.start(42);old.chooseHero('qiao');delete old.s.character.challengeRevision;const h=new Game(old.s);assert.ok(h.finishCharacter());assert.equal(h.s.challengeRevision,undefined);h.combat('battle');assert.ok(h.s.b.enemies.every(e=>e.challengeRevision===undefined));
});
test('v0.20 browser battle reload, subsequent actions and future encounters keep the old rules',()=>{
 const state=JSON.parse(readFileSync(new URL('./fixtures/v0.20.0/browser-battle.json',import.meta.url))),g=new Game(state);assert.deepEqual(g.s,state);g.endTurn();const loaded=new Game(g.s);assert.deepEqual(loaded.s,g.s);g.s.phase='map';loaded.s.phase='map';g.combat('battle');loaded.combat('battle');assert.deepEqual(loaded.s,g.s);assert.ok(g.s.b.enemies.every(e=>e.challengeRevision===undefined));
});
test('opening pressure is limited to 5% health with unchanged attack and guard scaling',()=>{
 const g=fresh(),old=new Game(g.s);delete old.s.challengeRevision;g.combat('battle');old.combat('battle');assert.deepEqual(g.s.b.enemies.map(e=>e.id),old.s.b.enemies.map(e=>e.id));
 for(const [i,e] of g.s.b.enemies.entries()){const b=old.s.b.enemies[i];assert.ok(Math.abs(e.hp-b.maxHp*1.05)<=1);assert.equal(e.damageScale,b.damageScale);assert.equal(e.guardScale,b.guardScale);}
});
test('later normal encounters, elites and bosses increase HP, attacks and guard; bosses begin with block',()=>{
 for(const chapter of [0,1,2])for(const kind of ['battle','elite','boss'])for(const level of [1,3,5]){const g=fresh('huangrong','steady',level);g.s.step=chapter*15+(kind==='boss'?14:8);const old=new Game(g.s);delete old.s.challengeRevision;g.combat(kind);old.combat(kind);assert.equal(g.s.rng,old.s.rng,'pressure cannot reroll encounters or hands');assert.deepEqual(g.s.b.hand,old.s.b.hand);
  for(const [i,e] of g.s.b.enemies.entries()){const b=old.s.b.enemies[i];assert.equal(e.id,b.id);assert.ok(e.maxHp>b.maxHp);assert.ok(e.damageScale>b.damageScale);assert.ok(e.guardScale>b.guardScale);if(e.kind==='boss')assert.equal(e.block,[4,8,12][chapter]);else assert.equal(e.block,0);}
 }
});
test('challenge grows with chapter and trial tier without altering original resource rules',()=>{
 for(const kind of ['battle','elite','boss']){const early=talentChallenge(0,kind,8,1),late=talentChallenge(2,kind,8,1),hard=talentChallenge(2,kind,8,5);assert.ok(late.hpScale>early.hpScale);assert.ok(late.damageScale>early.damageScale);assert.ok(hard.hpScale>late.hpScale);assert.ok(hard.damageScale>late.damageScale);}
});
test('new enemy previews match actual attacks under weakness, charge and multi-hit at every chapter',()=>{
 for(const chapter of [0,1,2])for(const level of [1,5]){const g=fresh('qiao','steady',level);g.s.step=chapter*15+14;g.combat('boss');const b=g.s.b,e=b.enemies[0];b.enemies=[e];g.s.hp=g.s.maxHp=10000;g.s.relics=[];b.hand=[];b.draw=[];b.discard=[];e.weak=1;e.str+=2;e.charge=3;e.intent=g.enemyIntent(e);
  const shown=enemyActionView(g,e).tags.filter(t=>t.kind==='attack').flatMap(t=>t.segments).reduce((n,x)=>n+x.amount*x.count,0);g.endTurn();assert.equal(b.lastEnemyActions[0].damage,shown);assert.equal(10000-g.s.hp,shown+(e.id==='ouyangfeng'?1:0));
 }
});
test('challenge snapshot and enemy stats survive appearance edits without applying multipliers twice',()=>{
 const g=fresh('long');g.s.step=29;g.combat('boss');const before=clone(g.s);const h=new Game(g.s);assert.deepEqual(h.s,before);h.editCharacter();h.setCharacterName('换名侠客');h.choosePlayerPortrait('male-qing');assert.ok(h.finishCharacter());assert.equal(h.s.challengeRevision,1);assert.deepEqual(h.s.b,before.b);assert.equal(h.chooseHero('linghu'),false);
});
test('summoned poison disciples inherit the boss challenge, while old boss summons remain unchanged',()=>{
 const fight=hard=>{const g=fresh('guojing');if(!hard)delete g.s.challengeRevision;g.s.step=29;g.s.expedition.bosses[1]='dingchunqiu';g.combat('boss');g.s.hp=g.s.maxHp=10000;const e=g.s.b.enemies[0];g.s.b.enemies=[e];e.round=2;e.intent=g.enemyIntent(e);g.endTurn();return g.s.b.enemies.find(e=>e.summoned);};
 const old=fight(false),now=fight(true);assert.ok(old&&now);assert.equal(old.challengeRevision,undefined);assert.equal(now.challengeRevision,1);assert.ok(now.maxHp>old.maxHp);assert.ok(now.damageScale>old.damageScale);assert.ok(now.guardScale>old.guardScale);
});
test('challenge victory records serialize, validate and rank separately from original rules',()=>{
 const g=fresh();g.s.step=44;g.s.history=Array.from({length:44},(_,step)=>({step,kind:step%15===14?'boss':'battle',place:'行路',nodeId:'node-'+step}));g.s.scene={place:'绝顶',nodeId:'final'};const r=createClearRecord(g.s);assert.equal(r.challengeRevision,1);assert.ok(validClearRecord(r));assert.deepEqual(parseRecords(serializeRecords([r])),[r]);const old={...r};delete old.challengeRevision;assert.ok(validClearRecord(old));assert.notEqual(recordGroup(old),recordGroup(r));assert.equal(validClearRecord({...r,challengeRevision:2}),false);
});
test('unknown challenge revisions are rejected rather than silently changing difficulty',()=>{
 const g=fresh();assert.ok(validChallenge(g.s));assert.ok(validChallenge({}));const bad={...g.s,challengeRevision:2};assert.equal(validChallenge(bad),false);assert.throws(()=>new Game(bad),/天赋挑战规则无效/);const c=new Game();c.start(42);c.s.character.challengeRevision=2;assert.equal(validCharacterDraft(c.s.character),false);
});
test('player stacking, repeat, energy and damage remain uncapped under the harder rules',()=>{
 const g=fresh('long','steady',5);g.s.step=44;g.combat('boss');const b=g.s.b;b.enemies=[b.enemies[0]];b.block=100000;b.hand=[g.make('W27',true)];b.qi=100000;assert.ok(g.play(b.hand[0].uid,0).ok);assert.equal(g.s.phase,'reward');assert.equal(b.block,100003);assert.equal(b.qi,100000);
});
