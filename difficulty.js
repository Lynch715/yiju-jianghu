// Rules are attached to a new run and each spawned foe. Existing saves keep
// their announced moves, HP and legacy rules, including after a reload.
export const DIFFICULTY='jianghu-2';
// Captured by new runs and foes, independently of the older boss ruleset.
export const SKIRMISH_REVISION=1;
const skirmish={
 qingcheng:{moves:[{label:'松风剑',damage:5},{label:'摧心掌',damage:6,vuln:1},{label:'回风护剑',damage:2,block:4}]},
 songshan:{moves:[{label:'嵩山剑法',damage:6},{label:'嵩阳架势',damage:2,block:7,brace:true},{label:'大嵩阳掌',damage:9,weak:1,heavyPalm:true}]},
 xingxiu:{moves:[{label:'化功毒爪',damage:4,status:1},{label:'藏毒护身',damage:2,block:5,prepareVenom:2},{label:'三阴毒掌',damage:5,releaseVenom:true}]},
 xuedao:{moves:[{label:'血刀连斩',damage:4,hits:2},{label:'饮血追命',damage:9,leech:4},{label:'回刀护身',damage:3,block:6}]},
 baituo:{moves:[{label:'灵蛇探路',damage:7},{label:'白驼盘蛇',damage:3,block:7,charge:5,coil:16},{label:'蛇行突袭',damage:5,hits:2,poison:1,poisonOnHit:true,releaseCoil:true}]},
 riyue:{moves:[{label:'日月试剑',damage:4,hits:2,probe:true},{label:'破防追剑',damage:11,vuln:1,pursuit:true},{label:'回剑护身',damage:4,block:8}]},
 qingchengguard:{moves:[{label:'横剑护援',damage:2,block:7,allyBlock:6,cover:true},{label:'松风追剑',damage:4,hits:2},{label:'青城截脉',damage:6,weak:1}]},
 shenlong:{moves:[{label:'神龙毒掌',damage:6,poison:1,poisonOnHit:true},{label:'盘龙运劲',damage:3,block:6,focus:2},{label:'连环掌',damage:4,hits:2,releaseFocus:true}]},
 riyueguard:{moves:[{label:'黑木护阵',damage:3,block:9,allyBlock:8,cover:true},{label:'日月连刀',damage:5,hits:2},{label:'截脉刀',damage:8,woundOnHit:1}]}
};
const bosses={
 yucanghai:{hp:145,phaseName:'摧心剑阵',trait:'半血进入摧心剑阵，以格挡蓄劲，破绽接连剑；每4轮劲力+1。先拆门徒，再用虚弱或攻守联动承接重击。',moves:[{label:'松风剑法',damage:7,hits:2},{label:'摧心掌',damage:7,vuln:2},{label:'三峡剑',damage:18},{label:'鹤唳九霄',block:15,str:1}],enragedMoves:[{label:'摧心剑阵',block:16,str:1},{label:'松风三叠',damage:6,hits:3},{label:'摧心追命',damage:18,vuln:1},{label:'青城归元',block:14}]},
 dingchunqiu:{hp:280,phaseName:'毒功尽展',trait:'化功压真气、毒散持续伤血、气滞污染牌组；半血后毒功尽展，每4轮劲力+1。消耗清牌、稳定抽牌与速攻能拆解压制。',moves:[{label:'化功大法',damage:10,status:1,chill:1},{label:'三笑逍遥散',damage:14,poison:3},{label:'星宿护身',block:22,str:2},{label:'腐骨掌',damage:23,status:1}],enragedMoves:[{label:'毒功尽展',block:24,str:2},{label:'连环毒掌',damage:9,hits:2,poison:2},{label:'化功蚀脉',damage:17,chill:1,status:1},{label:'碧磷摧心',damage:27}]},
 ouyangfeng:{hp:480,phaseName:'逆练九阴',trait:'蛤蟆蓄势为下一次攻击每段蓄力+8；半血逆练九阴，每4轮劲力+1。虚弱、多段减伤、格挡反震或成型爆发能应对；久拖会越来越危险。',moves:[{label:'灵蛇杖法',damage:11,hits:2,poison:1},{label:'蛤蟆蓄势',block:26,charge:8},{label:'蛤蟆功',damage:32},{label:'白驼反击',damage:12,block:18}],enragedMoves:[{label:'逆练蛤蟆功',damage:10,hits:2,block:24,str:2,charge:4},{label:'逆转经脉',damage:7,hits:3},{label:'疯魔蛇杖',damage:26,poison:3},{label:'逆练连掌',damage:15,hits:2,status:1}]}
};
export function combatDefinition(base,ruleset,revision){return ruleset===DIFFICULTY?(revision===SKIRMISH_REVISION&&skirmish[base.id]?{...base,...skirmish[base.id]}:bosses[base.id]?{...base,...bosses[base.id]}:base):base;}
export function encounterTuning(chapter,kind,count,escort,progress,revision,level=1){
 if(kind==='boss')return {hpScale:escort?.75:1,damageScale:escort?.85:1,guardScale:escort?.85:1,hpBonus:0};
 if(kind==='elite')return {hpScale:escort?.75:[1.3,1.6,1.8][chapter],damageScale:escort?.8:[1.2,1.5,1.7][chapter],guardScale:escort?.85:1.25,hpBonus:0};
 const hpScale=count===3?[.68,.95,1.12][chapter]:count===2?[.85,1.2,1.45][chapter]:[1.25,1.85,2.3][chapter];
 const damageScale=count===3?[.7,1.05,1.25][chapter]:count===2?[.9,1.25,1.55][chapter]:[1.25,1.8,2.15][chapter];
 const opening=revision===SKIRMISH_REVISION&&chapter===0&&progress===0;
 const pressure=revision===SKIRMISH_REVISION?(1+.04*chapter+.025*Math.max(0,level-1))*(opening?.88:1):1;
 return {hpScale:hpScale*(revision===SKIRMISH_REVISION?(1+.015*Math.max(0,level-1))*(opening?.9:1):1),damageScale:damageScale*(1+.15*progress)*pressure,guardScale:1+.15*chapter,hpBonus:Math.round(progress*7)*2};
}
