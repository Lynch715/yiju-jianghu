import {CARD} from './data.js?v=0.25.1';
import {ENEMY} from './enemies.js?v=0.25.1';
import {DIFFICULTY,SKIRMISH_REVISION,CHALLENGE_REVISION,talentChallenge} from './difficulty.js?v=0.25.1';
// Original battle adaptations. The rule object is captured on each newly spawned
// enemy; existing battles without it keep their existing behaviour.
const TACTIC_IDS=new Set(['mugaofeng','tianboguang','xuedaolaozu','hebiweng','luzhangke','chengkun','jinlun','yucanghai','dingchunqiu','ouyangfeng','dingmian','azi','jiumozhi','zuolengchan','renwoxing','dongfangbubai']);
export function attachEnemyTactics(game){
 const b=game.s.b;for(const e of b.enemies)if(TACTIC_IDS.has(e.id))e.tactics={kind:e.id,...(e.id==='yucanghai'?{sword:0}:{})};
 for(const e of b.enemies)if(e.skirmishRevision===SKIRMISH_REVISION)e.tactics={kind:e.id,skirmish:true,sword:0,venom:0,frenzy:0,pressure:0};
 // Capture the revision on spawn. Never retrofit an ongoing saved battle.
 for(const e of b.enemies)if(e.ruleset===DIFFICULTY&&e.kind==='boss'){
  e.tactics.revision=2;const extra={yucanghai:10,dingchunqiu:20,ouyangfeng:20}[e.id]||0;e.hp+=extra;e.maxHp+=extra;
 }
 if(b.enemies.some(e=>e.id==='dingchunqiu'))for(const e of b.enemies)if(e.id==='xingxiu'){e.tactics={kind:'poisonDisciple',actions:0};e.summoned=true;e.role='毒徒';}
}
const scaled=(e,n)=>Math.max(1,Math.round(n*(e.damageScale??1)));
export function tacticalIntent(game,e,intent){
 const t=e.tactics;if(!t)return intent;const b=game.s.b;
 if(t.skirmish)return skirmishIntent(game,e,intent);
 if(t.kind==='dingmian'&&t.broken)return {label:'托塔气墙被破'};
 if(t.kind==='azi'&&intent.poison)intent.poison+=(t.bags||0);
 if(t.kind==='jiumozhi'&&intent.damage){if(t.lastType==='s')intent.damage+=scaled(e,3);if(t.lastType==='a')intent.weak=(intent.weak||0)+1;}
 if(t.kind==='jiumozhi'&&intent.label==='小无相功'&&t.lastType==='p'){intent.str=1;intent.block+=8;}
 if(t.kind==='dongfangbubai'&&intent.damage&&t.needles>0){intent.hits=(intent.hits||1)+t.needles;}
 if(t.kind==='mugaofeng'&&t.counterReady)return {label:'伏刀反扑',damage:scaled(e,12),vuln:1};
 if(t.kind==='tianboguang'){if(intent.label==='快刀三叠')intent.hits+=Math.floor(e.round/ENEMY[e.id].moves.length);if(intent.damage)intent.woundOnHit=1;}
 if(t.kind==='xuedaolaozu'&&intent.damage){delete intent.leech;intent.drainRatio=.5;}
 if(['hebiweng','luzhangke'].includes(t.kind)){
  if(t.revengePending){t.revengePending=false;t.revengeReady=true;e.str+=2;e.vuln+=2;game.log(`${e.name} · 亡友失衡，破绽+2、劲力+2`);}
  if(t.revengeReady)return {label:'孤掌追魂',damage:scaled(e,18)};
  if(intent.partner&&b.enemies.some(x=>x.id===intent.partner&&x.hp>0))intent.chill=(intent.chill||0)+1;
 }
 if(t.kind==='chengkun'){
  if(t.mines>0&&t.fuse===1)return {label:'混元暗雷爆发',damage:t.mines*10,detonate:true};
  if(intent.label==='阴谋扰心')intent.plantMines=3;
 }
 if(t.kind==='jinlun'){
  if(t.broken)return {label:'龙象蓄力被破'};
  if(intent.label==='龙象蓄力')intent.windup=24;
  if(t.windup>0&&intent.label==='金轮重击')intent.damage*=2;
 }
 if(t.kind==='yucanghai'&&['三峡剑','摧心追命'].includes(intent.label))intent.damage+=3*(t.sword||0);
 if(t.kind==='yucanghai'&&t.revision===2&&['鹤唳九霄','青城归元'].includes(intent.label))intent.damage=scaled(e,4);
 if(t.kind==='dingchunqiu'){
  if(intent.poison)intent.poison+=Math.floor(b.enemies.filter(x=>x.hp>0&&x.tactics?.kind==='poisonDisciple').length/2);
  if(['星宿护身','毒功尽展'].includes(intent.label))intent.summonPoison=true;
  if(t.revision===2&&intent.summonPoison)intent.damage=scaled(e,6);
 }
 if(t.kind==='poisonDisciple'&&t.actions>=2)return {label:'献毒自爆',damage:scaled(e,12),poison:1,selfDestruct:true};
 if(t.kind==='ouyangfeng'){
  if(e.enraged&&!t.seenEnraged){t.seenEnraged=true;e.weak=0;e.vuln=0;t.windup=0;t.broken=false;game.log(`${e.name} · 逆练换息，清除自身虚弱与破绽`);}
  if(t.broken)return {label:'蛤蟆功蓄力被破'};
  if(intent.charge){intent.windup=t.revision===2?(e.enraged?110:100):90;if(t.revision===2&&!intent.damage)intent.damage=scaled(e,6);}
  if(t.revision===2&&t.windup>0&&intent.damage&&!intent.charge)intent.releaseCharge=true;
  if(t.revision===2&&e.enraged&&intent.label==='疯魔蛇杖')intent.block=(intent.block||0)+8;
 }
 return intent;
}
export function onTacticalDamage(game,e,hpDamage,totalDamage){
 const t=e.tactics;if(!t||e.hp<=0)return;
 if(t.skirmish){onSkirmishDamage(game,e,hpDamage,totalDamage);return;}
 if(t.kind==='dingmian'&&t.ward&&e.block===0&&totalDamage>0&&!t.broken){t.broken=true;t.ward=false;game.log(`${e.name} · 托塔气墙崩散`);}
 if(t.kind==='azi'&&t.bags>0&&hpDamage>0){t.bagDamage=(t.bagDamage||0)+hpDamage;const n=Math.min(t.bags,Math.floor(t.bagDamage/15));if(n){t.bags-=n;t.bagDamage%=15;game.log(`${e.name} · 毒囊破损${n}层`);}}
 if(t.kind==='zuolengchan'&&e.charge>0&&hpDamage>0){t.thaw=(t.thaw||0)+hpDamage;const n=Math.min(e.charge,Math.floor(t.thaw/8));if(n){e.charge-=n;t.thaw%=8;game.log(`${e.name} · 寒劲受挫，蓄力−${n}`);}}
 if(t.kind==='renwoxing'&&t.stolen>0&&hpDamage>0){t.returnDamage=(t.returnDamage||0)+hpDamage;const n=Math.min(t.stolen,Math.floor(t.returnDamage/28));if(n){t.stolen-=n;t.returnDamage%=28;game.s.b.str+=n;e.str-=n;game.log(`${e.name} · 吸星失衡，归还劲力${n}`);}}
 if(t.kind==='mugaofeng'&&hpDamage>0){t.wounds=(t.wounds||0)+hpDamage;if(t.wounds>=18&&!t.counterReady){t.wounds%=18;t.counterReady=true;e.str++;game.log(`${e.name} · 衣袍染血，劲力+1`);}}
 if(t.kind==='chengkun'&&t.mines>0&&hpDamage>0){t.disarm=(t.disarm||0)+hpDamage;const layers=Math.floor(t.disarm/12);if(layers){t.disarm%=12;disarmMines(game,e,layers);}}
 if(['jinlun','ouyangfeng'].includes(t.kind)&&t.windup>0&&totalDamage>0){t.windup=Math.max(0,t.windup-totalDamage);if(t.windup===0){t.broken=true;e.charge=0;if(t.kind==='ouyangfeng')e.vuln+=2;game.log(`${e.name} · 架势崩散，踉跄失衡`);}}
 if(t.kind==='ouyangfeng'&&t.revision===2&&t.windup>0&&totalDamage>0){
  t.pressureDamage=(t.pressureDamage||0)+totalDamage;const steps=Math.floor(t.pressureDamage/25);t.pressureDamage%=25;
  const n=Math.min(e.charge||0,steps);if(n){e.charge-=n;game.log(`${e.name} · 劲道受挫，蓄力−${n}`);}
 }
}
function disarmMines(game,e,n){const t=e.tactics,removed=Math.min(t.mines,n);t.mines-=removed;if(t.mines===0){t.fuse=0;t.disarm=0;}game.log(`拆除混元暗雷${removed}层 · 剩余${t.mines}层`);}
export function onTacticalExhaust(game,card){
 for(const e of game.s.b.enemies.filter(e=>e.hp>0)){
  if(e.tactics?.skirmish&&e.id==='xingxiu'&&e.tactics.venom>0&&['status','curse'].includes(CARD[card.id].type)){e.tactics.venom--;game.log(`${e.name} · 消耗毒滞，备毒−1`);}
  if(e.tactics?.kind==='azi'&&e.tactics.bags>0&&['status','curse'].includes(CARD[card.id].type)){e.tactics.bags--;game.log(`${e.name} · 毒囊散去1层`);}
  if(e.tactics?.kind==='chengkun'&&e.tactics.mines>0)disarmMines(game,e,1);
  if(e.tactics?.kind==='dingchunqiu'&&['status','curse'].includes(CARD[card.id].type)){const b=game.s.b,n=Math.min(2,b.poison||0);b.poison=(b.poison||0)-n;if(n)game.log(`清除毒滞 · 中毒−${n}`);}
 }
}
export function onTacticalPlay(game,card){const type=CARD[card.id].type;for(const e of game.s.b.enemies){if(e.hp<=0||!e.tactics)continue;const t=e.tactics;
 if(t.kind==='jiumozhi')t.lastType=type;
 if(t.kind==='dongfangbubai'){t.plays=(t.plays||0)+1;if(t.plays%6===0){t.needles=(t.needles||0)+1;game.log(`${e.name} · 针势+1`);}}
 if(type==='a'&&t.kind==='ouyangfeng'&&t.windup>0){e.charge=(e.charge||0)+1;game.log(`${e.name} · 逆劲应招，蓄力+1`);}
}}
export function onTacticalDeath(game,e){
 const b=game.s.b;
 if(e.tactics?.kind==='renwoxing'&&e.tactics.stolen>0){b.str+=e.tactics.stolen;e.tactics.stolen=0;}
 if(['hebiweng','luzhangke'].includes(e.tactics?.kind))for(const x of b.enemies)if(x!==e&&x.hp>0&&['hebiweng','luzhangke'].includes(x.tactics?.kind)&&!x.tactics.partnerFallen){x.tactics.partnerFallen=true;x.tactics.revengePending=true;}
 if(e.id==='qingcheng')for(const x of b.enemies)if(x.hp>0&&x.tactics?.kind==='yucanghai'){x.tactics.sword=0;x.vuln+=2;game.log('青城剑阵被破 · 余沧海破绽+2');}
 if(e.tactics?.kind==='poisonDisciple')for(const x of b.enemies)if(x.hp>0&&x.tactics?.kind==='dingchunqiu'&&x.tactics.revision===2){
  const n=Math.min(2,b.poison||0);b.poison=(b.poison||0)-n;x.vuln++;game.log(`${x.name} · 毒阵失衡，破绽+1${n?`，中毒−${n}`:''}`);
 }
 if(e.tactics?.kind==='dingchunqiu')for(const x of b.enemies)if(x.hp>0&&x.tactics?.kind==='poisonDisciple'){x.hp=0;x.dead=true;game.log(`${x.name} · 老仙已败，毒徒逃散`);}
}
function summonPoisonDisciple(game,boss){
 const b=game.s.b;if(b.enemies.filter(e=>e.hp>0&&e.tactics?.kind==='poisonDisciple').length>=2)return;
 const challenge=boss.challengeRevision===CHALLENGE_REVISION?talentChallenge(game.chapter,'boss',game.chapterStep,game.s.expedition?.level||1):null;
 const key=Math.max(...b.enemies.map(e=>e.key))+1,d=ENEMY.xingxiu,hp=Math.round(d.hp*.75*(challenge?.hpScale||1)),e={...(challenge?{challengeRevision:CHALLENGE_REVISION}:{}),id:d.id,name:`星宿毒徒·${key+1}`,callSign:String(key+1),role:'毒徒',kind:'bandit',hp,maxHp:hp,key,round:0,damageScale:.85*(challenge?.damageScale||1),guardScale:.85*(challenge?.guardScale||1),block:0,weak:0,vuln:0,str:0,pin:0,charge:0,enraged:false,ruleset:boss.ruleset,summoned:true,bornTurn:b.turn,tactics:{kind:'poisonDisciple',actions:0}};
 const empty=b.enemies.findIndex(x=>x.hp<=0);if(empty>=0)b.enemies[empty]=e;else if(b.enemies.length<3)b.enemies.push(e);else return;e.intent=game.enemyIntent(e);game.log(`丁春秋 · 召来${e.name}`);
}
export function afterTacticalAction(game,e,intent,dealt){
 const t=e.tactics,b=game.s.b;if(!t||e.hp<=0)return;
 if(t.skirmish){afterSkirmishAction(game,e,intent,dealt);return;}
 if(t.kind==='dingmian'){if(t.broken){t.broken=false;}else if(intent.label==='托塔护阵')t.ward=true;else t.ward=false;}
 if(t.kind==='azi'&&intent.poisonBags){t.bags=(t.bags||0)+intent.poisonBags;t.bagDamage=0;game.log(`${e.name} · 备下毒囊${t.bags}层`);}
 if(t.kind==='renwoxing'&&intent.stealStrength){const n=Math.min(intent.stealStrength,Math.max(0,b.str));if(n){b.str-=n;e.str+=n;t.stolen=(t.stolen||0)+n;game.log(`${e.name} · 吸取劲力${n}`);}}
 if(t.kind==='dongfangbubai'&&intent.damage)t.needles=0;
 if(t.kind==='mugaofeng'&&intent.label==='伏刀反扑')t.counterReady=false;
 if(t.kind==='xuedaolaozu'&&intent.drainRatio&&dealt>0){const n=Math.min(Math.floor(dealt*intent.drainRatio),e.maxHp-e.hp);if(n>0){e.hp+=n;e.str++;game.log(`${e.name} · 饮血回复${n}气血，劲力+1`);}}
 if(t.revengeReady&&intent.label==='孤掌追魂')t.revengeReady=false;
 if(t.kind==='chengkun'){if(intent.detonate){t.mines=0;t.fuse=0;t.disarm=0;}else if(intent.plantMines){t.mines=intent.plantMines;t.fuse=2;t.disarm=0;game.log('成昆 · 布下混元暗雷');}else if(t.mines>0)t.fuse--;}
 if(['jinlun','ouyangfeng'].includes(t.kind)){if(intent.windup){t.windup=intent.windup;t.broken=false;if(t.revision===2)t.pressureDamage=0;}else if(t.broken||intent.damage){t.windup=0;t.broken=false;}}
 if(t.kind==='yucanghai'&&['三峡剑','摧心追命'].includes(intent.label))t.sword=0;
 if(t.kind==='yucanghai'&&t.revision===2&&['鹤唳九霄','青城归元'].includes(intent.label)){t.sword=(t.sword||0)+1;game.log(`${e.name} · 松风回旋，剑势${t.sword}`);}
 if(t.kind==='ouyangfeng'&&t.revision===2&&intent.releaseCharge){e.block+=e.enraged?12:8;game.log(`${e.name} · 收势归元，格挡+${e.enraged?12:8}`);}
 if(t.kind==='dingchunqiu'&&intent.summonPoison)summonPoisonDisciple(game,e);
 if(t.kind==='poisonDisciple'){
  t.actions++;for(const boss of b.enemies)if(boss.hp>0&&boss.tactics?.kind==='dingchunqiu'&&boss.tactics.revision===2){
   if(intent.selfDestruct){const n=Math.min(12,boss.maxHp-boss.hp);boss.hp+=n;boss.str++;game.log(`${boss.name} · 纳毒归元，回复${n}气血、劲力+1`);}
   else{boss.block+=4;game.log(`${boss.name} · 毒徒护持，格挡+4`);}
  }
  if(intent.selfDestruct){e.hp=0;e.dead=true;game.log(`${e.name} · 献毒后消散`);}
 }
}
export function afterTacticalFollowerAction(game,e){if(e.id==='qingcheng'&&e.hp>0)for(const boss of game.s.b.enemies)if(boss.hp>0&&boss.tactics?.kind==='yucanghai'){boss.tactics.sword=(boss.tactics.sword||0)+1;game.log(`青城门徒助阵 · 剑势${boss.tactics.sword}`);}}

// Pure derivation: changing a visible action never consumes counters or RNG.
function skirmishIntent(game,e,intent){
 const t=e.tactics;
 if(e.id==='qingcheng'&&intent.damage)intent.damage+=scaledBonus(e,2*t.sword);
 if(e.id==='songshan'&&intent.heavyPalm){
  if(t.braced)intent.damage+=scaled(e,4);
  if(t.staggered){intent.damage=scaled(e,6);delete intent.weak;}
 }
 if(intent.releaseVenom)intent.poison=t.venom;
 if(e.id==='xuedao'&&intent.damage)intent.damage+=scaledBonus(e,2*t.frenzy);
 if(intent.releaseCoil&&t.coilBroken)delete intent.poison;
 if(intent.pursuit&&t.opening)intent.damage+=scaled(e,5);
 if(intent.releaseFocus&&t.focus>0){if(!e.weak&&!e.pin)intent.damage+=scaled(e,t.focus);else intent.focusSuppressed=true;}
 if(intent.cover){
  if(t.coverBroken){delete intent.allyBlock;intent.block=Math.ceil(intent.block/2);}
  if(!game.s.b.enemies.some(x=>x!==e&&x.hp>0)){delete intent.allyBlock;intent.block=Math.ceil(intent.block/2);intent.damage=scaled(e,e.id==='qingchengguard'?6:8);intent.label=e.id==='qingchengguard'?'孤剑突围':'孤刀突围';}
 }
 return intent;
}
const scaledBonus=(e,n)=>n?scaled(e,n):0;
export const coverThreshold=e=>e.id==='qingchengguard'?8:16;
function onSkirmishDamage(game,e,hpDamage,totalDamage){
 const t=e.tactics;
 if(e.id==='qingcheng'&&t.sword>0&&hpDamage>0){
  t.pressure+=hpDamage;const n=Math.min(t.sword,Math.floor(t.pressure/6));
  if(n){t.sword-=n;t.pressure=t.sword?t.pressure%6:0;game.log(`${e.name} · 松风剑势受挫，剑势−${n}`);}
 }
 if(e.id==='songshan'&&t.braced&&e.block===0&&totalDamage>0){t.braced=false;t.staggered=true;game.log(`${e.name} · 嵩阳架势被破，重掌削弱`);}
 if(e.id==='xingxiu'&&t.venom>0&&hpDamage>0){
  t.pressure+=hpDamage;const n=Math.min(t.venom,Math.floor(t.pressure/8));
  if(n){t.venom-=n;t.pressure=t.venom?t.pressure%8:0;game.log(`${e.name} · 毒囊被拆，备毒−${n}`);}
 }
 if(e.id==='baituo'&&t.coil>0&&totalDamage>0){
  t.coil=Math.max(0,t.coil-totalDamage);t.pressure+=totalDamage;
  const n=Math.min(e.charge,Math.floor(t.pressure/4));if(n){e.charge-=n;t.pressure%=4;game.log(`${e.name} · 盘蛇受压，蓄力−${n}`);}
  if(t.coil===0){e.charge=0;t.coilBroken=true;game.log(`${e.name} · 盘蛇架势被破，毒劲散去`);}
 }
 if(['qingchengguard','riyueguard'].includes(e.id)&&!t.coverBroken&&totalDamage>0){
  t.pressure+=totalDamage;if(t.pressure>=coverThreshold(e)){t.coverBroken=true;game.log(`${e.name} · 护援被截断`);}
 }
}
function afterSkirmishAction(game,e,intent,dealt){
 const t=e.tactics;
 if(e.id==='qingcheng'&&intent.damage){t.sword=Math.min(3,t.sword+1);t.pressure=0;game.log(`${e.name} · 松风连势，剑势${t.sword}`);}
 if(e.id==='songshan'){if(intent.brace){t.braced=true;t.staggered=false;game.log(`${e.name} · 嵩阳架势已立`);}else if(intent.heavyPalm){t.braced=false;t.staggered=false;}}
 if(intent.prepareVenom){t.venom=intent.prepareVenom;t.pressure=0;game.log(`${e.name} · 备毒${t.venom}`);}
 if(intent.releaseVenom){t.venom=0;t.pressure=0;}
 if(e.id==='xuedao'&&intent.damage){t.frenzy=dealt>0?Math.min(3,t.frenzy+1):0;game.log(`${e.name} · ${t.frenzy?'血势'+t.frenzy:'刀势被完整格挡，血势散去'}`);}
 if(intent.coil){t.coil=intent.coil;t.coilBroken=false;t.pressure=0;game.log(`${e.name} · 盘蛇架势已立`);}
 if(intent.releaseCoil){t.coil=0;t.coilBroken=false;t.pressure=0;}
 if(intent.probe){t.opening=dealt>0;if(t.opening)game.log(`${e.name} · 试剑得隙，追剑增强`);}
 if(intent.pursuit)t.opening=false;
 if(intent.focus){t.focus=intent.focus;game.log(`${e.name} · 运劲${t.focus}`);}
 if(intent.releaseFocus){if(intent.focusSuppressed)game.log(`${e.name} · 运劲受制`);t.focus=0;}
 if(['qingchengguard','riyueguard'].includes(e.id)){t.coverBroken=false;t.pressure=0;}
}
