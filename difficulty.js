// Rules are attached to a new run and each spawned foe. Existing saves keep
// their announced moves, HP and legacy rules, including after a reload.
export const DIFFICULTY='jianghu-2';
const bosses={
 yucanghai:{hp:145,phaseName:'摧心剑阵',trait:'半血进入摧心剑阵，以格挡蓄劲，破绽接连剑；每4轮劲力+1。先拆门徒，再用虚弱或攻守联动承接重击。',moves:[{label:'松风剑法',damage:7,hits:2},{label:'摧心掌',damage:7,vuln:2},{label:'三峡剑',damage:18},{label:'鹤唳九霄',block:15,str:1}],enragedMoves:[{label:'摧心剑阵',block:16,str:1},{label:'松风三叠',damage:6,hits:3},{label:'摧心追命',damage:18,vuln:1},{label:'青城归元',block:14}]},
 dingchunqiu:{hp:280,phaseName:'毒功尽展',trait:'化功压真气、毒散持续伤血、气滞污染牌组；半血后毒功尽展，每4轮劲力+1。消耗清牌、稳定抽牌与速攻能拆解压制。',moves:[{label:'化功大法',damage:10,status:1,chill:1},{label:'三笑逍遥散',damage:14,poison:3},{label:'星宿护身',block:22,str:2},{label:'腐骨掌',damage:23,status:1}],enragedMoves:[{label:'毒功尽展',block:24,str:2},{label:'连环毒掌',damage:9,hits:2,poison:2},{label:'化功蚀脉',damage:17,chill:1,status:1},{label:'碧磷摧心',damage:27}]},
 ouyangfeng:{hp:480,phaseName:'逆练九阴',trait:'蛤蟆蓄势为下一次攻击每段蓄力+8；半血逆练九阴，每4轮劲力+1。虚弱、多段减伤、格挡反震或成型爆发能应对；久拖会越来越危险。',moves:[{label:'灵蛇杖法',damage:11,hits:2,poison:1},{label:'蛤蟆蓄势',block:26,charge:8},{label:'蛤蟆功',damage:32},{label:'白驼反击',damage:12,block:18}],enragedMoves:[{label:'逆练蛤蟆功',damage:10,hits:2,block:24,str:2,charge:4},{label:'逆转经脉',damage:7,hits:3},{label:'疯魔蛇杖',damage:26,poison:3},{label:'逆练连掌',damage:15,hits:2,status:1}]}
};
export function combatDefinition(base,ruleset){return ruleset===DIFFICULTY&&bosses[base.id]?{...base,...bosses[base.id]}:base;}
export function encounterTuning(chapter,kind,count,escort,progress){
 if(kind==='boss')return {hpScale:escort?.75:1,damageScale:escort?.85:1,guardScale:escort?.85:1,hpBonus:0};
 if(kind==='elite')return {hpScale:escort?.75:[1.4,1.6,1.8][chapter],damageScale:escort?.8:[1.3,1.5,1.7][chapter],guardScale:escort?.85:1.25,hpBonus:0};
 const hpScale=count===3?[.68,.85,1][chapter]:count===2?[.85,1.05,1.25][chapter]:[1.25,1.65,2.05][chapter];
 const damageScale=count===3?[.7,.9,1.1][chapter]:count===2?[.9,1.1,1.35][chapter]:[1.25,1.6,1.95][chapter];
 return {hpScale,damageScale,guardScale:1+.15*chapter,hpBonus:Math.round(progress*7)*2};
}
