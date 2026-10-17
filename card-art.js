// Original thematic illustrations are shared by related techniques to keep mobile downloads small.
export const CARD_ART_THEMES=Object.fromEntries([
 ['fist','拳掌'],['sword','剑法'],['dragon','降龙掌'],['taichi','太极借势'],
 ['guard','凝气守御'],['footwork','轻功身法'],['internal','内功吐纳'],['finger','指法'],
 ['blood','摧心爪掌'],['poison','吸纳化功'],['staff','棒法'],['heal','调息疗伤'],['blade','刀法']
].map(([id,label])=>[id,{id,label,art:`assets/cards/runtime/${id}.webp`}]));
const cardArtGroups={
 fist:'W01 W02 W14 W17 W18 W43 W44 U07 U08 U11 U12 U18 U19',
 sword:'W03 W04 W27 W31 W32 W33 W34 W41 W55 W56',
 dragon:'W07 W08 W09 W10 W11 W13 W58',
 taichi:'W19 W20 W21 W24 W25 W26 W35',
 guard:'W22 W23 U01 U13 U20',
 footwork:'W05 W06 W30 W57 U10 U17',
 internal:'W12 W16 W28 W29 W36 W37 W38 W42 W45 W48 W51 W54 U02 U03 U04 U05 U15 U16 QI',
 finger:'W52 W53 W59 U06 U09',
 blood:'W15 W46 W47 U14 CURSE',
 poison:'W39 W40',staff:'W60',heal:'W49',blade:'W50'
};
export const CARD_ART=Object.fromEntries(Object.entries(cardArtGroups).flatMap(([theme,ids])=>ids.split(' ').map(id=>[id,theme])));
export function cardArtwork(id){return CARD_ART_THEMES[CARD_ART[id]];}
