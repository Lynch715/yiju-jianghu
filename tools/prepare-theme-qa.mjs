// Generate the shared battle fixtures before preparing theme scenes.
import './prepare-skirmish-qa.mjs';
import fs from 'node:fs';
import {Game} from '../engine.js';
import {journeyChapter,validJourney} from '../journey.js';
const root=new URL('../qa/v0190/',import.meta.url);fs.mkdirSync(root,{recursive:true});
for(const phase of ['map','rest','shop','event','treasure','reward','character']){
 const g=new Game();g.start(42,{opening:false});
 if(phase==='character')g.editCharacter();
 else if(phase!=='map'){
  const map=journeyChapter(42,0),kind=phase==='reward'?'battle':phase;
  let routes=map.rows[0].map(n=>[n]);
  for(let floor=0;floor<15;floor++){
   const route=routes.find(r=>r.at(-1).kind===kind);
   if(route){g.s.step=floor;g.s.journey.path=route.slice(0,-1).map(n=>n.id);g.enterNode(route.at(-1).id);break;}
   routes=routes.flatMap(r=>map.rows[floor+1].filter(n=>map.edges.some(([a,b])=>a===r.at(-1).id&&b===n.id)).map(n=>[...r,n]));
  }
  if(phase==='reward'){g.s.b.enemies.forEach(e=>e.hp=0);g.winBattle();}
 }
 if(!validJourney(g.s))throw Error('Invalid '+phase);fs.writeFileSync(new URL(phase+'.json',root),JSON.stringify(g.s));
}
fs.copyFileSync(new URL('../qa/v0180/trio.json',import.meta.url),new URL('trio.json',root));
const phases=['map','rest','shop','event','treasure','reward','character','trio'];
fs.writeFileSync(new URL('index.html',root),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>配色隔离验收</title><style>body{font:16px system-ui;max-width:700px;margin:30px auto;padding:16px}button{padding:14px;margin:6px}textarea{width:100%;height:250px}</style><h1>配色隔离验收</h1><p>8876端口专用测试进度。可查看并比对保存内容。</p>${phases.map(p=>`<button data-fixture="${p}">${p}</button>`).join('')}<hr><button id="read">显示当前测试存档</button><button id="clear">清除测试进度</button><textarea aria-label="当前测试存档" readonly></textarea><output></output><script>document.querySelectorAll('[data-fixture]').forEach(b=>b.onclick=async()=>{const state=await(await fetch(b.dataset.fixture+'.json',{cache:'no-store'})).text();localStorage.setItem('yiju-jianghu-v1',state);location.href='../../docs/';});document.querySelector('#read').onclick=()=>{document.querySelector('textarea').value=localStorage.getItem('yiju-jianghu-v1')||'';document.querySelector('output').textContent='配色 '+localStorage.getItem('yiju-jianghu-theme-v1');};document.querySelector('#clear').onclick=()=>{localStorage.removeItem('yiju-jianghu-v1');location.href='../../docs/';};</script></html>`);
console.log('8 theme QA scenes ready');
