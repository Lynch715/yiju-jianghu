import {Game} from '../engine.js';
export function fixture(ids=[],relics=[]){
 const g=new Game();g.start(123,{opening:false});g.s.relics=relics;g.enter('battle');const b=g.s.b;
 // Numeric card/relic unit tests use one isolated target, independent of encounter rolls.
 b.enemies=b.enemies.slice(0,1);delete b.enemies[0].tactics;delete b.enemies[0].skirmishRevision;
 g.s.hp=40;b.qi=30;b.str=0;b.block=0;b.draw=Array.from({length:30},()=>g.make('W01'));b.discard=[];b.hand=ids.map(id=>g.make(id));b.enemies[0].hp=b.enemies[0].maxHp=2000;b.enemies[0].intent={damage:10,label:'测试攻击'};return g;
}
export function play(g,id,selections=[],up=false){const c=g.s.b.hand.find(x=>x.id===id);if(!c)throw Error('missing '+id);c.up=up;const r=g.play(c.uid,0,selections);if(!r.ok)throw Error(id+': '+r.error);return c;}
