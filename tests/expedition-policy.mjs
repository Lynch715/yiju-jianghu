import {CARD} from '../data.js';
import {enemyActionView} from '../enemy-action.js';
// QA policy uses the current hand, public action tags and immediate card outcomes.
// No future enemy script, hidden tactic threshold, draw order or future reward is scored.
export function visibleTurn(g,{counterplay=true}={}){
 if(g.s.phase!=='battle')return;let b=g.s.b;
 for(const e of b.enemies)if(e.lastAction?.damage>0)e.observedPressure=Math.max(e.observedPressure||0,e.lastAction.damage);
 if(b.openDart)g.useDart([...b.enemies].filter(e=>e.hp>0).sort((a,z)=>a.hp-z.hp)[0].key);
 for(let step=0;step<60&&g.s.phase==='battle';step++){
  b=g.s.b;const living=b.enemies.filter(e=>e.hp>0),incoming=living.reduce((n,e)=>n+enemyActionView(g,e).tags.filter(t=>t.kind==='attack').reduce((sum,t)=>sum+(t.segments||[]).reduce((v,x)=>v+x.amount*x.count,0),0),0);
  const options=[],own=[...b.hand,...b.draw,...b.discard,...b.exhaust],consumes=own.filter(c=>['W18','W31','W32','W35','W39','W40','W41','W42','W45','W49','W54','W56','U03','U04','U05','U08','U10','U14','U15','U16','U17','QI'].includes(c.id)).length;
  for(const c of b.hand){if(g.reason(c))continue;const d=CARD[c.id],selected=g.autoChoices(c),targets=d.type==='a'?living:living.slice(0,1);
   for(const target of targets){const copy=new g.constructor(g.s);let drawn=0;const draw=copy.draw;copy.draw=function(n){const before=this.s.b.hand.length;draw.call(this,n);drawn+=Math.max(0,this.s.b.hand.length-before);};const paid=g.cost(c);if(!copy.play(c.uid,target.key,selected).ok)continue;
    const nb=copy.s.b,damage=living.reduce((n,e)=>n+e.hp-(nb.enemies.find(x=>x.key===e.key)?.hp||0),0),kills=living.filter(e=>(nb.enemies.find(x=>x.key===e.key)?.hp||0)<=0).length;
    const guard=nb.block-b.block,needed=Math.max(0,incoming-b.block),stored=g.power('W22')!==null?.28:0;
    let value=damage+Math.min(guard,needed)*1.35+Math.max(0,guard-needed)*stored+drawn*4+(nb.qi-b.qi+paid)*6+(copy.s.hp-g.s.hp)*(g.s.hp<25?3.5:2)+kills*18;
    // Score only the change to currently visible threats. No future script or
    // draw-pile identity is used to decide whether to break a stance or poison.
    if(counterplay&&living.some(e=>e.tactics?.skirmish)){
     const threat=(engine,enemies)=>enemies.reduce((sum,e)=>sum+enemyActionView(engine,e).tags.reduce((n,t)=>n+(t.kind==='attack'?(t.segments||[]).reduce((v,x)=>v+x.amount*x.count,0):t.kind==='debuff'&&/施毒/.test(t.text)?Number(t.text.match(/\d+/)?.[0]||0)*3:t.kind==='block'&&/护援/.test(t.text)?Number(t.text.match(/\d+/)?.[0]||0)*.7:0),0),0);
     value+=Math.max(0,threat(g,living)-threat(copy,nb.enemies.filter(e=>e.hp>0)))*1.25;
     value+=living.reduce((sum,e)=>{const next=nb.enemies.find(x=>x.key===e.key),breakable=enemyActionView(g,e).tags.some(t=>/破盾削掌|截断护援/.test(t.text));return sum+(breakable&&next?Math.max(0,e.block-next.block)*1.5:0);},0);
    }
    value+=(nb.str-b.str)*Math.min(7,2+own.filter(x=>CARD[x.id].type==='a').length*.45);
    value+=living.reduce((n,e)=>{const next=nb.enemies.find(x=>x.key===e.key);return n+(next?Math.max(0,next.weak-e.weak)*4+Math.max(0,next.vuln-e.vuln)*2+Math.max(0,next.pin-e.pin)*.6:0);},0);
    if(d.type==='p')value+=({W22:20,W12:16,W13:0,W28:18,W29:15,W36:consumes>=3?22:2,W37:consumes>=3?20:2,W38:consumes>=3?17:2,W48:own.some(x=>['W43','W44','W54','U14'].includes(x.id))?19:3,W51:own.some(x=>['W43','W44','W54','U14'].includes(x.id))?17:2}[c.id]||0);
    if(c.id==='W16'&&!b.hand.some(x=>x!==c&&CARD[x.id].type==='a'&&g.cost(x)<=b.qi-paid))value=-30;
    if(c.id==='W18')value=b.hand.some(x=>CARD[x.id].type==='a'&&g.cost(x)<=b.qi-paid)?12+b.str*2:-30;
    if(c.id==='W58'&&b.hand.some(x=>CARD[x.id].type==='s'&&g.cost(x)>0))value+=5;
    const retired=nb.exhaust.length-b.exhaust.length;value+=retired*.7;
    if(copy.s.phase==='battle'){
     const remainingAttacks=[...nb.hand,...nb.draw,...nb.discard].filter(x=>CARD[x.id].type==='a').length;
     for(const used of nb.exhaust.slice(b.exhaust.length)){
      const kind=CARD[used.id].type;if(kind==='a'&&remainingAttacks<2)value-=60;
      // Do not mistake a large, nonlethal exhaust burst for a sustainable win.
      // This uses only the cards just consumed and the visible surviving foes.
      if(remainingAttacks===0&&nb.enemies.some(e=>e.hp>0))value-=1000;
      if(kind==='p'&&!(used.id==='W22'&&g.power('W22')!==null))value-=g.power(used.id)===null?150:10;
     }
    }
for(const uid of selected)if(['status','curse'].includes(CARD[b.hand.find(x=>x.uid===uid).id].type))value+=3;
    value/=1+paid*.4;options.push({c,target,selected,value});
   }
  }
  options.sort((a,z)=>z.value-a.value);const best=options[0];if(!best||best.value<=0)break;g.play(best.c.uid,best.target.key,best.selected);
 }
 if(g.s.phase==='battle')g.endTurn();
}
