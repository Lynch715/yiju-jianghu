import {adaptiveCardScore,adaptiveRelicScore} from './draft-policy.mjs';
import {Game} from '../engine.js';
import {CARD,ROUTES} from '../data.js';

export const VIABILITY_SEEDS={劲力:365,格挡:1934,变招:1192,血战:8377,连击:4979};

export function runGame(policy,seed=42,elites=true,{classic=false,Engine=Game,onState=()=>{},combat=null}={}){
 const g=new Engine();g.start(seed,{classic});g.setCharacterName('试剑人');g.choosePlayerPortrait('male-qing');g.finishCharacter();let steps=0;
 const boon=g.s.opening.options.find(x=>x.id==='coins')||g.s.opening.options.find(x=>x.id==='vitality')||g.s.opening.options.find(x=>!['relicWound','relicCurse','rareToll'].includes(x.id));
 g.chooseOpening(boon.id);if(!g.s.opening.result)g.completeOpening(boon.id==='insight'?boon.cards[0]:g.s.deck[0].uid);g.leaveOpening();
 const preference={劲力:['W13','W12','W08','W07','W10','W11','W44','W59','W21','W19'],格挡:['W22','W29','W28','W19','W27','W21','W26','W23','W05','W24'],变招:['W37','W36','W38','W35','W31','W32','W33','W41','W13','W08'],血战:['W48','W51','W43','W44','W46','W47','W49','W50','W52','W13'],连击:['W58','W55','W53','W57','W04','W13','W12','W21','W28','U12','W59','W18']}[policy]||[];
 const rank=id=>policy==='随缘'?adaptiveCardScore(g,id):preference.includes(id)?100-preference.indexOf(id)*3:CARD[id].type==='a'?35+CARD[id].rarity:20;
 while(!['win','lost'].includes(g.s.phase)&&steps++<1200){
  const s=g.s;onState(g);
  if(s.phase==='map'){
   if(!s.journey){const choices=ROUTES[s.step%6];let kind=choices[0];if(s.step%6===2&&!elites)kind='battle';if(s.step%6===4&&s.hp<s.maxHp*.6&&!g.has('R27'))kind='rest';g.enter(kind);}
   else{const score=n=>n.kind==='rest'?(s.hp<s.maxHp*.7&&!g.has('R27')?110:40):n.kind==='shop'?(s.gold>=100?85:25):n.kind==='elite'?(elites&&s.hp>s.maxHp*.78&&s.deck.filter(c=>CARD[c.id].rarity>0).length>=5?65:10):n.kind==='event'?48:n.kind==='battle'?45:100;const nodes=[...g.availableNodes].sort((a,b)=>score(b)-score(a));if(!nodes.length)throw Error('No reachable route at '+s.step);g.enterNode(nodes[0].id);}
  }
  else if(s.phase==='battle'){if(combat)combat(g);else g.autoPlayTurn();}
  else if(s.phase==='reward'){
   if(!s.reward.cardDone){const ids=[...s.reward.cards].sort((a,b)=>rank(b)-rank(a));g.chooseRewardCard((policy==='随缘'?rank(ids[0])>=55:s.deck.length<23||rank(ids[0])>50)?ids[0]:null);}
   if(!s.reward.relicDone){const ids=[...s.reward.relics].sort((a,b)=>{if(policy==='随缘')return adaptiveRelicScore(g,b)-adaptiveRelicScore(g,a);const priority={R26:6,R25:5,R28:2,R27:1,R29:policy==='格挡'?4:-3,R30:3};return (priority[b]||0)-(priority[a]||0);});g.chooseRewardRelic(ids[0]);}g.leaveReward();
  }else if(s.phase==='rest'){
   if(s.hp<s.maxHp*.65&&!g.has('R27'))g.rest('heal');else{const candidates=s.deck.filter(c=>!c.up).sort((a,b)=>rank(b.id)-rank(a.id));if(candidates.length)g.rest('upgrade',candidates[0].uid);else g.rest('leave');}
  }else if(s.phase==='treasure'){g.chooseTreasure(s.scene.relics[0]||'coins');g.finishNode();
  }else if(s.phase==='event'){
   if(s.scene.event==='master')g.eventChoice(policy==='随缘'&&s.deck.some(c=>!c.up&&CARD[c.id].rarity>0)?1:0);else if(s.scene.event==='shrine')g.eventChoice(1);else if(s.scene.event==='traveller')g.eventChoice(s.gold>=35?0:1);else if(s.scene.event==='clinic')g.eventChoice(s.hp<s.maxHp*.7&&s.gold>=25?0:1);else if(s.scene.event==='cache')g.eventChoice(s.gold>=55?0:1);else if(s.scene.event==='stone'){const type=s.deck.some(c=>!c.up&&CARD[c.id].type==='a')?0:1;if(!g.eventChoice(type))g.eventChoice(2);}else g.eventChoice(1);g.finishNode();
  }else if(s.phase==='shop'){
   const x=s.scene.stock;let index=-1;for(let i=0;i<x.cards.length;i++)if(s.gold>=x.cards[i].price&&rank(x.cards[i].id)>45&&(index<0||rank(x.cards[i].id)>rank(x.cards[index].id)))index=i;if(index>=0)g.buyCard(index);
   if(s.gold>=x.relicPrice&&(policy!=='随缘'||adaptiveRelicScore(g,x.relic)>=65))g.buyRelic();const strike=s.deck.find(c=>c.id==='W01');if(strike&&s.gold>=g.removalCost&&s.deck.length>10)g.removeCard(strike.uid);g.finishNode();
  }
 }
 return {policy,seed,elites,phase:g.s.phase,hp:g.s.hp,step:g.s.step,turns:g.s.stats.turns,plays:g.s.stats.played,deck:g.s.deck.length,relics:g.s.relics.length,iterations:steps,state:g.s};
}
if(process.argv[1]?.endsWith('/playthrough.mjs')){for(const policy of ['劲力','格挡','变招','血战'])for(const seed of [7,42,123,2026,1016]){const r=runGame(policy,seed);delete r.state;console.log(JSON.stringify(r));}}
