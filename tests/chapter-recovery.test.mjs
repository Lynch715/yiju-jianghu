import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,clone} from '../engine.js';
import {journeyChapter,validJourney} from '../journey.js';

function bossReward(chapter,{classic=false,hp=7,maxHp=87}={}){
 const g=new Game();g.start(42,{opening:false,classic});const target=(chapter+1)*g.chapterLength-1;
 let previous=null;
 for(let step=0;step<target;step++){
  if(!classic){const floor=step%15,map=journeyChapter(g.s.seed,Math.floor(step/15)),node=map.rows[floor].find(n=>floor===0||map.edges.some(([a,b])=>a===previous&&b===n.id));previous=node.id;g.s.journey.path.push(node.id);g.s.history.push({step,kind:node.kind,hp,deck:g.s.deck.length,nodeId:node.id,place:node.name});}
  else g.s.history.push({step,kind:step%6===5?'boss':'battle',hp,deck:g.s.deck.length});
 }
 g.s.step=target;if(classic)assert.ok(g.enter('boss'));else assert.ok(g.enterNode(g.availableNodes[0].id));
 g.s.maxHp=maxHp;g.s.hp=hp;g.s.relics=[];for(const enemy of g.s.b.enemies)enemy.hp=0;g.checkEnd();assert.equal(g.s.phase,'reward');return g;
}
function claim(g){assert.ok(g.chooseRewardCard());assert.ok(g.chooseRewardRelic());}

for(const classic of [false,true])for(const chapter of [0,1,2])test(`${classic?'legacy 18-step':'45-step'} chapter ${chapter+1}: reward completion fully heals and advances once`,()=>{
 const g=bossReward(chapter,{classic});const before=clone(g.s);assert.equal(g.leaveReward(),false);assert.deepEqual(g.s,before);
 g.chooseRewardCard();const partial=clone(g.s);assert.equal(g.leaveReward(),false);assert.deepEqual(g.s,partial);g.chooseRewardRelic();const snapshot=g.s.clearRecord?clone(g.s.clearRecord):null;
 assert.ok(g.leaveReward());assert.equal(g.s.hp,g.s.maxHp);assert.equal(g.s.hp,87);assert.equal(g.s.history.at(-1).hp,87);assert.equal(g.s.step,(chapter+1)*g.chapterLength);assert.equal(g.s.phase,chapter===2?'win':'map');if(!classic)assert.ok(validJourney(g.s));
 if(snapshot){assert.equal(snapshot.hp,7);assert.deepEqual(g.s.clearRecord,snapshot);}
 const completed=clone(g.s);assert.equal(g.leaveReward(),false);assert.deepEqual(g.s,completed);assert.deepEqual(new Game(g.s).s,completed);
});
test('old pending boss rewards survive load and appearance edits unchanged, then heal to the current cap',()=>{
 let g=bossReward(0);g.s.version=7;const saved=clone(g.s);g=new Game(saved);for(const key of ['hp','maxHp','b','reward','rng','deck','history','journey'])assert.deepEqual(g.s[key],saved[key]);
 g.editCharacter();g.setCharacterName('旧档侠客');assert.ok(g.finishCharacter());assert.equal(g.s.hp,7);claim(g);g=new Game(g.s);assert.equal(g.s.hp,7);assert.ok(g.leaveReward());assert.equal(g.s.hp,87);
});
test('a boss reward with only one choice made resumes and heals once after the remaining choice',()=>{
 let g=bossReward(1);g.chooseRewardRelic();const saved=clone(g.s);g=new Game(saved);assert.deepEqual(g.s,saved);assert.equal(g.leaveReward(),false);g.chooseRewardCard();assert.ok(g.leaveReward());assert.equal(g.s.hp,87);const reloaded=new Game(g.s);assert.equal(reloaded.s.hp,87);assert.equal(reloaded.leaveReward(),false);
});
for(const hp of [1,79,80])test(`full recovery respects an 80-HP cap when starting at ${hp}, including the no-op case`,()=>{
 const g=bossReward(0,{hp,maxHp:80});g.s.relics=['R27'];claim(g);assert.ok(g.leaveReward());assert.equal(g.s.hp,80);assert.equal(g.s.maxHp,80);
});
test('ordinary and elite rewards keep existing recovery; old map saves do not receive retroactive healing',()=>{
 for(const kind of ['battle','elite']){const g=new Game();g.start(42,{opening:false,classic:true});g.s.step=kind==='elite'?2:0;assert.ok(g.enter(kind));g.s.hp=7;g.s.relics=[];for(const e of g.s.b.enemies)e.hp=0;g.checkEnd();g.chooseRewardCard();if(!g.s.reward.relicDone)g.chooseRewardRelic();assert.ok(g.leaveReward());assert.equal(g.s.hp,7);}
 const old=bossReward(0);claim(old);old.leaveReward();old.s.hp=29;const saved=clone(old.s);assert.deepEqual(new Game(saved).s,saved);
});
test('boss reward UI explicitly promises full HP after the reward choices',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.ok(source.includes("r.boss?'领取奖励后回满气血':''"));
});
