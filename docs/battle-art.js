// One painted scene per chapter. Only the active chapter is added to the battle DOM.
const battleSceneSpecs=[
 {id:'jiangnan',name:'江南烟雨',tone:'jiangnan'},
 {id:'zhongzhou',name:'中州古道',tone:'zhongzhou'},
 {id:'huashan',name:'华山云巅',tone:'huashan'}
];
export const BATTLE_SCENES=battleSceneSpecs.map(d=>({...d,art:`assets/battles/runtime/${d.id}.webp`}));
export function battleBackdrop(chapter){const scene=BATTLE_SCENES[chapter]||BATTLE_SCENES[0];return `<div class="battle-scenery tone-${scene.tone}" data-battle-scene="${scene.name}" aria-hidden="true"><img class="battle-scene-image" src="${scene.art}" alt="" width="960" height="640" draggable="false" decoding="async" fetchpriority="low"></div>`;}
