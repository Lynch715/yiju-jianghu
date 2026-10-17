// Cosmetic identities only: portraits never change cards, stats, rewards or RNG.
const avatars=[
 {id:'male-qing',title:'青衫剑客',gender:'male',description:'青衫长剑，意气初成。'},
 {id:'male-xuan',title:'玄衣游侠',gender:'male',description:'玄衣披风，独行山河。'},
 {id:'male-bai',title:'白衣少侠',gender:'male',description:'白衣束袖，朗月清风。'},
 {id:'female-qing',title:'青衣女侠',gender:'female',description:'青衣长剑，英姿飒然。'},
 {id:'female-fei',title:'绯衣游侠',gender:'female',description:'绯衣短刀，快意江湖。'},
 {id:'female-bai',title:'白衣剑客',gender:'female',description:'素衣轻剑，清霜照影。'}
];
export const PLAYERS=avatars.map(p=>({...p,art:`assets/players/runtime/${p.id}.png`}));
export const PLAYER=Object.fromEntries(PLAYERS.map(p=>[p.id,p]));
export const DEFAULT_PLAYER=Object.freeze({name:'无名侠客',portrait:'male-qing'});
export function cleanPlayerName(name){return typeof name==='string'?name.normalize('NFKC').trim().replace(/\s+/gu,' '):'';}
export function playerNameError(raw){
 if(typeof raw!=='string')return '请给侠客起一个名字';
 if(/[\p{Cc}\p{Cf}]/u.test(raw))return '名字中不能包含换行或隐藏控制字符';
 const name=cleanPlayerName(raw);if(!name)return '请给侠客起一个名字';
 if(Array.from(name).length>12)return '名字最多12个字';return '';
}
export function validPlayer(p){return !!p&&typeof p.name==='string'&&!playerNameError(p.name)&&p.name===cleanPlayerName(p.name)&&PLAYERS.some(d=>d.id===p.portrait);}

export const PLAYER_RETURN_PHASES=['opening','map','battle','reward','rest','shop','event','win','lost'];
export function validCharacterDraft(c){return !!c&&typeof c.name==='string'&&Array.from(c.name).length<=60&&(c.portrait===null||PLAYERS.some(d=>d.id===c.portrait))&&typeof c.editing==='boolean'&&PLAYER_RETURN_PHASES.includes(c.returnPhase)&&(c.editing||['map','opening'].includes(c.returnPhase));}
