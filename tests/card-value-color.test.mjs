import test from 'node:test';import assert from 'node:assert/strict';
import {describeCombatCard,describeCombatCardHTML} from '../card-preview.js';import {CARDS} from '../data.js';import {fixture} from './fixtures.mjs';
const html=(g,id=g.s.b.hand[0].id,target=0,opts)=>describeCombatCardHTML(g,g.s.b.hand.find(c=>c.id===id),target,opts);
test('unchanged base values remain unmarked, stronger and weaker values are individually marked',()=>{
 const g=fixture(['W01']);assert.equal(html(g),'造成6伤害。');g.s.b.str=2;assert.match(html(g),/class="card-value higher" title="高于基础值 6">8<\/span>/);g.s.b.str=0;g.s.b.weak=1;assert.match(html(g),/class="card-value lower" title="低于基础值 6">4<\/span>/);
});
test('refinement compares against refined base rather than normal base and equal modifiers cancel cleanly',()=>{
 const g=fixture(['W01']);g.s.b.hand[0].up=true;assert.equal(html(g),'造成9伤害。');g.s.b.str=3;g.s.b.weak=1;assert.equal(html(g),'造成9伤害。');g.s.b.str=5;assert.match(html(g),/基础值 9">10<\/span>/);
});
test('target vulnerability colors group and multihit damage separately without coloring hit counts',()=>{
 const g=fixture(['W10','W08']),e=g.s.b.enemies[0];g.s.b.enemies.push({...structuredClone(e),key:9,vuln:1});assert.match(html(g,'W10'),/1号 10；2号 <span class="card-value higher"[^>]*>15<\/span>/);assert.equal(html(g,'W08'),'造成6×2伤害。');g.s.b.enemies[0].vuln=1;assert.match(html(g,'W08'),/基础值 6">9<\/span>×2/);
});
test('direct and linked guard use their own bases, with no arithmetic change',()=>{
 const g=fixture(['U01']);g.addPower({id:'W29',up:false});g.addPower({id:'W28',up:false});assert.match(html(g),/基础值 5">7<\/span>格挡。联动另得<span[^>]*基础值 0">4<\/span>格挡/);assert.equal(describeCombatCard(g,g.s.b.hand[0],0),'获得7格挡。联动另得4格挡。');
});
test('variable guard uses current block or actual selected/exhausted cards as its base',()=>{
 const g=fixture(['W26','W35','W39','U01','W01']);g.s.b.block=20;assert.equal(html(g,'W26'),'额外获得10格挡，已计入当前格挡的50%与加成。');const uid=g.s.b.hand.find(c=>c.id==='U01').uid;assert.equal(html(g,'W35',0,{selections:[uid],selectionKnown:true}),'消耗所选手牌，本次获得6格挡。');assert.equal(html(g,'W39'),'消耗其他所有非攻击手牌，本次获得12格挡。本牌消耗。');g.addPower({id:'W29',up:false});assert.match(html(g,'W35',0,{selections:[uid],selectionKnown:true}),/基础值 6">8<\/span>/);
});
test('conditional bonuses and strength independent taiji compare to their appropriate base',()=>{
 const g=fixture(['W15','W27']);g.s.hp=20;assert.match(html(g,'W15'),/基础值 16">24<\/span>/);g.s.b.block=40;g.s.b.str=999;assert.equal(html(g,'W27'),'造成40伤害。无上限；不消耗格挡，不受劲力加成。');g.s.b.weak=1;assert.match(html(g,'W27'),/class="card-value lower" title="低于基础值 40">30<\/span>/);
});
test('colored descriptions preserve text and all real state for every card/refinement',()=>{
 for(const d of CARDS)for(const up of [false,true]){const g=fixture([d.id,'W01','U01']);g.s.b.hand[0].up=up;g.s.b.str=4;g.s.b.weak=1;g.s.b.enemies[0].vuln=1;const before=JSON.stringify(g.s);const plain=describeCombatCard(g,g.s.b.hand[0],0);assert.equal(html(g).replace(/<[^>]*>/g,''),plain,d.id);assert.equal(JSON.stringify(g.s),before,d.id);assert.doesNotMatch(html(g),/[\uE000\uE001]/);}
});
