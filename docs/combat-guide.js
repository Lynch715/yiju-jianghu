import {enemyActionView} from './enemy-action.js?v=0.25.1';

// Presentation only: describe the chosen action and active states. Never generate
// another intent or inspect an enemy's future move list.
export const COMBAT_RULES=[
 {id:'attack',name:'攻击与多段',text:'攻击6×2表示连续攻击两次，每次6伤害。格挡逐击抵挡；反震在对应的一击之后结算。意图中的攻击数值已计入当前增减伤，尚未扣除你的格挡。'},
 {id:'block',name:'格挡与护援',text:'格挡先抵挡攻击。你的格挡在下回合开始时清空，敌人的格挡在敌方行动前清空；保留格挡的心法除外。护援给其他存活敌人增加格挡。'},
 {id:'str',name:'劲力',text:'每点劲力使每段攻击增加1伤害，持续本场战斗。'},
 {id:'weak',name:'虚弱',text:'攻击伤害减少25%，向下取整。数字表示剩余层数，每回合减少1层。'},
 {id:'vuln',name:'破绽',text:'受到的攻击伤害增加50%，向下取整。数字表示剩余层数，每回合减少1层。'},
 {id:'poison',name:'中毒',text:'敌方行动结束后，失去等于中毒层数的气血，再减少1层。毒伤不消耗格挡。'},
 {id:'chill',name:'寒气',text:'使你下一回合少回复真气，单回合最多少2点。不会永久降低真气上限。'},
 {id:'status',name:'气滞与心魔',text:'气滞会混入弃牌堆，不能打出，会占用抽牌。可用其他牌弃掉或消耗，战后消失。心魔在手中留到回合结束会使你失去2气血，战后仍留在牌组，需在行商处移除。'},
 {id:'charge',name:'蓄力',text:'敌人的下一次攻击，每段都增加等于蓄力值的伤害，攻击后清空。'},
 {id:'pin',name:'点穴',text:'降低目标本轮攻击的第一击伤害，最低为0；后续连击不受影响。多次点穴可以累加。'},
 {id:'exhaust',name:'消耗与虚无',text:'消耗的牌本场不再抽到，战后恢复。虚无牌在回合结束仍在手中时自动消耗，即使已被保留。'},
 {id:'power',name:'心法与互搏',text:'心法打出后持续整场，多数同名心法可以叠加；金刚不坏体的格挡保留效果只需一次。互搏让下一张攻击额外结算，次数可以累加。'},
 {id:'self',name:'自损',text:'自损不受格挡保护，不能主动付到气血低于1；回合结束的心魔和毒伤仍可能致命。'}
];
export const COMBAT_RULE=Object.fromEntries(COMBAT_RULES.map(x=>[x.id,x]));
export function explainActionTag(tag,e){
 const s=tag.text,i=e.intent||{};
 if(tag.kind==='attack'){const total=(tag.segments||[]).reduce((n,x)=>n+x.amount*x.count,0);return `预计共${total}伤害，格挡逐击抵挡。当前的劲力、虚弱、破绽和点穴已计入。`;}
 if(s.startsWith('格挡'))return '行动时为自己增加格挡，先抵挡你的攻击。';
 if(s.startsWith('护援 +'))return '行动时为其他存活同伴分别增加所示格挡。';
 if(s.startsWith('蓄力 +'))return COMBAT_RULE.charge.text;
 if(s==='蓄力')return '正在蓄势。持续攻击可以打断架势；当前攻击数值会随架势变化。';
 if(s.startsWith('劲力'))return COMBAT_RULE.str.text;
 if(s.startsWith('虚弱'))return '对你施加所示层数的虚弱。'+COMBAT_RULE.weak.text;
 if(s.startsWith('破绽'))return '对你施加所示层数的破绽。'+COMBAT_RULE.vuln.text;
 if(s.startsWith('施毒')||s.startsWith('伤血施毒'))return (i.poisonOnHit?'本招伤及你的气血时，才会施加中毒。':'本招施加中毒，即使攻击被格挡也会生效。')+COMBAT_RULE.poison.text;
 if(s.startsWith('寒气'))return COMBAT_RULE.chill.text;
 if(s.startsWith('气滞'))return '将所示数量的气滞放入你的弃牌堆，随后可能被抽到。';
 if(s.startsWith('伤血添气滞'))return '每一击伤及你的气血时，将所示数量的气滞放入弃牌堆。完整格挡该击可阻止塞牌。';
 if(s==='饮血')return i.drainRatio?`回复本招实际造成气血伤害的${Math.round(i.drainRatio*100)}%（向下取整）；成功回血还会获得1劲力。完整格挡可阻止。`:`回复不超过${i.leech}气血，且不超过本招实际造成的气血伤害。完整格挡可阻止。`;
 if(s==='召援')return '召来毒徒，存活毒徒最多2人；新到的毒徒从下一轮开始行动。';
 if(s==='布雷')return '布下暗雷，后续引爆会造成伤害。每消耗一张牌可拆1层；对成昆每累计造成12气血伤害也可拆1层。';
 if(s==='引爆')return '引爆剩余暗雷，伤害已列在当前攻击中。引爆前仍可通过消耗牌或攻击成昆拆雷。';
 if(s==='自爆')return '本招完成后，该毒徒退场。';
 if(s.startsWith('毒囊 +'))return '备下所示层数的毒囊，每层增加施毒层数。消耗气滞或心魔可拆1层，每累计造成15气血伤害也可拆1层。';
 if(s.startsWith('吸取劲力'))return '行动后，从你当前的正劲力中吸取所示点数，转为自己的劲力。';
 if(s==='立起掌势')return '立起掌势，强化重掌。在其出掌前击破格挡，可以削弱重掌并阻止附带的虚弱。';
 if(s==='盘蛇蓄势')return '立起盘蛇架势。后续攻击可削减架势与蓄力，击破架势后清空蓄力并阻止毒劲。';
 if(s==='试剑')return '本招伤及你的气血后，追剑会增强。完整格挡可以阻止强化。';
 if(s.startsWith('剑势'))return '剑势提高青城弟子的攻击伤害。累计造成6点气血伤害可削1层；格挡吸收的伤害不计入。';
 if(s.startsWith('架势 ·'))return '击破当前格挡，可削弱重掌并阻止其附带的虚弱。';
 if(s.startsWith('架势已破')||s==='架势受挫')return '架势已被打断，当前招式已削弱。以现在显示的意图为准。';
 if(s.startsWith('备毒 +'))return '为后续施毒备下所示层数，可在其出手前拆除。';
 if(s.startsWith('备毒 '))return '每累计造成8点气血伤害可拆1层；消耗一张气滞或心魔也可拆1层。';
 if(s.startsWith('血势'))return '伤及你的气血会强化后续刀招。完整格挡一整招，可清除血势。';
 if(s.startsWith('盘蛇已破'))return '盘蛇架势已破，蓄力清空，本次毒劲被阻止。';
 if(s.startsWith('盘蛇 '))return '攻击伤害可削减盘蛇架势，格挡吸收的部分也计入。每累计4伤害削1蓄力，击破架势后清空蓄力并阻止毒劲。';
 if(s.startsWith('试剑得隙'))return '此前试探伤及气血，本次追剑已增强。强化伤害已计入当前意图。';
 if(s.startsWith('运劲 +'))return '运劲会强化之后的掌招。对手出掌前，施加虚弱或点穴可以压制这股劲力。';
 if(s.startsWith('运劲 ·'))return '让该敌人带着虚弱或点穴出手，即可阻止运劲提供的额外伤害。';
 if(s.startsWith('受击'))return '在其行动前累计造成所示伤害，可截断本次护援；格挡吸收的伤害也计入。';
 if(s==='护援已截断')return '本次不再为同伴提供格挡，自身获得的格挡也已减少。';
 if(s==='本轮不出招')return '当前没有攻击或其他已显示的效果。';
 return '以当前显示的效果为准。';
}
export function enemyReadout(game,e){
 const view=enemyActionView(game,e),t=e.tactics||{},stances=[],add=(name,text)=>stances.push({name,text});
 if(view.state==='ready'&&!t.skirmish){
  if(t.windup>0&&!t.broken)add('蓄力架势','持续攻击可打断架势，格挡吸收的伤害也计入。'+(e.id==='ouyangfeng'?'此架势下，你每出一张攻击牌，敌人也会增加1蓄力。':''));
  if(t.ward&&!t.broken)add('托塔气墙','击破格挡，可以打断下一次行动。');
  if(t.bags>0)add(`毒囊 ${t.bags}`,'每层增加施毒层数。消耗气滞或心魔可拆1层，每累计造成15点气血伤害也可拆1层。');
  if(t.mines>0)add(`暗雷 ${t.mines}`,'引爆时每层造成10伤害。每消耗一张牌可拆1层，对成昆每累计造成12点气血伤害也可拆1层。');
  if(t.stolen>0)add(`已吸取劲力 ${t.stolen}`,'每累计造成28点气血伤害可夺回1劲力。击败他后，归还剩余被吸取的劲力。');
  if(t.needles>0)add(`针势 ${t.needles}`,'你每出6张牌，针势增加1层；每层使其攻击多1段，攻击后清空。');
  if(e.id==='yucanghai'&&t.sword>0)add(`剑势 ${t.sword}`,'剑势增强剑掌伤害。击败助阵的青城弟子，可清空剑势并让余沧海获得2层破绽。');
 }
 return {state:view.state,stances,effects:view.tags.map(tag=>({name:tag.text,text:explainActionTag(tag,e)})),statuses:[
  ['str','劲力',e.str],['weak','虚弱',e.weak],['vuln','破绽',e.vuln],['charge','蓄力',e.charge],['pin','点穴',e.pin]
 ].filter(([, ,n])=>n>0).map(([id,name,n])=>({name:`${name} ${n}`,text:COMBAT_RULE[id].text}))};
}
