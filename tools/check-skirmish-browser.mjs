import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Game} from '../engine.js';
const cases={qingcheng:{cards:['W01']},songshan:{cards:['W14'],end:true},xingxiu:{cards:['W14','W03','U01'],end:true},baituo:{cards:['W14','W01','U01'],end:true},qingchengguard:{cards:['W14'],end:true},shenlong:{cards:['U07'],end:true},xuedao:{cards:['W05','W05'],end:true}};
const root=new URL('../qa/',import.meta.url),checks=[];
for(const [id,spec] of Object.entries(cases)){
 const fixture=JSON.parse(fs.readFileSync(new URL(`v0180/${id}.json`,root))),actual=JSON.parse(fs.readFileSync(new URL(`v0180-${id}-browser-actual.json`,root))),g=new Game(fixture);
 for(const id of spec.cards){const c=g.s.b.hand.find(c=>c.id===id);assert.ok(c);assert.ok(g.play(c.uid,0).ok);}if(spec.end)g.endTurn();
 // Only foreground time is non-deterministic; every game field must agree.
 delete actual.runInfo.activeMs;delete g.s.runInfo.activeMs;assert.deepEqual(actual,g.s,`Browser state drift: ${id}`);checks.push({id,hp:actual.hp,turn:actual.b.turn,match:true});
}
const standaloneBefore=JSON.parse(fs.readFileSync(new URL('v0180-songshan-browser-actual.json',root))),standaloneActual=JSON.parse(fs.readFileSync(new URL('v0180-standalone-browser-actual.json',root))),standalone=new Game(standaloneBefore);assert.ok(standalone.play(standalone.s.b.hand.find(c=>c.id==='W01').uid,0).ok);delete standalone.s.runInfo.activeMs;delete standaloneActual.runInfo.activeMs;assert.deepEqual(standaloneActual,standalone.s,'Standalone browser drift');checks.push({id:'standalone',hp:standaloneActual.hp,turn:standaloneActual.b.turn,match:true});
const layouts=JSON.parse(fs.readFileSync(new URL('v0180-browser-layouts.json',root)));assert.equal(layouts.length,40);assert.ok(layouts.every(x=>!x.overflow&&x.enemies.every(e=>e.within&&e.intentBottom<=e.healthTop)));
fs.writeFileSync(new URL('v0180-browser-checks.json',root),JSON.stringify({checks,layouts:layouts.length,note:'IAB 390x844 and 320x640; real UI actions equal direct engine outcomes except foreground time. Isolated localhost port 8875. Physical device acceptance not performed.'},null,2)+'\n');console.log(JSON.stringify({realActionComparisons:checks.length,layoutCases:layouts.length,allMatched:true}));
