import fs from 'node:fs';
import {Game} from '../engine.js';
import {validJourney} from '../journey.js';
const root=new URL('../qa/v0191/',import.meta.url);fs.mkdirSync(root,{recursive:true});
for(let count=0;count<=10;count++){
 const g=new Game();g.start(42,{opening:false});g.enterNode(g.availableNodes[0].id);
 const cards=['W01','W03','U01','U07','W14'];g.s.b.hand=Array.from({length:count},(_,i)=>g.make(cards[i%cards.length]));g.s.b.draw=[];g.s.b.discard=[];g.s.b.exhaust=[];g.s.b.qi=10;g.s.b.enemies.forEach(e=>{e.hp=200;e.maxHp=200;});delete g.s.runInfo;
 if(!validJourney(g.s))throw Error('Invalid fixture');fs.writeFileSync(new URL(count+'.json',root),JSON.stringify(g.s));
}
fs.writeFileSync(new URL('index.html',root),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>手牌收拢隔离验收</title><style>body{font:16px system-ui;padding:20px;max-width:700px;margin:auto}button{padding:12px;margin:5px}textarea{width:100%;height:220px}</style><h1>手牌收拢隔离验收</h1><p>8877端口专用测试存档。</p>${Array.from({length:11},(_,n)=>`<button data-count="${n}">${n}张</button>`).join('')}<hr><button id="read">显示测试存档</button><button id="clear">清除测试进度</button><textarea aria-label="测试存档" readonly></textarea><script>document.querySelectorAll('[data-count]').forEach(b=>b.onclick=async()=>{localStorage.setItem('yiju-jianghu-v1',await(await fetch(b.dataset.count+'.json',{cache:'no-store'})).text());location.href='../../docs/';});document.querySelector('#read').onclick=()=>document.querySelector('textarea').value=localStorage.getItem('yiju-jianghu-v1')||'';document.querySelector('#clear').onclick=()=>{localStorage.removeItem('yiju-jianghu-v1');location.href='../../docs/';};</script></html>`);
console.log('11 hand fixtures ready');
