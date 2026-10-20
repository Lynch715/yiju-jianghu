// Portraits are cosmetic. New-run identities carry a separate, fixed talent.
const avatars=[
 {id:'male-qing',title:'青衫剑客',gender:'male',description:'青衫长剑，意气初成。'},
 {id:'male-xuan',title:'玄衣游侠',gender:'male',description:'玄衣披风，独行山河。'},
 {id:'male-bai',title:'白衣少侠',gender:'male',description:'白衣束袖，朗月清风。'},
 {id:'female-qing',title:'青衣女侠',gender:'female',description:'青衣长剑，英姿飒然。'},
 {id:'female-fei',title:'绯衣游侠',gender:'female',description:'绯衣短刀，快意江湖。'},
 {id:'female-bai',title:'白衣剑客',gender:'female',description:'素衣轻剑，清霜照影。'}
];
export const PLAYERS=avatars.map(p=>({...p,art:`assets/players/runtime/${p.id}.webp`}));
export const PLAYER=Object.fromEntries(PLAYERS.map(p=>[p.id,p]));
export const DEFAULT_PLAYER=Object.freeze({name:'无名侠客',portrait:'male-qing'});
export const TALENTS=[
 {id:'free-sword',name:'独孤悟剑',text:'每回合首次打出技法后，抽1张牌。'},
 {id:'dragon',name:'降龙豪气',text:'每回合每打出3张攻击牌，回复1真气。'},
 {id:'steadfast',name:'侠之大者',text:'每回合首次通过出牌直接获得格挡时，额外获得3格挡。'},
 {id:'wit',name:'玲珑机变',text:'每回合打出第3张牌后，抽1张牌。'},
 {id:'jade',name:'玉女清心',text:'每回合首张攻击牌的首段伤害增加3。'},
 {id:'kindness',name:'襄心向善',text:'每场战斗获胜后，额外回复2气血。'},
 {id:'steady',name:'稳扎稳打',text:'每场战斗首回合，获得6格挡。',common:true},
 {id:'vigor',name:'根骨强健',text:'开局气血上限与当前气血增加8。',common:true},
 {id:'insight',name:'过目不忘',text:'每场战斗首回合，多抽1张牌。',common:true},
 {id:'breath',name:'气脉悠长',text:'每场战斗首回合，多获得1真气。',common:true}
];
export const TALENT=Object.fromEntries(TALENTS.map(t=>[t.id,t]));
export const HEROES=[
 {id:'linghu',name:'令狐冲',gender:'male',portrait:'male-qing',talent:'free-sword',description:'洒脱不羁，悟剑于无招之间。'},
 {id:'qiao',name:'乔峰',gender:'male',portrait:'male-xuan',talent:'dragon',description:'豪气干云，以连招催动掌势。'},
 {id:'guojing',name:'郭靖',gender:'male',portrait:'male-bai',talent:'steadfast',description:'笃实守正，进退之间护己安人。'},
 {id:'huangrong',name:'黄蓉',gender:'female',portrait:'female-qing',talent:'wit',description:'聪慧灵动，数招之间另生机变。'},
 {id:'long',name:'小龙女',gender:'female',portrait:'female-bai',talent:'jade',description:'清心凝神，出手便见锋芒。'},
 {id:'guoxiang',name:'郭襄',gender:'female',portrait:'female-fei',talent:'kindness',description:'明秀率真，心怀善意行走江湖。'}
].map(h=>({...h,art:`assets/heroes/runtime/${h.id}.webp`}));
export const HERO=Object.fromEntries(HEROES.map(h=>[h.id,h]));
// Keep saved cosmetic IDs stable; a named hero's original appearance now resolves
// to dedicated art. Deliberate costume changes still use the chosen custom art.
export function playerArtwork(profile){const hero=HEROES.find(h=>h.id===profile?.hero&&h.portrait===profile.portrait);return hero?{...hero,title:hero.name}:PLAYERS.find(p=>p.id===profile?.portrait)||PLAYER[DEFAULT_PLAYER.portrait];}
export function playerTalent(p){return TALENTS.find(t=>t.id===p?.talent)||null;}
export function validPlayerTalent(p){
 if(p.hero===undefined&&p.talent===undefined)return true; // Old saves gain no retroactive talent.
 if(p.hero==='custom')return TALENTS.some(t=>t.common&&t.id===p.talent);
 return HEROES.some(h=>h.id===p.hero&&h.talent===p.talent);
}
export function cleanPlayerName(name){return typeof name==='string'?name.normalize('NFKC').trim().replace(/\s+/gu,' '):'';}
export function playerNameError(raw){
 if(typeof raw!=='string')return '请给侠客起一个名字';
 if(/[\p{Cc}\p{Cf}]/u.test(raw))return '名字中不能包含换行或隐藏控制字符';
 const name=cleanPlayerName(raw);if(!name)return '请给侠客起一个名字';
 if(Array.from(name).length>12)return '名字最多12个字';return '';
}
export function validPlayer(p){return !!p&&typeof p.name==='string'&&!playerNameError(p.name)&&p.name===cleanPlayerName(p.name)&&PLAYERS.some(d=>d.id===p.portrait)&&validPlayerTalent(p);}

export const PLAYER_RETURN_PHASES=['opening','map','battle','reward','rest','shop','event','treasure','win','lost'];
export function validCharacterDraft(c){return !!c&&typeof c.name==='string'&&Array.from(c.name).length<=60&&(c.portrait===null||PLAYERS.some(d=>d.id===c.portrait))&&typeof c.editing==='boolean'&&PLAYER_RETURN_PHASES.includes(c.returnPhase)&&(c.editing||['map','opening'].includes(c.returnPhase))&&(c.challengeRevision===undefined||c.challengeRevision===1)&&validPlayerTalent(c);}
