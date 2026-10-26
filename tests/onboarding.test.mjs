import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../engine.js';
import {enemyActionView} from '../enemy-action.js';
const run=(level,seed)=>{const g=new Game();g.start(seed,{opening:false,trialLevel:level});return g;};
const plain=id=>id==='qingcheng'||id==='songshan';
test('tier-one runs open with a lone basic foe, then at most two basic foes',()=>{for(let seed=0;seed<300;seed++){const g=run(1,seed);assert.equal(g.s.expedition.onboarding,1);g.s.step=0;g.combat('battle');assert.equal(g.s.b.enemies.length,1);assert.ok(plain(g.s.b.enemies[0].id));g.s.step=1;g.combat('battle');assert.ok(g.s.b.enemies.length<=2);assert.ok(g.s.b.enemies.every(e=>plain(e.id)));}});
test('higher tiers and runs without the onboarding flag keep the original pools',()=>{for(let level=2;level<=5;level++)assert.equal(run(level,7).s.expedition.onboarding,undefined);let guard=false;for(let seed=0;seed<300&&!guard;seed++){const g=run(1,seed);delete g.s.expedition.onboarding;g.s.step=0;g.combat('battle');guard=g.s.b.enemies.some(e=>!plain(e.id));}assert.ok(guard);});
test('enemy action labels use plain wording',()=>{const g=run(1,3);g.s.step=0;g.combat('battle');const e=g.s.b.enemies[0];e.intent={damage:5,poison:1,poisonOnHit:true,woundOnHit:1};const t=enemyActionView(g,e).tags.map(x=>x.text);assert.ok(t.includes('破防施毒 1'));assert.ok(t.includes('破防添气滞 1'));assert.ok(!t.some(x=>/伤血|截断/.test(x)));});
