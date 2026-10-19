// Appearance preferences are independent of run saves and combat randomness.
export const THEME_STORAGE_KEY='yiju-jianghu-theme-v1';
export const DEFAULT_THEME='dawn';
export const GAME_THEMES=Object.freeze([
 Object.freeze({id:'dawn',name:'丹霞暖玉',description:'暖玉为纸，朱砂点睛。山河明朗，侠气昂扬。',colors:['#fff8eb','#d65336','#b17b21','#28796d'],chrome:'#fff8eb'}),
 Object.freeze({id:'jade',name:'碧水晴岚',description:'云白映碧水，青锋入晴岚。清爽鲜明，自有风骨。',colors:['#effbf7','#13827d','#365da5','#d4a032'],chrome:'#effbf7'}),
 Object.freeze({id:'ink',name:'松烟旧墨',description:'深松绿与旧纸金，保留原有的夜行江湖。',colors:['#151c19','#8e4738','#c4a569','#91ac8e'],chrome:'#171d1b'})
]);
export function gameTheme(id){return GAME_THEMES.find(theme=>theme.id===id)||GAME_THEMES.find(theme=>theme.id===DEFAULT_THEME);}
export function readTheme(storage){try{return gameTheme(storage.getItem(THEME_STORAGE_KEY)).id;}catch{return DEFAULT_THEME;}}
export function storeTheme(storage,id){if(!GAME_THEMES.some(theme=>theme.id===id))return false;try{storage.setItem(THEME_STORAGE_KEY,id);return true;}catch{return false;}}
export function applyTheme(doc,id){const theme=gameTheme(id);doc.documentElement.dataset.theme=theme.id;doc.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme.chrome);return theme.id;}
