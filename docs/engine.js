import {enemyActionView,enemyAttackTag} from './enemy-action.js?v=0.15.3';
import {createClearRecord} from './records.js?v=0.15.3';
import {attachEnemyTactics,tacticalIntent,onTacticalDamage,onTacticalExhaust,onTacticalPlay,onTacticalDeath,afterTacticalAction,afterTacticalFollowerAction} from './enemy-tactics.js?v=0.15.3';
import {JOURNEY_FLOORS,JOURNEY_TOTAL,newJourney,journeyChapter} from './journey.js?v=0.15.3';
import {PLAYERS,DEFAULT_PLAYER,cleanPlayerName,playerNameError,validPlayer,PLAYER_RETURN_PHASES} from './players.js?v=0.15.3';
import {ENEMY,ENCOUNTERS,ENCOUNTER_GROUPS} from './enemies.js?v=0.15.3';
import {DIFFICULTY,combatDefinition,encounterTuning} from './difficulty.js?v=0.15.3';
import {CARDS,CARD,RELICS,RELIC,CHAPTERS,ROUTES,isEthereal,OPENING_BOONS,GAME_VERSION} from './data.js?v=0.15.3';

export const SAVE_VERSION=7;
export const STARTING_DECK=Object.freeze([...Array(5).fill('W01'),...Array(4).fill('U01'),'U02']);
const exhausted=new Set(['W18','W39','W40','W41','W42','W45','W49','W54','W56','U03','U04','U05','U08','U10','U14','U15','U16','U17']);
const multi=new Set(['W08','W44','W47','W55','W59','W60']);
const selfCost={W43:2,W44:3,W45:3,W54:3,U14:2};
export const clone=x=>JSON.parse(JSON.stringify(x));

export function validOpening(o){
 if(!o||!Array.isArray(o.options)||o.options.length!==4||new Set(o.options.map(x=>x?.id)).size!==4)return false;
 for(const x of o.options){
  if(!x||!OPENING_BOONS.some(d=>d.id===x.id))return false;
  if(x.id==='insight'&&(!Array.isArray(x.cards)||x.cards.length!==3||new Set(x.cards).size!==3||!x.cards.every(id=>CARDS.some(d=>d.id===id&&d.rarity>0))))return false;
  if(x.id==='rareToll'&&!CARDS.some(d=>d.id===x.card&&d.rarity===3))return false;
  if(x.id==='relicWound'&&!RELICS.some(r=>r.id===x.relic&&r.tier===1))return false;
  if(x.id==='relicCurse'&&!RELICS.some(r=>r.id===x.relic&&r.tier===2))return false;
 }
 if(o.options.filter(x=>OPENING_BOONS.find(d=>d.id===x.id).risk).length!==1)return false;
 return (o.selected===null||o.options.some(x=>x.id===o.selected))&&(o.result===null||o.selected!==null&&typeof o.result==='string'&&o.result.length>0&&o.result.length<=1000);
}

export class Game {
 constructor(state=null){
  this.s=state?clone(state):null;
  if(this.s){
   // Preserve existing cards, relics and combat progress; remove the old direction binding.
   this.s.version=SAVE_VERSION;delete this.s.legacy;
   if(!validPlayer(this.s.player))this.s.player={...DEFAULT_PLAYER};
   // An unfinished v0.3 selection has not entered the journey yet.
   if(this.s.phase==='draft'){this.s.phase='map';this.s.deck=STARTING_DECK.map(id=>this.make(id));}
   if(Array.isArray(this.s.b?.enemies)){
    const chapter=Math.min(2,Math.floor(this.s.step/this.chapterLength)),pool=ENCOUNTERS[chapter];
    this.s.b.enemies.forEach((e,i)=>{if(!ENEMY[e.id]){const ids=e.kind==='boss'?pool.boss:e.kind==='elite'?pool.elite[0]:pool.normal[0];e.id=ids[i%ids.length];e.name=ENEMY[e.id].name;}});
   }
   if(this.s.b?.log)this.s.b.log=this.s.b.log.map(x=>x.replaceAll('暂退','消耗').replaceAll('护体','格挡').replaceAll('基础守势','抱元守一'));
  }
 }
 random(){let t=this.s.rng+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);this.s.rng>>>=0;return ((t^(t>>>14))>>>0)/4294967296;}
 pick(a){return a[Math.floor(this.random()*a.length)];}
 shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 make(id,up=false){return {id,up,uid:++this.s.uid};}
 has(id){return this.s.relics.includes(id);}
 log(text){if(this.s.b){this.s.b.log.push(text);this.s.b.log=this.s.b.log.slice(-80);for(const e of this.s.b.enemies||[])if(text.startsWith(e.name+' · ')){const record=this.encounterRecord(e);record.notes=[...(record.notes||[]).filter(x=>x!==text),text].slice(-20);}}}
 encounterRecord(e){this.s.journal??={};return this.s.journal[e.id]??=( {moves:{},notes:[]} );}
 combatStep(step){this.onCombatStep?.(step);}
 recordEnemyAction(e,intent,damage){const action={key:e.key,label:intent.label,attacks:!!intent.damage,damage};this.s.b.lastEnemyActions.push(action);e.lastAction=action;const record=this.encounterRecord(e);record.moves[intent.label]=(record.moves[intent.label]||0)+1;}
 start(seed=Date.now(),{opening=true,character=opening,classic=false}={}){
  this.s={version:SAVE_VERSION,phase:'map',player:{...DEFAULT_PLAYER},rng:Number(seed)>>>0,seed:Number(seed)>>>0,uid:0,hp:80,maxHp:80,gold:90,step:0,deck:[],relics:['R01'],b:null,scene:null,reward:null,history:[],stats:{turns:0,played:0,damage:0,exhausted:0,self:0,kills:0,wins:0},created:Date.now(),runInfo:{version:GAME_VERSION,activeMs:0,timed:true}};
  if(!classic){this.s.journey=newJourney();this.s.ruleset=DIFFICULTY;}
  for(const id of STARTING_DECK)this.s.deck.push(this.make(id));
  if(character){this.s.character={name:'',portrait:null,editing:false,returnPhase:opening?'opening':'map'};this.s.phase='character';}
  else if(opening)this.beginOpening();
  return this.s;
 }
 setCharacterName(name){if(this.s?.phase!=='character'||typeof name!=='string'||Array.from(name).length>60)return false;this.s.character.name=name;return true;}
 choosePlayerPortrait(id){if(this.s?.phase!=='character'||id!==null&&!PLAYERS.some(d=>d.id===id))return false;this.s.character.portrait=id;return true;}
 characterError(){const c=this.s?.character;if(this.s?.phase!=='character'||!c)return '请先创建侠客';return playerNameError(c.name)||(!PLAYERS.some(d=>d.id===c.portrait)?'请选择一张立绘':'');}
 finishCharacter(){
  if(this.characterError())return false;const c=this.s.character,profile={name:cleanPlayerName(c.name),portrait:c.portrait};
  this.s.player=profile;delete this.s.character;
  if(c.editing)this.s.phase=c.returnPhase;
  else{this.s.phase='map';if(c.returnPhase==='opening')this.beginOpening();}
  return true;
 }
 editCharacter(){
  if(!this.s||!PLAYER_RETURN_PHASES.includes(this.s.phase))return false;
  this.s.character={...this.s.player,editing:true,returnPhase:this.s.phase};this.s.phase='character';return true;
 }
 cancelCharacter(){if(this.s?.phase!=='character'||!this.s.character?.editing)return false;this.s.phase=this.s.character.returnPhase;delete this.s.character;return true;}
 beginOpening(){
  if(this.s?.phase!=='map'||this.s.step!==0||this.s.opening)return false;
  const options=this.shuffle(OPENING_BOONS.filter(d=>!d.risk)).slice(0,3).concat(this.pick(OPENING_BOONS.filter(d=>d.risk))).map(d=>({id:d.id}));
  for(const o of options){
   if(o.id==='insight')o.cards=this.offerCards(3);
   if(o.id==='rareToll')o.card=this.pick(CARDS.filter(d=>d.rarity===3)).id;
   if(o.id==='relicWound')o.relic=this.offerRelics(1,[1])[0];
   if(o.id==='relicCurse')o.relic=this.offerRelics(1,[2])[0];
  }
  this.s.opening={options:this.shuffle(options),selected:null,result:null};this.s.phase='opening';return true;
 }
 chooseOpening(id){
  const o=this.s?.opening;if(this.s?.phase!=='opening'||!o||o.selected!==null||o.result!==null||!o.options.some(x=>x.id===id))return false;
  o.selected=id;
  if(!['refine','simplify','insight'].includes(id)){if(!this.completeOpening()){o.selected=null;return false;}}
  return true;
 }
 backOpening(){const o=this.s?.opening;if(this.s?.phase!=='opening'||!o||o.selected===null||o.result!==null)return false;o.selected=null;return true;}
 completeOpening(target=null){
  const s=this.s,o=s?.opening;if(s?.phase!=='opening'||!o||o.result!==null)return false;
  const option=o.options.find(x=>x.id===o.selected);if(!option)return false;
  const id=option.id,c=s.deck.find(x=>x.uid===target);
  if(id==='refine'){
   if(!c||c.up||!CARDS.some(d=>d.id===c.id))return false;c.up=true;o.result=`「${CARD[c.id].name}」已永久精进。`;
  }else if(id==='simplify'){
   if(!c||s.deck.length<=1)return false;s.deck.splice(s.deck.indexOf(c),1);o.result=`已永久移除「${CARD[c.id].name}」，牌组剩余${s.deck.length}张。`;
  }else if(id==='insight'){
   if(!option.cards.includes(target))return false;s.deck.push(this.make(target));o.result=`习得「${CARD[target].name}」，已加入永久牌组。`;
  }else if(id==='coins'){s.gold+=75;o.result='获得75银两，现有'+s.gold+'银两。';}
  else if(id==='vitality'){s.maxHp+=7;s.hp=Math.min(s.maxHp,s.hp+7);o.result='气血上限增加7，当前气血'+s.hp+' / '+s.maxHp+'。';}
  else if(id==='relicWound'){
   if(s.hp<=8||!RELIC[option.relic]||this.has(option.relic))return false;s.hp-=8;s.relics.push(option.relic);o.result=`失去8气血，获得「${RELIC[option.relic].name}」。`;
  }else if(id==='relicCurse'){
   if(!RELIC[option.relic]||this.has(option.relic))return false;s.deck.push(this.make('CURSE'));s.relics.push(option.relic);o.result=`心魔已加入牌组，获得「${RELIC[option.relic].name}」。`;
  }else if(id==='rareToll'){
   if(!CARD[option.card])return false;const paid=s.gold;s.gold=0;s.deck.push(this.make(option.card));o.result=`交出${paid}银两，习得「${CARD[option.card].name}」。`;
  }else return false;
  return true;
 }
 leaveOpening(){if(this.s?.phase!=='opening'||!this.s.opening?.result)return false;this.s.phase='map';return true;}
 get chapterLength(){return this.s?.journey?JOURNEY_FLOORS:6;}
 get totalSteps(){return this.s?.journey?JOURNEY_TOTAL:18;}
 get chapter(){return Math.min(2,Math.floor(this.s.step/this.chapterLength));}
 get chapterStep(){return this.s.step%this.chapterLength;}
 chapterMap(chapter=this.chapter){
  if(this.s.journey)return journeyChapter(this.s.seed,chapter);
  const rows=ROUTES.map((kinds,floor)=>kinds.map((kind,lane)=>({id:`old-${chapter}-${floor}-${lane}`,chapter,floor,lane,kind,name:kind==='boss'?CHAPTERS[chapter].boss:CHAPTERS[chapter].place,x:kinds.length===1?50:lane===0?32:68})));
  return {chapter,rows,nodes:rows.flat(),edges:rows.slice(0,-1).flatMap((row,i)=>row.flatMap(a=>rows[i+1].map(b=>[a.id,b.id])))};
 }
 get availableNodes(){
  if(!this.s||this.s.phase!=='map'||this.s.step>=this.totalSteps)return [];
  const map=this.chapterMap(),floor=this.chapterStep,row=map.rows[floor];
  if(!this.s.journey)return row;
  if(this.s.journey.path.length!==this.s.step||this.s.journey.active!==null)return [];
  return floor===0?row:row.filter(n=>map.edges.some(([a,b])=>a===this.s.journey.path.at(-1)&&b===n.id));
 }
 get qiMax(){return 3+['R25','R26','R27','R28'].filter(x=>this.has(x)).length;}
 powerCopies(id){const b=this.s.b,copies=b?.powerStacks?.[id];return Array.isArray(copies)?copies:(b?.powers[id]===undefined?[]:[!!b.powers[id]]);}
 power(id){const copies=this.powerCopies(id);return copies.length?(copies.some(Boolean)?1:0):null;}
 powerSum(id,base,up){return this.powerCopies(id).reduce((n,refined)=>n+(refined?up:base),0);}
 addPower(card){const b=this.s.b,copies=[...this.powerCopies(card.id),!!card.up];b.powers[card.id]=copies.some(Boolean);if(copies.length>1){b.powerStacks??={};b.powerStacks[card.id]=copies;}}
 reflectionStacks(kind){const b=this.s.b;return kind==='next'?(b.reflectNextStacks||(b.reflectNext?1:0)):(b.reflectRoundStacks||(b.reflectPool?1:0));}
 val(card,a,b){return card.up?b:a;}
 energy(n){this.s.b.qi+=n;if(n)this.log(`回复${n}真气`);}
 heal(n,source='调息'){const before=this.s.hp;this.s.hp=Math.min(this.s.maxHp,this.s.hp+n);if(this.s.hp>before)this.log(`${source} · 回复${this.s.hp-before}气血`);}
 block(n,direct=false,ctx=null){
  const b=this.s.b;
  n=Math.max(0,Math.floor(n));
  if(direct&&ctx&&!ctx.blockBoosted){n+=this.powerSum('W29',2,3);if(this.has('R06')&&!b.turnFlags.glove){n+=3;b.turnFlags.glove=true;this.log('金丝手套 · 额外格挡3');}ctx.blockBoosted=true;}
  b.block+=n;if(n)this.log(`获得${n}格挡（现有${b.block}）`);
 }
 low(){return this.s.hp<=this.s.maxHp/2;}
 bee(){const b=this.s.b;if(this.s.phase==='battle'&&this.s.hp>0&&this.low()&&this.has('R22')&&!b.battleFlags.bee){b.battleFlags.bee=true;this.heal(6,'玉蜂浆');}}
 actualSelf(card){let n=selfCost[card.id]||0;if(card.id==='W54'&&card.up)n=2;if(n&&this.has('R08')&&this.s.b.battleFlags.bandage<2)n=Math.max(1,n-1);return n;}
 paySelf(card){
  const n=this.actualSelf(card);if(!n)return true;if(this.s.hp<=n)return false;
  const b=this.s.b;this.s.hp-=n;this.s.stats.self+=n;if(this.has('R08')&&b.battleFlags.bandage<2)b.battleFlags.bandage++;
  this.log(`${CARD[card.id].name} · 自损${n}气血`);
  const strength=this.powerSum('W51',1,2);if(strength){b.str+=strength;this.log(`逆练蛤蟆功 · 劲力+${strength}`);}this.block(this.powerSum('W48',6,8));if(this.has('R07'))this.block(4);
  b.turnFlags.self=true;this.bee();this.combatStep({kind:'player-effect',actor:'player',label:CARD[card.id].name+' · 自损'});return true;
 }
 draw(n){const b=this.s.b;for(let i=0;i<n;i++){if(!b.draw.length){if(!b.discard.length)break;b.draw=this.shuffle(b.discard.splice(0));this.log('弃牌洗回抽牌堆');}const c=b.draw.pop();if(b.hand.length<10)b.hand.push(c);else{delete c.retain;b.discard.push(c);this.log('手牌已满 · 抽到的牌进入弃牌堆');}}}
 addStatus(n){for(let i=0;i<n;i++)this.s.b.discard.push(this.make('QI'));this.log(`弃牌堆加入${n}张气滞`);}
 exhaustCard(c){
  const b=this.s.b;b.exhaust.push(c);delete c.retain;this.s.stats.exhausted++;b.turnFlags.retired++;this.log(`消耗 · ${CARD[c.id].name}`);
  this.block(this.powerSum('W38',3,4));
  this.energy(this.powerSum('W37',1,1));
  this.draw(this.powerSum('W36',1,2));
  const type=CARD[c.id].type;
  if(this.has('R09')&&!['status','curse'].includes(type)){this.draw(1);this.log('棋子袋 · 抽1张');}
  if(['status','curse'].includes(type)){
   if(this.has('R10'))this.block(4);b.turnFlags.badRetired++;
   if(this.has('R24')&&!b.battleFlags.herb){b.battleFlags.herb=true;this.heal(3,'断肠草药包');}
  }
  if(type==='s'&&this.has('R18')){this.energy(1);this.log('罗汉木偶 · 回气');}
  onTacticalExhaust(this,c);
  if(b.turnFlags.retired%2===0&&this.has('R17'))for(const e of b.enemies.filter(x=>x.hp>0))this.direct(e,6,'圣火令');
 }
 takeSelections(ids){const b=this.s.b;const taken=[];for(const uid of ids){const i=b.hand.findIndex(x=>x.uid===uid);if(i>=0)taken.push(b.hand.splice(i,1)[0]);}return taken;}
 retireSelected(ids){const a=this.takeSelections(ids);for(const c of a)this.exhaustCard(c);return a.length;}
 direct(enemy,n,source='奇物',trace={}){
  if(!enemy||enemy.hp<=0)return;const hit=Math.min(enemy.hp,n);enemy.hp-=hit;this.s.stats.damage+=hit;this.log(`${source} → ${enemy.name} ${hit}点伤害`);onTacticalDamage(this,enemy,hit,hit);if(enemy.hp<=0)this.onKill(enemy,null);if(hit>0)this.combatStep({kind:['乾坤反震','斗转反震','软猬甲'].includes(source)?'reaction':'effect',actor:'player',target:enemy.key,label:source,...trace});
 }
 onKill(e,card){
  if(e.dead)return;e.dead=true;onTacticalDeath(this,e);this.s.stats.kills++;this.log(`击败 · ${e.name}`);
  if(!e.summoned){if(this.has('R15')){this.s.b.str+=2;this.log('屠龙刀 · 劲力+2');}if(card?.id==='W50'){this.s.b.battleFlags.blood++;this.heal(card.up?4:3,'血刀大法');}}
 }
 hit(e,base,card,ctx,{times=1,str=1,ignore=false}={}){
  const b=this.s.b;for(let i=0;i<times;i++){
   if(!e||e.hp<=0)break;let n=Math.max(0,base+b.str*str);
   if(ctx?.goldSnake)n++;
   if(ctx?.heavy&&!ctx.heavyUsed){n+=8;ctx.heavyUsed=true;}
   if(b.weak>0)n*=.75;if(e.vuln>0)n*=1.5;n=Math.floor(n);
   const blocked=ignore?0:Math.min(e.block,n);e.block-=blocked;const hp=Math.min(e.hp,n-blocked);e.hp-=hp;this.s.stats.damage+=hp;
   this.log(`${CARD[card.id].name} → ${e.name} ${n}伤害${blocked?`（抵挡${blocked}）`:''}`);if(ctx)ctx.hitTargets.add(e.key);
   onTacticalDamage(this,e,hp,hp+blocked);if(e.hp<=0)this.onKill(e,card);
   this.combatStep({kind:'player-hit',actor:'player',target:e.key,label:CARD[card.id].name+(card.up?'·精进':''),type:'a',hit:ctx?.hitSequence?++ctx.hitSequence.value:i+1,blocked,damage:hp,amount:n});
  }
 }
 selection(card){
  const b=this.s.b;let kind=null,max=0,min=0;
  if(['W30','U17'].includes(card.id)){kind='retain';max=card.id==='U17'?(card.up?2:1):1;min=card.id==='U17'?1:0;}
  if(['W31','W32','W35','W40','W42','U15'].includes(card.id)){kind='exhaust';max=['W35','W42'].includes(card.id)?2:1;min=['W31','U15'].includes(card.id)?1:0;}
  if(card.id==='U16'){kind='upgrade';max=card.up?2:1;min=1;}
  let candidates=(b?.hand||[]).filter(x=>x.uid!==card.uid);
  if(card.id==='W42')candidates=candidates.filter(x=>['status','curse'].includes(CARD[x.id].type));
  if(kind==='upgrade')candidates=candidates.filter(x=>!x.up&&!['status','curse'].includes(CARD[x.id].type));
  return {kind,max,min,candidates};
 }
 cost(card){const d=CARD[card.id],b=this.s.b;let n=Array.isArray(d.cost)?d.cost[card.up?1:0]:d.cost;if(n==='X')return b.qi;if(d.type==='s'&&b.discount)n-=b.discount;if(d.type==='p'&&this.has('R19')&&!b.battleFlags.firstPower)n--;return Math.max(0,n);}
 reason(card){
  if(this.s.phase!=='battle')return '当前不在战斗';const b=this.s.b,d=CARD[card.id];
  if(!b.hand.some(x=>x.uid===card.uid))return '不在手中';if(['status','curse'].includes(d.type))return '此牌无法使用';
  if(card.id==='W22'&&this.power('W22')!==null)return '格挡保留已生效';
  if(this.cost(card)>b.qi)return '真气不足';if(card.id==='W59'&&b.qi===0)return '至少需要1点真气';
  if(this.actualSelf(card)>=this.s.hp&&selfCost[card.id])return '气血不足以支付自损';
  const s=this.selection(card);if(s.kind&&s.candidates.length<s.min)return '缺少可选择的其他手牌';return '';
 }
 play(uid,targetKey=null,selections=[]){
  const b=this.s.b,c=b?.hand.find(x=>x.uid===uid);if(!c)return {ok:false,error:'手牌不存在'};
  const why=this.reason(c);if(why)return {ok:false,error:why};
  const sel=this.selection(c);if(new Set(selections).size!==selections.length||selections.length<sel.min||selections.length>sel.max||selections.some(x=>!sel.candidates.some(y=>y.uid===x)))return {ok:false,error:'请选择有效的手牌'};
  const target=b.enemies.find(x=>x.key===targetKey&&x.hp>0)||b.enemies.find(x=>x.hp>0);if(!target)return {ok:false,error:'没有目标'};
  const d=CARD[c.id],paid=this.cost(c),previous=b.turnFlags.last,attacks=b.turnFlags.attacks,plays=b.turnFlags.plays;
  b.hand.splice(b.hand.findIndex(x=>x.uid===uid),1);b.qi-=paid;if(d.type==='s')b.discount=0;
  const extra=d.type==='a'?(Number(b.repeat)||0):0;if(d.type==='a')b.repeat=false;
  const ctx={paid,previous,attacks,plays,hitSequence:{value:0},hitTargets:new Set(),blockBoosted:false,goldSnake:false,heavy:false};
  if(d.type==='a'){
   if(this.has('R13')&&paid>=2&&!b.turnFlags.heavy){ctx.heavy=true;b.turnFlags.heavy=true;}
   if(this.has('R20')&&multi.has(c.id)&&!b.turnFlags.snake){ctx.goldSnake=true;b.turnFlags.snake=true;}
  }
  this.log(`出招 · ${d.name}${c.up?'·精进':''}（${paid}真气）`);
  this.combatStep({kind:'player-begin',actor:'player',label:d.name+(c.up?'·精进':''),type:d.type});onTacticalPlay(this,c);this.resolve(c,target,ctx,selections);
  for(let copy=0;copy<extra&&this.s.hp>0&&b.enemies.some(e=>e.hp>0);copy++){
   const next=target.hp>0?target:b.enemies.find(e=>e.hp>0);
   if(this.actualSelf(c)<this.s.hp){this.log('左右互搏 · 额外结算');this.resolve(c,next,{...ctx,heavy:false,heavyUsed:true,blockBoosted:false},[]);}else{this.log('气血不足 · 取消剩余额外结算');break;}
  }
  if(d.type==='p'){
   this.addPower(c);
   if(!b.battleFlags.firstPower){if(this.has('R19'))this.draw(1);if(this.has('R23'))this.heal(3,'九花玉露丸');b.battleFlags.firstPower=true;}
  }else if(exhausted.has(c.id))this.exhaustCard(c);else b.discard.push(c);
  b.turnFlags.plays++;this.s.stats.played++;
  if(d.type==='a'){
   b.turnFlags.attacks++;
   if(b.turnFlags.attacks===1){if(this.has('R14'))for(const key of ctx.hitTargets){const e=b.enemies.find(x=>x.key===key);if(e.hp>0)e.vuln+=1;}if(this.has('R30'))this.energy(1);}
   if(b.turnFlags.attacks%3===0){if(this.has('R03'))this.block(6);if(this.has('R16')){this.draw(1);this.energy(1);}}
  }
  if(d.type==='s'){this.block(this.powerSum('W28',4,6));if(!b.turnFlags.skill){b.turnFlags.skill=true;if(this.has('R29'))this.draw(2);if(this.has('R30'))this.energy(1);}}
  b.turnFlags.last=d.type;this.refreshEnemyPhases();this.combatStep({kind:'player',actor:'player',label:d.name+(c.up?'·精进':''),type:d.type});this.checkEnd();return {ok:true};
 }
 resolve(c,e,ctx,selected){
  const b=this.s.b,v=(a,z)=>this.val(c,a,z),h=(n,o={})=>this.hit(e,n,c,ctx,o),g=n=>this.block(n,true,ctx),draw=n=>this.draw(n),retire=()=>this.retireSelected(selected),weak=n=>{if(e.hp>0)e.weak+=n;};
  if(!this.paySelf(c))return;
  switch(c.id){
   case 'W01':h(v(6,9));break;
   case 'W02':h(v(6,8));g(v(4,6));break;
   case 'W03':h(v(8,12));break;
   case 'W04':h(v(7,10));if(ctx.previous==='s')draw(1);break;
   case 'W05':g(v(7,10));break;
   case 'W06':g(v(8,11));draw(1);break;
   case 'W07':h(v(14,18),{str:v(3,4)});break;
   case 'W08':h(v(6,8),{times:2});break;
   case 'W09':h(v(5,7));g(v(5,7));break;
   case 'W10':for(const t of b.enemies)this.hit(t,v(10,14),c,ctx);break;
   case 'W11':h(v(6,9));b.str++;this.log('龙战于野 · 劲力+1');break;
   case 'W12':break;
   case 'W13':b.str+=v(2,3);this.log(`龙象般若功 · 劲力+${v(2,3)}`);break;
   case 'W14':h(v(10,14));break;
   case 'W15':h(v(16,20)+(this.low()?v(8,10):0));break;
   case 'W16':b.str+=v(3,5);b.tempStr+=v(3,5);break;
   case 'W17':for(const t of b.enemies.filter(x=>x.hp>0))t.weak+=v(2,3);break;
   case 'W18':b.repeat=(Number(b.repeat)||0)+1;break;
   case 'W19':h(v(5,7));g(v(7,10));break;
   case 'W20':g(v(6,9)+(e.lastAction?.attacks?3:0));break;
   case 'W21':g(v(5,8));draw(2);break;
   case 'W22':break;
   case 'W23':g(v(18,24));break;
   case 'W24':g(v(7,10));b.reflectNextStacks=this.reflectionStacks('next')+1;b.reflectNext=0;break;
   case 'W25':g(v(12,16));b.reflectRoundStacks=this.reflectionStacks('round')+1;b.reflectPool=0;break;
   case 'W26':g(Math.floor(b.block*v(.5,.75)));break;
   case 'W27':h(b.block,{str:0});break;
   case 'W28':case 'W29':break;
   case 'W30':g(v(9,12));for(const x of b.hand)if(selected.includes(x.uid))x.retain=true;break;
   case 'W31':retire();draw(v(2,3));break;
   case 'W32':{const n=retire();h(v(9,12)+(n?v(6,8):0));break;}
   case 'W33':h(v(8,11)+(b.turnFlags.retired?4:0));weak(v(1,2));break;
   case 'W34':h(v(18,24),{ignore:b.turnFlags.retired>0});break;
   case 'W35':g(retire()*v(6,8));break;
   case 'W36':case 'W37':case 'W38':break;
   case 'W39':{const cards=b.hand.filter(x=>CARD[x.id].type!=='a').map(x=>x.uid);g(this.retireSelected(cards)*v(4,6));break;}
   case 'W40':weak(v(2,3));if(retire())draw(1);break;
   case 'W41':{const ids=b.hand.map(x=>x.uid);const n=this.retireSelected(ids);h(v(5,7),{times:n});break;}
   case 'W42':{const n=retire();draw(n*v(1,2));break;}
   case 'W43':h(v(12,16));break;
   case 'W44':h(v(6,8),{times:3});break;
   case 'W45':b.str+=v(3,4);break;
   case 'W46':h(v(9,12)+(b.turnFlags.self?v(6,8):0));break;
   case 'W47':h(v(4,5),{times:b.turnFlags.self?3:2});break;
   case 'W48':break;
   case 'W49':this.heal(v(6,9),'神照经');break;
   case 'W50':h(v(9,12));break;
   case 'W51':break;
   case 'W52':h(v(8,11));if(b.turnFlags.self)draw(v(1,2));break;
   case 'W53':h(v(3,5)+(this.low()?v(3,4):0));break;
   case 'W54':this.energy(2);break;
   case 'W55':h(v(4,5)+(ctx.previous==='s'?2:0),{times:2});break;
   case 'W56':h(v(4,6));draw(1);this.addStatus(1);break;
   case 'W57':g(v(7,10));draw(1+(ctx.attacks>=2?1:0));break;
   case 'W58':h(v(7,10));b.discount+=1;break;
   case 'W59':h(v(4,5),{times:ctx.paid});break;
   case 'W60':for(const t of b.enemies)this.hit(t,v(4,5),c,ctx,{times:ctx.attacks>=2?3:2});break;
   case 'U01':g(v(5,8));break;
   case 'U02':draw(v(2,3));break;
   case 'U03':b.nextDraw+=v(1,2);break;
   case 'U04':this.energy(v(2,3));break;
   case 'U05':draw(v(1,2));break;
   case 'U06':e.vuln+=v(2,3);draw(1);break;
   case 'U07':for(const t of b.enemies.filter(x=>x.hp>0))t.weak+=v(1,2);break;
   case 'U08':h(v(3,5));weak(1);break;
   case 'U09':e.pin+=v(6,9);break;
   case 'U10':g(v(3,5));break;
   case 'U11':h(v(7,10));if(b.block>=10)draw(1);break;
   case 'U12':h(v(6,9));draw(1);break;
   case 'U13':g(v(5,8));b.nextDraw++;break;
   case 'U14':this.energy(v(1,2));break;
   case 'U15':retire();draw(v(1,2));break;
   case 'U16':for(const x of b.hand)if(selected.includes(x.uid))x.up=true;break;
   case 'U17':for(const x of b.hand)if(selected.includes(x.uid))x.retain=true;break;
   case 'U18':h(v(4,6)+(ctx.plays>=3?v(4,6):0));break;
   case 'U19':e.block=Math.max(0,e.block-v(12,18));h(v(5,8));break;
   case 'U20':g(v(8,11));if(this.low())draw(2);break;
   default:throw new Error(`Unimplemented card ${c.id}`);
  }
 }
 checkEnd(){
  if(this.s.hp<=0){this.s.hp=0;this.s.phase='lost';this.s.finished=Date.now();return true;}
  if(this.s.phase==='battle'&&this.s.b.enemies.every(x=>x.hp<=0)){this.winBattle();return true;}return false;
 }
 beginTurn(first=false){
  const b=this.s.b;b.turn++;this.s.stats.turns++;
  if(this.power('W22')===null)b.block=0;
  b.turnFlags={plays:0,attacks:0,last:null,retired:0,badRetired:0,self:false};b.qiPenalty=Math.min(this.qiMax,b.nextQiLoss||0);b.qi=Math.max(0,this.qiMax-b.qiPenalty);b.nextQiLoss=0;b.discount=0;b.repeat=false;b.reflectNext=0;b.reflectPool=0;b.reflectNextStacks=0;b.reflectRoundStacks=0;
  const strength=this.powerSum('W12',2,3);if(strength){b.str+=strength;this.log(`紫霞神功 · 劲力+${strength}`);}
  if(first){if(this.has('R02'))b.str++;if(this.has('R04'))b.str+=2;if(this.has('R05'))this.block(8);}
  let n=5+b.nextDraw-(this.has('R28')?1:0)-(this.has('R30')?1:0)-(first&&this.has('R29')?2:0)-(first&&this.has('R04')?1:0)-(first&&this.has('R26')?2:0);b.nextDraw=0;this.draw(Math.max(0,n));this.log(`—— 第${b.turn}回合 · ${b.qi}真气 ——`);if(b.qiPenalty)this.log(`寒气压制 · 本回合少${b.qiPenalty}真气`);this.combatStep({kind:'player-start',label:'你的回合'});
 }
 endTurn(){
  if(this.s.phase!=='battle')return false;const b=this.s.b;b.lastEnemyActions=[];
  // Ethereal is a condition at end of turn, not a synonym for Exhaust on play.
  // Resolve newly drawn ethereal cards too; consume before Retain / ordinary discard.
  for(let i=b.hand.findIndex(isEthereal);i>=0;i=b.hand.findIndex(isEthereal)){
   const c=b.hand.splice(i,1)[0];this.log(`虚无触发 · ${CARD[c.id].name}`);this.exhaustCard(c);this.combatStep({kind:'turn-end',label:'虚无消耗'});
   if(this.checkEnd())return true;
  }
  for(const c of b.hand)if(c.id==='CURSE'){this.s.hp-=2;this.log('心魔 · 失去2气血');this.bee();}
  this.combatStep({kind:'turn-end',label:'回合结束'});if(this.checkEnd())return true;
  const held=[];for(const c of b.hand){if(c.retain){delete c.retain;held.push(c);}else b.discard.push(c);}b.hand=held;
  b.str-=b.tempStr;b.tempStr=0;b.weak=Math.max(0,b.weak-1);const oldVuln=b.vuln;
  // Reset enemy block together, so a partner can protect an ally who acts later.
  for(const e of b.enemies)if(e.hp>0)e.block=0;
  this.refreshEnemyPhases();this.combatStep({kind:'enemy-start',label:'敌方回合'});
  // Freeze this round's queue in formation order. Summons wait until the next round.
  for(const e of [...b.enemies]){
   if(e.hp<=0||e.bornTurn===b.turn)continue;if(e.tactics)e.intent=this.enemyIntent(e);const intent=e.intent;let dealt=0,totalDamage=0;this.log(`${e.name} · ${intent.label}`);this.combatStep({kind:'enemy-begin',actor:e.key,label:intent.label,actionView:enemyActionView(this,e)});
   if(intent.block)e.block+=intent.block;
   if(intent.allyBlock)for(const ally of b.enemies.filter(x=>x!==e&&x.hp>0)){ally.block+=intent.allyBlock;this.log(`${e.name} · 为${ally.name}提供${intent.allyBlock}格挡`);}
   if(intent.block||intent.allyBlock)this.combatStep({kind:'enemy-effect',actor:e.key,label:intent.label});
   if(intent.damage){for(let i=0;i<(intent.hits||1);i++){
    if(e.hp<=0||this.s.hp<=0)break;const n=this.previewEnemy(e,i);e.pin=0;
    totalDamage+=n;const blocked=Math.min(b.block,n);b.block-=blocked;const hp=n-blocked;dealt+=hp;this.s.hp-=hp;this.log(`${e.name} → 你 ${n}伤害（格挡抵挡${blocked}）`);this.combatStep({kind:'enemy-hit',actor:e.key,target:'player',label:intent.label,hit:i+1,blocked,damage:hp,actionView:{state:'ready',tags:[enemyAttackTag(e,n)]}});
    const nextReflection=this.reflectionStacks('next');if(nextReflection){this.direct(e,blocked*nextReflection,'乾坤反震',{reactTo:e.key,hit:i+1});b.reflectNextStacks=0;b.reflectNext=0;}
    const roundReflection=this.reflectionStacks('round');if(roundReflection&&blocked)this.direct(e,blocked*roundReflection,'斗转反震',{reactTo:e.key,hit:i+1});
    if(hp>0&&intent.woundOnHit)this.addStatus(intent.woundOnHit);
    if(hp>0&&this.has('R11'))this.direct(e,3,'软猬甲',{reactTo:e.key,hit:i+1});this.bee();if(this.s.hp<=0)break;
   }e.charge=0;}
   if(this.s.hp<=0){this.recordEnemyAction(e,intent,totalDamage);this.combatStep({kind:'enemy',actor:e.key,label:intent.label,attacks:!!intent.damage});this.checkEnd();return true;}
   if(e.hp>0){
    if(intent.weak)b.weak+=intent.weak;if(intent.vuln)b.vuln+=intent.vuln;if(intent.status)this.addStatus(intent.status);if(intent.str)e.str+=intent.str;
    if(intent.poison){b.poison=(b.poison||0)+intent.poison;this.log(`中毒+${intent.poison}`);}
    if(intent.chill){b.nextQiLoss=Math.min(2,(b.nextQiLoss||0)+intent.chill);this.log(`寒气 · 下回合少${intent.chill}真气`);}
    if(intent.charge){e.charge=(e.charge||0)+intent.charge;this.log(`${e.name} · 蓄力+${intent.charge}`);}
    if(intent.leech&&dealt>0){const heal=Math.min(dealt,intent.leech,e.maxHp-e.hp);e.hp+=heal;if(heal)this.log(`${e.name} · 饮血回复${heal}气血`);}
   }
   this.recordEnemyAction(e,intent,totalDamage);afterTacticalAction(this,e,intent,dealt);afterTacticalFollowerAction(this,e);this.combatStep({kind:'enemy',actor:e.key,label:intent.label,attacks:!!intent.damage});
  }
  if(this.checkEnd())return true;
  if(oldVuln>0)b.vuln=Math.max(0,b.vuln-1);
  if((b.poison||0)>0){const poison=b.poison;this.s.hp-=poison;b.poison--;this.log(`毒发 · 失去${poison}气血（剩余中毒${b.poison}）`);this.bee();}
  this.combatStep({kind:'round-end',label:'回合收尾'});if(this.checkEnd())return true;
  for(const e of b.enemies){e.weak=Math.max(0,e.weak-1);e.vuln=Math.max(0,e.vuln-1);e.pin=0;if(e.hp>0){if(e.bornTurn!==b.turn)e.round++;if(e.ruleset===DIFFICULTY&&e.kind==='boss'&&b.turn%4===0){e.str++;this.log(`${e.name} · 久战蓄劲，劲力+1`);}e.intent=this.enemyIntent(e);}}
  if(this.checkEnd())return true;this.beginTurn();return true;
 }
 enemyIntent(e){
  const base=ENEMY[e.id];if(!base)return this.legacyEnemyIntent(e);const d=combatDefinition(base,e.ruleset);
  if(d.enragedMoves&&!e.enraged&&e.hp>0&&e.hp<=e.maxHp/2){e.enraged=true;e.round=0;e.charge=0;this.log(`${e.name} · 进入${d.phaseName||'逆练阶段'}，招式已改变`);}
  const moves=e.enraged?d.enragedMoves:d.moves,intent=clone(moves[e.round%moves.length]);
  // Store tuned numbers in the actual intent: preview and execution share them.
  for(const key of ['damage','leech'])if(intent[key])intent[key]=Math.max(1,Math.round(intent[key]*(e.damageScale??1)));
  for(const key of ['block','allyBlock'])if(intent[key])intent[key]=Math.max(1,Math.round(intent[key]*(e.guardScale??1)));
  return tacticalIntent(this,e,intent);
 }
 refreshEnemyPhases(){for(const e of this.s.b?.enemies||[])if(e.hp>0&&(e.tactics||combatDefinition(ENEMY[e.id]||{},e.ruleset).enragedMoves&&!e.enraged&&e.hp<=e.maxHp/2))e.intent=this.enemyIntent(e);}
 legacyEnemyIntent(e){
  const a=this.chapter;
  const patterns={
   bandit:[{damage:5+a*2,label:'劈砍'},{block:5+a*2,label:'守势'},{damage:7+a*2,label:'重斩'}],
   swordsman:[{damage:4+a,hits:2,label:'连剑'},{damage:5+a,weak:1,label:'扰乱'},{block:7,str:1,label:'蓄势'}],
   elite:[{damage:7+a*2,label:'破阵掌'},{damage:4+a,hits:2,status:1,label:'乱脉连击'},{block:9+a*2,str:1,label:'运劲'}],
   boss:[{damage:8+a*3,label:'试探'},{damage:5+a*2,hits:2,label:'连环攻势'},{block:10+a*3,str:1,label:'凝气护身'},{damage:12+a*4,status:1,label:'绝招 · 震脉'}]
  };return clone(patterns[e.kind][e.round%patterns[e.kind].length]);
 }
 enter(kind){const node=this.availableNodes.find(n=>n.kind===kind);return node?this.enterNode(node.id):false;}
 enterNode(id){
  const node=this.availableNodes.find(n=>n.id===id);if(!node)return false;
  const kind=node.kind;if(this.s.journey)this.s.journey.active=node.id;
  this.s.scene={kind,chapter:this.chapter,step:this.s.step,nodeId:node.id,place:node.name};
  if(['battle','elite','boss'].includes(kind)){this.combat(kind);return true;}
  this.s.phase=kind;
  if(kind==='shop'){
   const hard=this.s.ruleset===DIFFICULTY,stock={cards:this.offerCards(4).map(id=>({id,price:hard?({1:45,2:85,3:165}[CARD[id].rarity]):CARD[id].rarity===3?125:CARD[id].rarity===2?65:40,sold:false})),relic:this.offerRelics(1,[1,2])[0],relicPrice:120,removed:false};
   if(hard){stock.removePrice=60+25*(this.s.shopRemovals||0);stock.relicPrice=stock.relic&&RELIC[stock.relic].tier===2?165:135;}this.s.scene.stock=stock;
  }
  if(kind==='event'){this.s.scene.event=this.pick(this.s.journey?['master','shrine','traveller','cliff','clinic','cache','stone','ferry']:['master','shrine','traveller','cliff']);if(this.s.ruleset===DIFFICULTY)this.s.scene.cliffCost=12+2*this.chapter;}
  if(kind==='treasure'){this.s.scene.relics=this.offerRelics(2,[1,2]);this.s.scene.claimed=null;}
  return true;
 }
 chooseTreasure(id){
  const sc=this.s?.scene;if(this.s?.phase!=='treasure'||sc.claimed)return false;
  if(id==='coins'){this.s.gold+=65;sc.claimed='取走65银两，留待沿途所需。';}
  else{if(!sc.relics.includes(id)||this.has(id))return false;this.s.relics.push(id);sc.claimed=`得到「${RELIC[id].name}」，已随身携带。`;}
  return true;
 }
 combat(kind){
  const a=this.chapter,encounter=ENCOUNTER_GROUPS[a],pool=kind==='elite'?encounter.elite:encounter.normal;
  // The first road can roll a duo; three-person formations enter after it.
  const setup=kind==='boss'?encounter.boss:this.pick(kind==='battle'&&this.chapterStep===0?pool.filter(x=>x.ids.length<=2):pool),ids=setup.ids;
  const normalHp=ids.length===3?[.48,.62,.70][a]:ids.length===2?[.63,.80,.90][a]:1;
  const normalDamage=ids.length===3?[.50,.60,.70][a]:ids.length===2?[.70,.80,.90][a]:1;
  const duplicates=new Map();
  const enemies=ids.map((id,i)=>{
   const d=combatDefinition(ENEMY[id],this.s.ruleset),escort=!!setup.escorts&&i>0,count=(duplicates.get(id)||0);duplicates.set(id,count+1);
   const callSign=ids.filter(x=>x===id).length>1?['甲','乙','丙'][count]:'';
   let hpScale=kind==='battle'?normalHp:escort?(kind==='boss'?.40:.45):1;
   let damageScale=kind==='battle'?normalDamage:escort?(kind==='boss'?.50:.55):1;
   let guardScale=kind==='battle'&&ids.length>1?.75:escort?.60:1;
   let hpBonus=kind==='battle'?Math.round(this.chapterStep/(this.chapterLength-1)*5)*2:0;
   if(this.s.ruleset===DIFFICULTY){const tuned=encounterTuning(a,kind,ids.length,escort,this.chapterStep/(this.chapterLength-1));({hpScale,damageScale,guardScale,hpBonus}=tuned);}
   const hp=Math.max(1,Math.round((d.hp+hpBonus)*hpScale));
   const round=kind==='battle'&&ids.length>1?i%d.moves.length:escort?(i+1)%d.moves.length:0;
   return {...(this.s.ruleset===DIFFICULTY?{ruleset:DIFFICULTY,...(d.phaseName?{phaseName:d.phaseName}:{})}:{}),id,name:d.name+(callSign?'·'+callSign:''),callSign,role:escort?'随从':'',kind:d.rank==='normal'?'bandit':d.rank,hp,maxHp:hp,key:i,round,damageScale,guardScale,block:0,weak:0,vuln:0,str:0,pin:0,charge:0,enraged:false};
  });
  this.s.b={enemies,draw:this.shuffle(this.s.deck.map(x=>clone(x))),hand:[],discard:[],exhaust:[],powers:{},qi:0,str:0,tempStr:0,block:0,weak:0,vuln:0,turn:0,nextDraw:0,repeat:false,discount:0,turnFlags:{},battleFlags:{bandage:0,blood:0},log:[],kind,formation:setup.title};
  if(this.s.ruleset===DIFFICULTY)attachEnemyTactics(this);
  for(const e of enemies){this.encounterRecord(e);e.intent=this.enemyIntent(e);}
  if(this.has('R25'))this.addStatus(2);this.s.phase='battle';this.beginTurn(true);
  if(this.has('R21'))this.s.b.openDart=true;
 }
 useDart(key){const b=this.s.b;if(this.s.phase!=='battle'||!b.openDart)return false;const e=b.enemies.find(x=>x.key===key&&x.hp>0);if(!e)return false;b.openDart=false;this.direct(e,8,'金蛇锥');this.refreshEnemyPhases();this.combatStep({kind:'player',actor:'player',label:'金蛇锥',type:'a'});this.checkEnd();return true;}
 offerCards(n=3,{absolute=false,elite=false}={}){
  const offered=[];
  for(let i=0;i<n;i++){
   let rarity=absolute?3:(()=>{const x=this.random();return x<.65?1:x<.95?2:3;})();if(elite&&i===0)rarity=Math.max(2,rarity);
   const universal=!absolute&&this.random()<.2;
   let pool=CARDS.filter(x=>x.rarity===rarity&&(absolute||x.id.startsWith(universal?'U':'W'))&&!offered.includes(x.id)&&!(x.id==='W22'&&this.s.deck.some(c=>c.id===x.id)));
   if(!pool.length)pool=CARDS.filter(x=>x.rarity===rarity&&!offered.includes(x.id)&&!(x.id==='W22'&&this.s.deck.some(c=>c.id===x.id)));
   if(!pool.length)pool=CARDS.filter(x=>x.rarity>0&&!offered.includes(x.id)&&!(x.id==='W22'&&this.s.deck.some(c=>c.id===x.id)));
   if(!pool.length)break;offered.push(this.pick(pool).id);
  }
  return offered;
 }
 offerRelics(n=1,tiers=[1,2]){const pool=RELICS.filter(x=>tiers.includes(x.tier)&&!this.has(x.id));return this.shuffle(pool).slice(0,n).map(x=>x.id);}
 winBattle(){
  const b=this.s.b;this.s.stats.wins++;if(b.kind==='boss'&&this.s.step===this.totalSteps-1&&!this.s.clearRecord)this.s.clearRecord=createClearRecord(this.s);if(this.has('R01'))this.heal(4,'粗布药囊');this.heal(this.powerSum('W48',3,5),'九阳神功');
  const boss=b.kind==='boss',elite=b.kind==='elite';const gold=boss?65:elite?40:25;this.s.gold+=gold;
  const cards=this.offerCards(3,{absolute:boss,elite});
  this.s.reward={gold,cards,cardDone:false,relics:boss?this.offerRelics(3,[3]):elite?this.offerRelics(1,[1,2]):[],relicDone:!boss&&!elite,boss,elite};
  this.s.phase='reward';this.log(`交锋获胜 · 银两+${gold}`);
 }
 chooseRewardCard(id=null){const r=this.s.reward;if(this.s.phase!=='reward'||r.cardDone||id&&!r.cards.includes(id))return false;if(id)this.s.deck.push(this.make(id));r.cardDone=true;return true;}
 chooseRewardRelic(id=null){const r=this.s.reward;if(this.s.phase!=='reward'||r.relicDone||id&&!r.relics.includes(id))return false;if(id&&!this.has(id))this.s.relics.push(id);r.relicDone=true;return true;}
 leaveReward(){const r=this.s.reward;if(this.s.phase!=='reward'||!r.cardDone||!r.relicDone)return false;if(r.boss)this.heal(Math.floor(this.s.maxHp*.25),'章节整备');this.finishNode();return true;}
 finishNode(){
  if(!['event','shop','rest','reward','treasure'].includes(this.s.phase)||this.s.phase==='event'&&!this.s.scene?.result||this.s.phase==='reward'&&(!this.s.reward?.cardDone||!this.s.reward?.relicDone)||this.s.phase==='treasure'&&!this.s.scene?.claimed)return false;
  const entry={step:this.s.step,kind:this.s.scene?.kind,hp:this.s.hp,deck:this.s.deck.length};
  if(this.s.journey){if(!this.s.journey.active)return false;entry.nodeId=this.s.journey.active;entry.place=this.s.scene.place;this.s.journey.path.push(this.s.journey.active);this.s.journey.active=null;}
  this.s.history.push(entry);this.s.step++;this.s.reward=null;this.s.scene=null;
  if(this.s.step>=this.totalSteps){this.s.phase='win';this.s.finished=Date.now();}else this.s.phase='map';return true;
 }
 rest(action,uid=null){
  if(this.s.phase!=='rest')return false;
  if(action==='heal'){if(this.has('R27'))return false;this.heal(Math.floor(this.s.maxHp*.25),'山间歇脚');}
  else if(action==='upgrade'){const c=this.s.deck.find(x=>x.uid===uid&&!x.up&&!['status','curse'].includes(CARD[x.id].type));if(!c)return false;c.up=true;}
  else if(action!=='leave')return false;this.finishNode();return true;
 }
 buyCard(index){if(this.s.phase!=='shop')return false;const x=this.s.scene.stock.cards[index];if(!x||x.sold||this.s.gold<x.price)return false;this.s.gold-=x.price;x.sold=true;this.s.deck.push(this.make(x.id));return true;}
 buyRelic(){if(this.s.phase!=='shop')return false;const x=this.s.scene.stock;if(!x.relic||x.relicSold||this.s.gold<x.relicPrice||this.has(x.relic))return false;this.s.gold-=x.relicPrice;this.s.relics.push(x.relic);x.relicSold=true;return true;}
 get removalCost(){return this.s?.scene?.stock?.removePrice??60;}
 get cliffCost(){return this.s?.scene?.cliffCost??6;}
 removeCard(uid){if(this.s.phase!=='shop')return false;const x=this.s.scene.stock;const price=this.removalCost;if(x.removed||this.s.gold<price)return false;const i=this.s.deck.findIndex(x=>x.uid===uid);if(i<0)return false;this.s.deck.splice(i,1);this.s.gold-=price;if(this.s.ruleset===DIFFICULTY)this.s.shopRemovals=(this.s.shopRemovals||0)+1;x.removed=true;return true;}
 eventChoice(option){
  if(this.s.phase!=='event'||this.s.scene.result||![0,1,2].includes(option))return false;const e=this.s.scene.event;let message='';
  if(option===2){message='你拱手告辞，继续赶路。';}
  else if(e==='master'){
   if(option===0){const pool=CARDS.filter(d=>d.id.startsWith('W')&&d.rarity>0&&!(d.type==='p'&&this.s.deck.some(c=>c.id===d.id)));if(!pool.length)return false;const id=this.s.ruleset===DIFFICULTY?this.offerCards(1)[0]:this.pick(pool).id;this.s.deck.push(this.make(id));message=`老者点拨，习得「${CARD[id].name}」。`;}
   else {const pool=this.s.deck.filter(c=>!c.up&&CARD[c.id].rarity>0);if(!pool.length)return false;const c=this.pick(pool);c.up=true;message=`融会贯通，「${CARD[c.id].name}」得到永久精进。`;}
  }else if(e==='shrine'){
   if(option===0){const ids=this.offerRelics(1,[1,2]);if(!ids.length)return false;this.s.relics.push(ids[0]);this.s.deck.push(this.make('CURSE'));message=`取得「${RELIC[ids[0]].name}」，心魔悄然入牌。`;}
   else {this.heal(12,'静坐');message='静坐半晌，回复12气血。';}
  }else if(e==='traveller'){
   if(option===0){if(this.s.gold<35)return false;this.s.gold-=35;this.s.maxHp+=8;this.heal(8,'药王传人');message='气血上限增加8，回复8气血。';}
   else{this.s.gold+=35;message='护送旅人，获得35银两。';}
  }else if(e==='cliff'){
   if(option===0){const cost=this.cliffCost;if(this.s.hp<=cost)return false;this.s.hp-=cost;this.bee();const id=this.offerCards(1,{absolute:true})[0];this.s.deck.push(this.make(id));message=`攀上绝壁，失去${cost}气血，发现「${CARD[id].name}」秘籍。`;}
   else {this.s.gold+=25;message='沿山路捡得遗落钱袋，获得25银两。';}
  }
  if(!message&&e==='clinic'){
   if(option===0){if(this.s.gold<25)return false;this.s.gold-=25;this.heal(18,'山野药庐');message='付出25银两，草药汤回复18气血。';}
   else{this.heal(6,'清泉洗尘');message='以清泉洗去风尘，回复6气血。';}
  }else if(!message&&e==='cache'){
   if(option===0){if(this.s.gold<55)return false;const ids=this.offerRelics(1,[1]);if(!ids.length)return false;this.s.gold-=55;this.s.relics.push(ids[0]);message=`花55银两开启旧匣，得到「${RELIC[ids[0]].name}」。`;}
   else{this.s.gold+=20;message='帮老者搬运旧箱，得到20银两。';}
  }else if(!message&&e==='stone'){
   const type=option===0?'a':'s',pool=this.s.deck.filter(c=>!c.up&&CARD[c.id].type===type);
   if(!pool.length)return false;const c=this.pick(pool);c.up=true;message=`参悟残碑，「${CARD[c.id].name}」得到永久精进。`;
  }else if(!message&&e==='ferry'){
   if(option===0){if(this.s.hp<=5)return false;this.s.hp-=5;this.bee();const id=this.offerCards(1,{elite:true})[0];this.s.deck.push(this.make(id));message=`渡口切磋失去5气血，习得「${CARD[id].name}」。`;}
   else{this.s.gold+=20;message='替船家撑篙一程，获得20银两。';}
  }
  if(!message)return false;this.s.scene.result=message;return true;
 }
 // Real rules only: this helper powers the optional one-turn assistance and deterministic QA.
 autoChoices(c){
  const spec=this.selection(c),b=this.s.b;let candidates=[...spec.candidates];
  if(spec.kind==='exhaust'){
   candidates.sort((a,z)=>this.keepScore(a)-this.keepScore(z));
   let attacks=[...b.hand,...b.draw,...b.discard].filter(x=>CARD[x.id].type==='a').length;
   const chosen=[];
   for(const x of candidates){if(chosen.length>=spec.max)break;if(this.keepScore(x)>=7&&chosen.length>=spec.min)continue;if(CARD[x.id].type==='a'){if(attacks<=2)continue;attacks--;}chosen.push(x.uid);}
   // A mandatory single-card conversion can use a defensive card if no low-value choice remains.
   if(chosen.length<spec.min)for(const x of candidates.filter(x=>CARD[x.id].type!=='a'&&!chosen.includes(x.uid))){chosen.push(x.uid);if(chosen.length>=spec.min)break;}
   if(chosen.length<spec.min)return candidates.slice(0,spec.min).map(x=>x.uid);
   return chosen;
  }
  candidates.sort((a,z)=>this.keepScore(z)-this.keepScore(a));return candidates.slice(0,Math.min(spec.max,candidates.length)).map(x=>x.uid);
 }
 keepScore(c){const d=CARD[c.id];return ['status','curse'].includes(d.type)?-5:d.rarity===0?0:d.type==='p'?(c.id==='W22'&&this.power('W22')!==null?-3:12):d.type==='a'?8:5;}
 autoPlayTurn(){
  if(this.s.phase!=='battle')return;const b=this.s.b;if(b.openDart)this.useDart(b.enemies.find(e=>e.hp>0).key);
  for(let n=0;n<50&&this.s.phase==='battle';n++){
   const alive=b.enemies.filter(x=>x.hp>0),threat=alive.reduce((n,e)=>n+(e.lastAction?.damage??(e.kind==='boss'?20:e.kind==='elite'?14:8)),0);
   const pool=b.hand.filter(c=>!this.reason(c));
   if(!pool.length)break;
   const score=c=>{const d=CARD[c.id];let s=d.type==='p'?19:d.type==='a'?12:6;s+=d.rarity;if(d.type==='s'&&b.block<threat)s+=8;if(['U04','U14','W54'].includes(c.id))s+=12;if(c.id==='W16'&&!b.hand.some(x=>CARD[x.id].type==='a'&&!this.reason(x)))s=-10;if(c.id==='W27')s=b.block>=10?24:1;if(c.id==='W49')s=this.s.maxHp-this.s.hp>5?40:-10;if(c.id==='W18'&&!b.hand.some(x=>CARD[x.id].type==='a'&&this.cost(x)<=b.qi-this.cost(c)))s=-10;if(c.id==='W59')s-=3;if(selfCost[c.id]&&this.s.hp<15)s-=15;return s;};
   pool.sort((a,z)=>score(z)-score(a));if(score(pool[0])<0)break;
   const c=pool[0],target=[...alive].sort((a,z)=>a.hp-z.hp)[0];const result=this.play(c.uid,target.key,this.autoChoices(c));if(!result.ok)break;
  }
  if(this.s.phase==='battle')this.endTurn();
 }
 previewEnemy(e,segment=0){
  if(!e.intent.damage)return 0;const b=this.s.b,i=e.intent,vulnerable=b.vuln>0||b.enemies.slice(0,b.enemies.indexOf(e)).some(x=>x.hp>0&&x.intent.vuln>0),combo=i.partner&&b.enemies.some(x=>x.id===i.partner&&x.hp>0)?i.combo||0:0;
  return Math.max(0,Math.floor((i.damage+e.str+(e.charge||0)+combo+Math.max(0,Math.floor((b.turn-10)/2)))*(e.weak>0?.75:1)*(vulnerable?1.5:1))-(this.has('R12')?1:0)-(segment===0?e.pin:0));
 }

}
