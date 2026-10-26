import {CARD,describe} from './data.js?v=0.27.0';
import {Game} from './engine.js?v=0.27.0';
function cardHitPattern(values,base,value){const runs=[];for(const n of values){if(runs.at(-1)?.amount===n)runs.at(-1).count++;else runs.push({amount:n,count:1});}return runs.map(r=>r.count>1?`${value(r.amount,base)}×${r.count}`:value(r.amount,base)).join('＋');}
// Resolve one cast on a private copy. Only public damage/block values leave this copy;
// RNG, draws, choices, tactics, histories and the live save are never mutated or exposed.
function combatCardText(game,card,targetKey,{selections=[],selectionKnown=false}={},value=String){
 const original=describe(card),s=game.s,b=s?.b,d=CARD[card.id];
 if(s?.phase!=='battle'||!b?.hand.some(c=>c.uid===card.uid)||['status','curse'].includes(d.type))return original;
 const probe=new Game(s),pb=probe.s.b,pc=pb.hand.find(c=>c.uid===card.uid),hits=[],guards=[];
 const reason=probe.reason.bind(probe),selection=probe.selection.bind(probe),block=probe.block.bind(probe);
 probe.reason=c=>{const why=reason(c);return why==='真气不足'?'':why;};
 probe.selection=c=>{const spec=selection(c);return {...spec,min:0};};
 probe.block=(n,direct=false,ctx=null)=>{const before=pb.block;block(n,direct,ctx);guards.push({direct,amount:pb.block-before});};
 probe.onCombatStep=step=>{if(step.kind==='player-hit')hits.push({target:step.target,amount:step.amount});};
 const repeat=d.type==='a'?(Number(b.repeat)||0):0;pb.repeat=0;
 const result=probe.play(pc.uid,targetKey,selections);if(!result.ok)return original;
 const target=b.enemies.find(e=>e.key===targetKey&&e.hp>0)||b.enemies.find(e=>e.hp>0),direct=guards.filter(g=>g.direct).reduce((sum,g)=>sum+g.amount,0),indirect=guards.filter(g=>!g.direct).reduce((sum,g)=>sum+g.amount,0);
 const baseDamage=Number(original.match(/(?:造成(?:一次)?|一次)(\d+)伤害/)?.[1]??(card.id==='W27'?b.block:0));
 let baseBlock=Number(original.match(/获得(\d+)格挡/)?.[1]||0);
 if(card.id==='W26')baseBlock=Math.floor(b.block*(card.up?.75:.5));
 if(card.id==='W35')baseBlock=new Set(selections.filter(uid=>b.hand.some(c=>c.uid===uid&&uid!==card.uid))).size*(card.up?8:6);
 if(card.id==='W39')baseBlock=b.hand.filter(c=>c.uid!==card.uid&&CARD[c.id].type!=='a').length*(card.up?6:4);
 const guard=value(direct,baseBlock);
 let text=original,attack='';
 if(hits.length){const groups=new Map();for(const hit of hits){if(!groups.has(hit.target))groups.set(hit.target,[]);groups.get(hit.target).push(hit.amount);}
  attack=['W10','W60'].includes(card.id)?`对全体攻击（${[...groups].map(([key,values])=>`${b.enemies.findIndex(e=>e.key===key)+1}号 ${cardHitPattern(values,baseDamage,value)}`).join('；')}）。`:`造成${cardHitPattern(hits.map(h=>h.amount),baseDamage,value)}伤害。`;
  text=text.replace(/(?:对所有敌人)?造成(?:\d+|等于当前格挡的)伤害[，。]?/,attack).replace(/攻击\d+次[。；]?/,'');
 }
 if(guards.some(g=>g.direct))text=text.replace(/获得\d+格挡/,`获得${guard}格挡`);
 if(probe.actualSelf(pc)!==0)text=text.replace(/自损\d+气血/,`自损${value(game.actualSelf(card),Number(original.match(/自损(\d+)气血/)?.[1]||0))}气血`);
 const low=game.low(),retired=b.turnFlags.retired>0,self=b.turnFlags.self,previousSkill=b.turnFlags.last==='s';
 switch(card.id){
  case 'W07':if(attack)text=attack+`本次已计入${card.up?4:3}倍劲力加成。`;break;
  case 'W15':case 'W53':if(attack)text=attack+(low?'低气血加成已计入。':`气血不高于一半时，基础伤害再加${card.id==='W15'?(card.up?10:8):(card.up?4:3)}。`);break;
  case 'W20':text=`获得${guard}格挡。`+(target?.lastAction?.attacks?'目标上次攻击的加成已计入。':'目标上次出招含攻击时，格挡还会提升。');break;
  case 'W26':text=`额外获得${guard}格挡，已计入当前格挡的${card.up?75:50}%与加成。`;break;
  case 'W32':if(attack)text=attack+(selections.length?'消耗手牌的伤害加成已计入。':`可消耗另一张手牌，基础伤害再加${card.up?8:6}。`);break;
  case 'W33':if(attack)text=attack+`使目标虚弱${card.up?2:1}回合。`+(retired?'本回合消耗加成已计入。':'本回合消耗过牌时，基础伤害再加4。');break;
  case 'W35':text=selectionKnown?`消耗所选手牌，本次获得${guard}格挡。`:original+'选牌后显示本次总格挡。';break;
  case 'W39':text=`消耗其他所有非攻击手牌，本次获得${guard}格挡。本牌消耗。`;break;
  case 'W41':text=hits.length?`消耗其他所有手牌，${attack}本牌消耗。`:'消耗其他所有手牌，本次没有攻击段。本牌消耗。';break;
  case 'W46':if(attack)text=attack+(self?'自损伤害加成已计入。':`本回合自损过时，基础伤害再加${card.up?8:6}。`);break;
  case 'W47':if(attack)text=attack+(self?'自损追加攻击已计入。':'本回合自损过时多攻击一次。');break;
  case 'W55':if(attack)text=attack+(previousSkill?'技法衔接加成已计入。':'上一张手动牌为技法时，每段基础伤害再加2。');break;
  case 'W59':if(attack)text='消耗全部真气，'+attack;break;
  case 'W60':if(attack)text=attack+(b.turnFlags.attacks>=2?'连击追加段数已计入。':'此前本回合打出至少两张攻击时多攻击一次。');break;
  case 'U18':if(attack)text=attack+(b.turnFlags.plays>=3?'连续出牌加成已计入。':`此前本回合手动打出至少三张牌时，基础伤害再加${card.up?6:4}。`);break;
 }
 if(indirect>0)text+=`联动另得${value(indirect,0)}格挡。`;
 if(repeat>0)text+=`以上为首次结算，互搏额外${repeat}次。`;
 return text;
}

export function describeCombatCard(game,card,targetKey,options){return combatCardText(game,card,targetKey,options);}
const escapeCardText=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Preserve the plain description API. Only computed values gain markup; all text is escaped.
export function describeCombatCardHTML(game,card,targetKey,options){
 const values=[];
 const text=combatCardText(game,card,targetKey,options,(amount,base)=>{
  if(amount===base)return String(amount);
  const direction=amount>base?'higher':'lower',label=amount>base?'高于':'低于';
  values.push(`<span class="card-value ${direction}" title="${label}基础值 ${base}">${amount}</span>`);
  return `\uE000${values.length-1}\uE001`;
 });
 return escapeCardText(text).replace(/\uE000(\d+)\uE001/g,(_,i)=>values[Number(i)]);
}

// Cost comparisons reverse the damage/block palette: cheaper is favorable.
// Catalogue/deck cards keep base costs; X and unplayable symbols have no numeric baseline.
export function cardCostView(game,card,{live=false}={}){
 const d=CARD[card.id],base=Array.isArray(d.cost)?d.cost[card.up?1:0]:d.cost;
 if(base==='X'||base===99)return {text:base==='X'?'X':'—',base,value:base,direction:''};
 const inHand=live&&game.s?.phase==='battle'&&game.s.b?.hand.some(c=>c.uid===card.uid);
 const value=inHand?game.cost(card):base;
 return {text:String(value),base,value,direction:value<base?'cheaper':value>base?'dearer':''};
}
export function cardCostHTML(game,card,{live=false,preview=false}={}){
 const v=cardCostView(game,card,{live}),badge=preview?'preview-cost':'cost';
 const hint=v.direction?` title="基础费用 ${v.base}，当前${v.value}真气，费用${v.direction==='cheaper'?'降低':'升高'}"`:'';
 return `<span class="${badge}${v.direction?' cost-'+v.direction:''}"${hint}>${escapeCardText(v.text)}</span>`;
}
