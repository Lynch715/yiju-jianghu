import fs from 'node:fs';
import {Game} from '../engine.js';
import {ENEMY} from '../enemies.js';
import {journeyChapter,validJourney} from '../journey.js';
import {attachEnemyTactics} from '../enemy-tactics.js';
const root=new URL('../qa/v0180/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const ids=['qingcheng','songshan','xingxiu','xuedao','baituo','riyue','qingchengguard','shenlong','riyueguard'];
for(const id of [...ids,'trio']){
 const g=new Game();g.start(42,{opening:false,trialLevel:1});g.s.step=(id==='trio'?0:ENEMY[id].chapter)*15;g.combat('battle');g.s.journey.path=Array.from({length:g.s.step},(_,step)=>journeyChapter(g.s.seed,Math.floor(step/15)).rows[step%15][0].id);const node=journeyChapter(g.s.seed,g.chapter).rows[0][0];g.s.journey.active=node.id;g.s.scene={place:'普通敌人机制验收',nodeId:node.id,step:g.s.step};g.s.relics=['R01'];
 const names=id==='trio'?['qingcheng','songshan','qingchengguard']:id.endsWith('guard')?[id,id==='qingchengguard'?'qingcheng':'riyue']:[id];
 g.s.b.enemies=names.map((id,key)=>({id,key,name:ENEMY[id].name,kind:'bandit',ruleset:'jianghu-2',skirmishRevision:1,hp:60,maxHp:60,round:0,str:0,block:0,weak:0,vuln:0,pin:0,charge:0,damageScale:1,guardScale:1}));attachEnemyTactics(g);const e=g.s.b.enemies[0],t=e.tactics;
 if(id==='qingcheng'){t.sword=2;}
 if(id==='songshan'){e.round=2;e.block=7;t.braced=true;}
 if(id==='xingxiu'){e.round=2;t.venom=2;}
 if(id==='xuedao'){t.frenzy=2;e.round=1;}
 if(id==='baituo'){e.round=2;e.charge=5;t.coil=16;}
 if(id==='riyue'){e.round=1;t.opening=true;}
 if(id==='shenlong'){e.round=2;t.focus=2;}
 if(id==='trio'){e.tactics.sword=2;const x=g.s.b.enemies[1];x.round=2;x.block=7;x.tactics.braced=true;}
 g.s.b.hand=(id==='xuedao'?['W05','W05','W03','W01','U07']:['W14','W01','W03','U01','U07']).map(id=>g.make(id));g.s.b.qi=3;g.s.b.draw=[];g.s.b.discard=[];g.refreshEnemyPhases();if(!validJourney(g.s))throw Error('Invalid QA journey');fs.writeFileSync(new URL(id+'.json',root),JSON.stringify(g.s));
}
const options=[...ids,'trio'].map(id=>`<button data-fixture="${id}">${ENEMY[id]?.name||'三人混合阵容'}</button>`).join('');
fs.writeFileSync(new URL('index.html',root),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>v0.18.0 隔离验收</title><style>body{font:16px system-ui;max-width:700px;margin:30px auto;padding:16px}button{padding:14px;margin:6px}textarea{width:100%;height:250px}</style><h1>普通敌人机制验收</h1><p>仅用于8875本机端口的测试存档。选择场景后进入真实游戏界面。</p>${options}<hr><button id="read">显示当前测试存档</button><button id="clean">清理验收存档</button><textarea aria-label="当前测试存档" readonly></textarea><script>document.querySelectorAll('[data-fixture]').forEach(button=>button.onclick=async()=>{const state=await(await fetch(button.dataset.fixture+'.json',{cache:'no-store'})).text();localStorage.setItem('yiju-jianghu-v1',state);location.href='../../docs/';});document.querySelector('#clean').onclick=()=>{const raw=localStorage.getItem('yiju-jianghu-v1');if(raw&&JSON.parse(raw).scene?.place==='普通敌人机制验收')localStorage.removeItem('yiju-jianghu-v1');location.href='../../docs/';};document.querySelector('#read').onclick=()=>document.querySelector('textarea').value=localStorage.getItem('yiju-jianghu-v1')||'';</script></html>`);
console.log('10 fixtures generated in qa/v0180/');
