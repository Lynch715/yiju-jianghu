import test from 'node:test';
import assert from 'node:assert/strict';
import {combatSnapshot,combatFeedback} from '../combat-ui.js';
import {Game} from '../engine.js';
const battle=()=>{const g=new Game();g.start(42,{opening:false});g.enter('battle');return g;};
test('attack feedback follows actual resolved damage and keeps the captured state immutable',()=>{
 const g=battle(),enemy=g.s.b.enemies[0];
 const card=g.make('W01');g.s.b.hand=[card];g.s.b.qi=3;
 const before=combatSnapshot(g.s),oldHp=enemy.hp;
 const result=g.play(card.uid,enemy.key,[]);assert.equal(result.ok,true);
 const feedback=combatFeedback(before,combatSnapshot(g.s));
 assert.deepEqual(feedback,[{target:enemy.key,kind:'damage',text:`−${oldHp-enemy.hp}`}]);
 assert.equal(before.enemies[0].hp,oldHp);
});
test('guard feedback follows real block gained and deals no fictitious damage',()=>{
 const g=battle(),card=g.make('U01');g.s.b.hand=[card];g.s.b.qi=3;
 const before=combatSnapshot(g.s);g.play(card.uid,g.s.b.enemies[0].key,[]);
 assert.deepEqual(combatFeedback(before,combatSnapshot(g.s)),[{target:'player',kind:'block',text:'格挡 +5'}]);
});
test('feedback distinguishes shield absorption, healing and multiple targets',()=>{
 const before={hp:20,block:9,enemies:[{key:0,hp:30,block:4},{key:1,hp:20,block:0}]};
 const after={hp:24,block:9,enemies:[{key:0,hp:30,block:0},{key:1,hp:13,block:0}]};
 assert.deepEqual(combatFeedback(before,after),[{target:'player',kind:'heal',text:'+4'},{target:0,kind:'blocked',text:'格挡'},{target:1,kind:'damage',text:'−7'}]);
 assert.deepEqual(combatFeedback(null,after),[]);
});
test('clearing unused player block at the turn boundary is not shown as a blocked hit',()=>{
 const before={hp:20,block:9,enemies:[{key:0,hp:30,block:0,alive:true,attacks:false}]};
 const after={hp:20,block:0,enemies:[{key:0,hp:30,block:0}]};
 assert.deepEqual(combatFeedback(before,after,{enemyTurn:true}),[]);
});
