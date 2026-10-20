import {CARD} from './data.js?v=0.25.4';
// Each technique has its own composition; duplicate copies keep the same illustration.
const retained={W01:'fist',W03:'sword',W07:'dragon',W19:'taichi',U01:'guard',W05:'footwork',U02:'internal',W52:'finger',W15:'blood',W39:'poison',W60:'staff',W49:'heal',W50:'blade'};
const themes=[['fist','拳掌'],['sword','剑法'],['dragon','降龙掌'],['taichi','太极借势'],['guard','凝气守御'],['footwork','轻功身法'],['internal','内功吐纳'],['finger','指法'],['blood','摧心爪掌'],['poison','吸纳化功'],['staff','棒法'],['heal','调息疗伤'],['blade','刀法'],...Object.values(CARD).filter(c=>!retained[c.id]).map(c=>['tech-'+c.id,c.name])];
export const CARD_ART_THEMES=Object.fromEntries(themes.map(([id,label])=>[id,{id,label,art:`assets/cards/runtime/${id}.webp`}]));
export const CARD_ART=Object.fromEntries(Object.keys(CARD).map(id=>[id,retained[id]||'tech-'+id]));
export function cardArtwork(id){return CARD_ART_THEMES[CARD_ART[id]];}
