import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GAME_VERSION,CARDS,CARD,RELICS,describe,OPENING_BOONS} from './data.js';
import {ENEMIES} from './enemies.js';
import {PLAYERS} from './players.js';
import {CARD_ART_THEMES} from './card-art.js';
import {BATTLE_SCENES} from './battle-art.js';
import {JOURNEY_SCENES} from './journey-art.js';
const files=['data.js','journey.js','map-art.js','journey-art.js','battle-art.js','journey-ui.js','card-art.js','relic-art.js','enemies.js','difficulty.js','expedition.js','players.js','enemy-tactics.js','enemy-action.js','records.js','engine.js','card-preview.js','combat-ui.js','hand-gesture.js','themes.js','app.js'];
const source=await Promise.all(files.map(f=>readFile(new URL(f,import.meta.url),'utf8')));
// Check actual displayed descriptions in both refinement states, not just raw source text.
const visibleText=[source.at(-1),...PLAYERS.flatMap(p=>[p.title,p.description]),...ENEMIES.flatMap(d=>[d.name,d.faction,d.trait,...d.moves.map(i=>i.label),...(d.enragedMoves||[]).map(i=>i.label)]),...OPENING_BOONS.flatMap(d=>[d.title,d.text]),...CARDS.flatMap(d=>[d.name,d.source,d.path,describe({id:d.id,up:false}),describe({id:d.id,up:true})]),...['QI','CURSE'].map(id=>describe({id})),...RELICS.flatMap(r=>[r.name,r.source,r.text])];
if(visibleText.some(text=>/\p{Extended_Pictographic}|\uFE0F/u.test(text)))throw Error('Release blocked: emoji remains in visible game text');
if(visibleText.some(text=>/暂退|护体|忘却|基础守势/.test(text)))throw Error('Release blocked: obsolete terminology remains in visible game text');
const portraits={};
for(const d of ENEMIES){const image=await readFile(new URL(d.art,import.meta.url));if(!image.length)throw Error('Missing portrait: '+d.id);portraits[d.id]='data:image/webp;base64,'+image.toString('base64');}
const playerImages={};
for(const p of PLAYERS){const image=await readFile(new URL(p.art,import.meta.url));if(!image.length)throw Error('Missing player portrait: '+p.id);playerImages[p.id]='data:image/webp;base64,'+image.toString('base64');}
const cardImages={};
for(const theme of Object.values(CARD_ART_THEMES)){const image=await readFile(new URL(theme.art,import.meta.url));cardImages[theme.id]='data:image/webp;base64,'+image.toString('base64');}
const battleImages={};
for(const scene of BATTLE_SCENES){const image=await readFile(new URL(scene.art,import.meta.url));if(!image.length)throw Error('Missing battle scene: '+scene.id);battleImages[scene.id]='data:image/webp;base64,'+image.toString('base64');}
const journeyImages={};
for(const scene of JOURNEY_SCENES){const image=await readFile(new URL(scene.art,import.meta.url));if(!image.length)throw Error('Missing journey scene: '+scene.id);journeyImages[scene.id]='data:image/webp;base64,'+image.toString('base64');}
const script='const JOURNEY_IMAGE_DATA='+JSON.stringify(journeyImages)+';\n'+'const BATTLE_IMAGE_DATA='+JSON.stringify(battleImages)+';\n'+'const CARD_IMAGE_DATA='+JSON.stringify(cardImages)+';\n'+'const PLAYER_IMAGE_DATA='+JSON.stringify(playerImages)+';\n'+'const ENEMY_IMAGE_DATA='+JSON.stringify(portraits)+';\n'+source.map((s,i)=>`// ---- ${files[i]} ----\n`+s.replace('art:`assets/enemies/runtime/${d.id}.webp`','art:ENEMY_IMAGE_DATA[d.id]').replace('art:`assets/players/runtime/${p.id}.webp`','art:PLAYER_IMAGE_DATA[p.id]').replace('art:`assets/cards/runtime/${id}.webp`','art:CARD_IMAGE_DATA[id]').replace('art:`assets/battles/runtime/${d.id}.webp`','art:BATTLE_IMAGE_DATA[d.id]').replace('art:`assets/journey/runtime/${d.id}.webp`','art:JOURNEY_IMAGE_DATA[d.id]').replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'')).join('\n\n');
const css=await readFile(new URL('style.css',import.meta.url),'utf8');
let html=await readFile(new URL('index.html',import.meta.url),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>',`<script type="module">\n${script}\n</script>`);
// Standalone files keep their icons inline and do not link an online install manifest.
html=html.replace(/<link rel="manifest"[^>]*>/,'');
const iconSVG=await readFile(new URL('assets/icons/icon.svg',import.meta.url),'utf8');
html=html.replace('href="assets/icons/icon.svg"',`href="data:image/svg+xml,${encodeURIComponent(iconSVG)}"`);
for(const file of ['favicon-32.png','apple-touch-icon.png']){const icon=await readFile(new URL('assets/icons/'+file,import.meta.url));html=html.replace('href="assets/icons/'+file+'"',`href="data:image/png;base64,${icon.toString('base64')}"`);}
html=html.replace(/<title>[^<]*<\/title>/,`<title>一局一江湖 · v${GAME_VERSION}</title>`);
if(/(?:src|href)="(?:app\.js|style\.css)"/.test(html)||/^import .*?from /m.test(script))throw Error('Build contains external module dependencies');
await mkdir(new URL('dist/',import.meta.url),{recursive:true});
await writeFile(new URL('dist/一局江湖.html',import.meta.url),html);
await writeFile(new URL('dist/index.html',import.meta.url),html);
await writeFile(new URL(`dist/一局江湖-v${GAME_VERSION}.html`,import.meta.url),html);
console.log(`Standalone build: ${Buffer.byteLength(html)} bytes; SHA256 ${createHash('sha256').update(html).digest('hex')}`);
