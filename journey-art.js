// One lightweight painted header scene per stop; operation icons remain small inline vectors.
const journeySceneSpecs=[
 {
  "id": "shop",
  "name": "行商驿站",
  "label": "山路驿站、布篷摊位与旧物"
 },
 {
  "id": "rest",
  "name": "松间茶亭",
  "label": "松林茶亭与山间茶炉"
 },
 {
  "id": "master",
  "name": "松下高人",
  "label": "古松下的习武石坪"
 },
 {
  "id": "shrine",
  "name": "破庙藏珍",
  "label": "山间古寺与石座灯盏"
 },
 {
  "id": "traveller",
  "name": "行医石桥",
  "label": "石桥边的行医药箱"
 },
 {
  "id": "cliff",
  "name": "绝壁留书",
  "label": "雾中绝壁与石壁古卷"
 },
 {
  "id": "clinic",
  "name": "山野药庐",
  "label": "竹林药庐与药炉草木"
 },
 {
  "id": "cache",
  "name": "行脚旧匣",
  "label": "古道树下的行囊旧匣"
 },
 {
  "id": "stone",
  "name": "残碑悟武",
  "label": "松林残碑与习武石坪"
 },
 {
  "id": "ferry",
  "name": "渡口试手",
  "label": "江岸渡口与乌篷小舟"
 },
 {
  "id": "treasure",
  "name": "洞中遗藏",
  "label": "山洞石台与尘封木匣"
 },
 {
  "id": "reward",
  "name": "交锋有悟",
  "label": "山亭石桌上的武学与佩剑"
 }
];
export const JOURNEY_SCENES=journeySceneSpecs.map(d=>({...d,art:`assets/journey/runtime/${d.id}.webp`}));
const JOURNEY_SCENE=Object.fromEntries(JOURNEY_SCENES.map(d=>[d.id,d]));
export function journeyScene(kind){const scene=JOURNEY_SCENE[kind]||JOURNEY_SCENE.master;return `<img class="journey-scene" src="${scene.art}" width="960" height="640" role="img" aria-label="${scene.label}" alt="" draggable="false" decoding="async" fetchpriority="low">`;}
const icons={
 tea:'<path d="M5 12h12v6q-1 4-6 4t-6-4ZM17 13h2q5 0 3 5h-5M8 8q-3-3 0-6m5 6q-3-3 0-6"/>',
 book:'<path d="M5 3h14v19H5q-4-2 0-4h14M5 3v15m4-9h6m-6 4h5"/>',
 coins:'<ellipse cx="10" cy="7" rx="7" ry="3"/><path d="M3 7v10q7 6 14 0V7M3 12q7 6 14 0m4-2v9q-2 4-6 3"/>',
 remove:'<path d="M4 4h12v17H4Zm4 5h4m-4 4h4m6 0 5 5m-5 0 5-5"/>',
 heal:'<path d="M7 3h10m-8 0v5L4 19q-1 4 8 4t8-4L15 8V3M8 13h8m-4 3v5m-3-2h6"/>',
 chest:'<path d="M3 11h18v11H3Zm0 0V8q9-8 18 0v3M3 15h18m-11-2h4v5h-4Z"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 check:'<path d="m5 12 5 5L21 6"/>',
};
export function journeyIcon(kind){return `<svg class="journey-icon" viewBox="0 0 26 26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[kind]||icons.book}</svg>`;}
