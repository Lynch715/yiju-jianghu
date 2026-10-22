import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,clone,validOpening} from '../engine.js';
import {CARD,CARDS,RELICS} from '../data.js';
import {HEROES,HERO_TALENT_REVISION,playerTalent,validHeroTalentRules,validPlayer,validCharacterDraft} from '../players.js';
import {validJourney} from '../journey.js';
import {validChallenge} from '../difficulty.js';
import {validExpedition} from '../expedition.js';
import {describeCombatCard,describeCombatCardHTML} from '../card-preview.js';
import {createClearRecord,validClearRecord,recordGroup,serializeRecords,parseRecords} from '../records.js';

function fresh(id='linghu'){
 const g=new Game();g.start(123,{opening:false,character:true});g.chooseHero(id);assert.ok(g.finishCharacter());return g;
}
function duel(id){
 const g=fresh(id);g.combat('battle');const b=g.s.b;g.s.hp=60;g.s.relics=[];
 b.enemies=[b.enemies[0]];Object.assign(b.enemies[0],{hp:10000,maxHp:10000,block:0,str:0,weak:0,vuln:0});delete b.enemies[0].tactics;
 b.hand=[];b.draw=Array.from({length:40},()=>g.make('W01'));b.discard=[];b.qi=100;return g;
}
function cast(g,id,{repeat=0,up=false,selections=[]}={}){const c=g.make(id,up);g.s.b.hand.push(c);g.s.b.repeat=repeat;assert.ok(g.play(c.uid,0,selections).ok);return c;}
function turn(g){g.s.b.hand=[];g.s.b.draw=Array.from({length:40},()=>g.make('W01'));g.beginTurn();g.s.b.hand=[];g.s.b.qi=100;}
function loss(g,{hp=42,damage=3,hits=1,poison=0,curse=false}={}){
 const b=g.s.b;g.s.hp=hp;b.block=0;b.hand=curse?[g.make('CURSE')]:[];b.poison=poison;
 b.enemies[0].intent={label:'试招',damage,hits};return g.endTurn();
}

test('all eight named heroes mark new battles; four common talents and no-talent identities stay unmarked',()=>{
 for(const h of HEROES){const g=fresh(h.id);assert.equal(g.s.b,null);g.combat('battle');assert.equal(g.s.b.heroTalentRevision,HERO_TALENT_REVISION);assert.deepEqual(new Game(g.s).s,g.s);}
 for(const talent of ['steady','vigor','insight','breath',null]){const g=new Game();g.start(123,{opening:false,character:talent!==null});if(talent){g.chooseHero('custom');g.chooseTalent(talent);g.setCharacterName('自创');g.choosePlayerPortrait('male-qing');g.finishCharacter();}g.combat('battle');assert.equal(g.s.b.heroTalentRevision,undefined);}
});
test('Linghu draws two after the first skill only, persists across reload and resets next turn',()=>{
 const g=duel('linghu');cast(g,'U01');assert.equal(g.s.b.hand.length,2);const h=new Game(g.s);cast(h,'U01');assert.equal(h.s.b.hand.length,2);turn(h);cast(h,'U01');assert.equal(h.s.b.hand.length,2);
});
test('talent draws respect hand capacity and empty draw/discard piles',()=>{
 const g=duel('linghu'),b=g.s.b;b.hand=Array.from({length:9},()=>g.make('W01'));cast(g,'U01');assert.equal(b.hand.length,10);assert.equal(b.discard.length,2);
 turn(g);b.draw=[];b.discard=[];cast(g,'U01');assert.equal(b.hand.length,1);assert.equal(b.discard.length,0);
});
test('Qiao gains a card and one energy every third manual attack; relics stack without counting repeats',()=>{
 const g=duel('qiao'),b=g.s.b;g.s.relics=['R16'];for(let i=1;i<=6;i++){const before=b.qi;cast(g,'W01');assert.equal(b.qi,before-1+(i%3===0?2:0));assert.equal(b.hand.length,Math.floor(i/3)*2);}
 turn(g);cast(g,'W08',{repeat:3});assert.equal(b.turnFlags.attacks,1);assert.equal(b.qi,98);assert.equal(b.hand.length,0);
});
test('Guo Jing gains three at each turn start and six on the first direct block, stacking with relics and powers',()=>{
 const g=duel('guojing'),b=g.s.b;assert.equal(b.block,3);g.s.relics=['R06'];g.addPower({id:'W29',up:false});g.addPower({id:'W28',up:false});g.block(2);
 cast(g,'U01');assert.equal(b.block,5+5+2+3+6+4);const h=new Game(g.s);cast(h,'U01');assert.equal(h.s.b.block,b.block+5+2+4);
 turn(h);assert.equal(h.s.b.block,3);h.addPower({id:'W22',up:false});h.s.b.block=20;h.beginTurn();assert.equal(h.s.b.block,23);
});
test('Guo Jing cannot multiply the six-block bonus through repeated resolutions',()=>{
 const g=duel('guojing');cast(g,'W02',{repeat:3});assert.equal(g.s.b.block,3+4*4+6);assert.equal(g.s.b.turnFlags.plays,1);
});
test('Yang Guo gains three on the first light attack and eight on the later first heavy attack',()=>{
 const g=duel('yangguo'),e=g.s.b.enemies[0];let hp=e.hp;cast(g,'W01');assert.equal(hp-e.hp,9);hp=e.hp;cast(g,'W08');assert.equal(hp-e.hp,20);
 const h=new Game(g.s),next=h.s.b.enemies[0];hp=next.hp;cast(h,'W08');assert.equal(hp-next.hp,12);
});
test('Yang Guo stacks both bonuses on one first heavy hit, only once across targets and repeats',()=>{
 const g=duel('yangguo'),b=g.s.b,e=b.enemies[0];let hp=e.hp;cast(g,'W08',{repeat:2});assert.equal(hp-e.hp,36+11);
 turn(g);b.enemies.push({...clone(e),key:7});const before=b.enemies.map(x=>x.hp);cast(g,'W10',{repeat:1});assert.deepEqual(b.enemies.map((x,i)=>before[i]-x.hp),[31,20]);
});
test('heavy talent uses actual paid energy, leaves failed casts unchanged, and supports one- and two-energy X attacks',()=>{
 const g=duel('yangguo'),b=g.s.b,c=g.make('W08');b.hand.push(c);b.qi=1;const before=clone(g.s);assert.equal(g.play(c.uid,0).ok,false);assert.deepEqual(g.s,before);
 b.hand=[];let hp=b.enemies[0].hp;cast(g,'W59');assert.equal(hp-b.enemies[0].hp,7);assert.equal(b.turnFlags.talentIron,undefined);
 turn(g);b.qi=2;hp=b.enemies[0].hp;cast(g,'W59');assert.equal(hp-b.enemies[0].hp,19);assert.equal(b.turnFlags.talentIron,true);
});
test('Huang Rong draws two on card three and gains one energy on card six, once per turn across reload',()=>{
 let g=duel('huangrong');for(let i=1;i<=12;i++){const qi=g.s.b.qi;cast(g,'W01');assert.equal(g.s.b.qi,qi-1+(i===6?1:0));assert.equal(g.s.b.hand.length,i>=3?2:0);if(i===3||i===6)g=new Game(g.s);}
 turn(g);for(let i=0;i<3;i++)cast(g,'W01');assert.equal(g.s.b.hand.length,2);
});
test('Xiaolongnu adds six to one hit and three block once, across targets, repeats and reload',()=>{
 const g=duel('long'),b=g.s.b,e=b.enemies[0];let hp=e.hp;cast(g,'W08',{repeat:2});assert.equal(hp-e.hp,42);assert.equal(b.block,3);
 const h=new Game(g.s);hp=h.s.b.enemies[0].hp;cast(h,'W01');assert.equal(hp-h.s.b.enemies[0].hp,6);assert.equal(h.s.b.block,3);
 turn(h);h.s.b.enemies.push({...clone(e),key:7});const before=h.s.b.enemies.map(x=>x.hp);cast(h,'W10');assert.deepEqual(h.s.b.enemies.map((x,i)=>before[i]-x.hp),[16,10]);assert.equal(h.s.b.block,3);
});
test('A Qing gains four first-hit damage, one draw and one energy on the first immediate skill-to-attack transition',()=>{
 const g=duel('aqing'),b=g.s.b;cast(g,'U01');let hp=b.enemies[0].hp,qi=b.qi;cast(g,'W08',{repeat:2});assert.equal(hp-b.enemies[0].hp,40);assert.equal(b.hand.length,1);assert.equal(b.qi,qi-2+1);
 const h=new Game(g.s);cast(h,'U01');hp=h.s.b.enemies[0].hp;qi=h.s.b.qi;cast(h,'W01');assert.equal(hp-h.s.b.enemies[0].hp,6);assert.equal(h.s.b.qi,qi-1);assert.equal(h.s.b.hand.length,1);
 turn(h);cast(h,'U01');cast(h,'W28');hp=h.s.b.enemies[0].hp;cast(h,'W01');assert.equal(hp-h.s.b.enemies[0].hp,6);assert.equal(h.s.b.turnFlags.talentYue,undefined);
});
test('Guo Xiang heals five after victory, capped at max HP and never replayed on reload',()=>{
 const g=duel('guoxiang');g.s.b.enemies[0].hp=1;cast(g,'W01');assert.equal(g.s.hp,65);assert.equal(g.s.phase,'reward');assert.deepEqual(new Game(g.s).s,g.s);
 const h=duel('guoxiang');h.s.hp=79;h.s.b.enemies[0].hp=1;cast(h,'W01');assert.equal(h.s.hp,80);
});
for(const kind of ['attack','self','curse','poison'])test(`Guo Xiang emergency heal triggers once on ${kind} loss and persists across reload`,()=>{
 let g=duel('guoxiang');if(kind==='self'){g.s.hp=42;cast(g,'W43');}else loss(g,kind==='curse'?{hp:42,damage:0,curse:true}:kind==='poison'?{hp:42,damage:0,poison:3}:{hp:42,damage:3});
 assert.equal(g.s.hp,kind==='self'||kind==='curse'?46:45);assert.equal(g.s.b.battleFlags.talentKindness,true);const before=clone(g.s);g=new Game(g.s);assert.deepEqual(g.s,before);g.s.hp=40;g.bee();assert.equal(g.s.hp,40);
});
test('Guo Xiang can trigger between enemy hits, never revives lethal damage, and uses the exact half-HP boundary',()=>{
 const g=duel('guoxiang');loss(g,{hp:42,damage:3,hits:2});assert.equal(g.s.hp,42);
 const lethal=duel('guoxiang');loss(lethal,{hp:2,damage:3});assert.equal(lethal.s.phase,'lost');assert.equal(lethal.s.hp,0);assert.equal(lethal.s.b.battleFlags.talentKindness,undefined);
 const odd=duel('guoxiang');odd.s.maxHp=81;odd.s.hp=41;odd.bee();assert.equal(odd.s.hp,41);odd.s.hp=40;odd.bee();assert.equal(odd.s.hp,46);
});
test('Guo Xiang and jade-bee relic both trigger from the same low-HP event; entering a new battle low also heals once',()=>{
 const g=duel('guoxiang');g.s.relics=['R22'];loss(g,{hp:42,damage:3});assert.equal(g.s.hp,51);assert.equal(g.s.b.battleFlags.bee,true);assert.equal(g.s.b.battleFlags.talentKindness,true);
 const h=fresh('guoxiang');h.s.hp=30;h.combat('battle');assert.equal(h.s.hp,36);assert.deepEqual(new Game(h.s).s,h.s);h.s.phase='map';h.combat('battle');assert.equal(h.s.hp,42);
});
test('all enhanced damage and block previews agree with actual outcomes without consuming state or triggers',()=>{
 for(const [hero,id,damage,block] of [['long','W01',12,3],['guojing','U01',0,11],['yangguo','W08',23,0],['aqing','W08',16,0]]){
  const g=duel(hero),b=g.s.b;if(hero==='aqing')cast(g,'U01');const c=g.make(id);b.hand.push(c);const before=clone(g.s),text=describeCombatCard(g,c,0),html=describeCombatCardHTML(g,c,0);assert.deepEqual(g.s,before);assert.ok(html.includes('card-value'));
  const hp=b.enemies[0].hp,guard=b.block;g.play(c.uid,0);assert.equal(hp-b.enemies[0].hp,damage);assert.equal(b.block-guard,block);assert.match(text,hero==='guojing'?/11格挡/:hero==='long'?/12伤害/:hero==='yangguo'?/17＋6/:/10＋6/);
 }
});
test('damage boosts respect weakness/vulnerability and stack with heavy relics without multiplying the talent per hit',()=>{
 const g=duel('yangguo'),b=g.s.b;g.s.relics=['R13'];b.str=2;b.weak=1;b.enemies[0].vuln=1;const hp=b.enemies[0].hp;cast(g,'W08',{repeat:1});assert.equal(hp-b.enemies[0].hp,Math.floor((6+2+11+8)*.75*1.5)+Math.floor(8*.75*1.5)*3);
});
for(const h of HEROES)test(`${h.name}: old battle and appearance edits stay unmarked until a new encounter`,()=>{
 const g=duel(h.id);delete g.s.b.heroTalentRevision;const saved=clone(g.s);let restored=new Game(saved);assert.deepEqual(restored.s,saved);
 restored.editCharacter();const edit=clone(restored.s);restored=new Game(edit);assert.deepEqual(restored.s,edit);restored.setCharacterName('换名侠客');restored.choosePlayerPortrait('female-bai');assert.ok(restored.finishCharacter());assert.deepEqual(restored.s.b,saved.b);assert.equal(restored.s.player.hero,h.id);
 restored.beginTurn();assert.equal(restored.s.b.heroTalentRevision,undefined);restored.s.phase='map';const old=clone(restored.s);restored=new Game(old);assert.deepEqual(restored.s,old);restored.combat('battle');assert.equal(restored.s.b.heroTalentRevision,HERO_TALENT_REVISION);assert.equal(restored.s.player.talent,h.talent);
});
test('new and legacy descriptions follow the battle or record revision; unknown markers are rejected on load/import',()=>{
 for(const h of HEROES){assert.notEqual(playerTalent(h).text,playerTalent(h,{revision:0}).text);assert.equal(playerTalent(h,{revision:0}).text,playerTalent(h).legacyText);}
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('function validSave(s){'),source.indexOf('\ntry{const s=JSON.parse(localStorage.getItem(SAVE))'));
 const validate=new Function('validHeroTalentRules','SAVE_VERSION','CARD','RELIC','validJourney','validExpedition','validChallenge','validPlayer','validCharacterDraft','validOpening','CARDS',body+';return validSave;')(validHeroTalentRules,8,CARD,Object.fromEntries(RELICS.map(r=>[r.id,r])),validJourney,validExpedition,validChallenge,validPlayer,validCharacterDraft,validOpening,CARDS);
 const old=JSON.parse(readFileSync(new URL('./fixtures/v0.20.0/browser-battle.json',import.meta.url)));assert.ok(validate(old));assert.ok(validate({...old,b:{...old.b,heroTalentRevision:1}}));
 for(const revision of [0,2,-1,'1',null,{},true]){const state={...old,b:{...old.b,heroTalentRevision:revision}};assert.equal(validate(state),false);assert.equal(validHeroTalentRules(state),false);assert.throws(()=>new Game(state),/名侠天赋规则无效/);}
});
test('completion records retain the actual final-battle talent rules through serialization and ranking groups',()=>{
 const g=duel('linghu');g.s.step=44;g.s.history=Array.from({length:44},(_,step)=>({step,kind:step%15===14?'boss':'battle',place:'行路',nodeId:'node-'+step}));const r=createClearRecord(g.s);assert.equal(r.heroTalentRevision,1);assert.ok(validClearRecord(r));assert.deepEqual(parseRecords(serializeRecords([r])),[r]);
 const old=clone(r);delete old.heroTalentRevision;assert.ok(validClearRecord(old));assert.notEqual(recordGroup(r),recordGroup(old));assert.equal(validClearRecord({...r,heroTalentRevision:2}),false);
});
const oldBattles=JSON.parse(readFileSync(new URL('./fixtures/v0.25.9/hero-battles.json',import.meta.url))).fixtures;
for(const fixture of oldBattles)test(`${fixture.hero}: v0.25.9 full-state hashes match after all 12 actions, turns and repeated reloads`,()=>{
 let g=new Game(fixture.state);assert.deepEqual(g.s,fixture.state);
 for(const {action,sha256} of fixture.steps){
  if(action.endTurn)g.endTurn();else{g.s.b.qi=100;const c=g.make(action.card);g.s.b.hand.push(c);g.s.b.repeat=action.repeat||0;assert.ok(g.play(c.uid,0).ok);}
  assert.equal(createHash('sha256').update(JSON.stringify(g.s)).digest('hex'),sha256,JSON.stringify(action));const saved=clone(g.s);g=new Game(saved);assert.deepEqual(g.s,saved);
 }
});
for(const hero of HEROES)test(`${hero.name}: every ordinary/refined combat-card preview leaves all live state unchanged`,()=>{
 for(const card of CARDS)for(const up of [false,true]){
  const g=duel(hero.id),b=g.s.b;b.turnFlags.last='s';b.turnFlags.plays=2;b.turnFlags.attacks=0;const c=g.make(card.id,up);b.hand=[c,g.make('W01'),g.make('QI'),g.make('U01')];
  const before=JSON.stringify(g.s);assert.equal(typeof describeCombatCard(g,c,0),'string');assert.equal(typeof describeCombatCardHTML(g,c,0),'string');assert.equal(JSON.stringify(g.s),before,`${hero.id}/${card.id}/${up}`);
 }
});
