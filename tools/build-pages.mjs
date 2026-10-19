// Lightweight web package. Keep the separate standalone build for offline use.
import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GAME_VERSION} from '../data.js';
import {ENEMIES} from '../enemies.js';
import {PLAYERS} from '../players.js';
import {CARD_ART_THEMES} from '../card-art.js';
import {BATTLE_SCENES} from '../battle-art.js';
import {JOURNEY_SCENES} from '../journey-art.js';
import {HOME_COVER} from '../home-art.js';
const sourceRoot=new URL('../',import.meta.url),targetRoot=new URL('../docs/',import.meta.url);
const files=['index.html','manifest.webmanifest','assets/icons/icon.svg','assets/icons/icon-512.png','assets/icons/icon-192.png','assets/icons/apple-touch-icon.png','assets/icons/favicon-32.png','app.js','data.js','journey.js','map-art.js','journey-art.js','battle-art.js','journey-ui.js','card-art.js','relic-art.js','enemy-tactics.js','enemy-action.js','records.js','engine.js','card-preview.js','difficulty.js','expedition.js','enemies.js','players.js','combat-ui.js','hand-gesture.js','themes.js','home-art.js','style.css',HOME_COVER.art,...ENEMIES.map(x=>x.art),...PLAYERS.map(x=>x.art),...Object.values(CARD_ART_THEMES).map(x=>x.art),...BATTLE_SCENES.map(x=>x.art),...JOURNEY_SCENES.map(x=>x.art)];
// This generated directory contains only copied runtime art; remove obsolete PNG copies.
await rm(new URL('assets/',targetRoot),{recursive:true,force:true});
const manifest={version:GAME_VERSION,entry:'index.html',files:[]};
for(const file of files){const source=new URL(file,sourceRoot),target=new URL(file,targetRoot);await mkdir(new URL('./',target),{recursive:true});await copyFile(source,target);
 if(file.endsWith('.js')){const code=(await readFile(target,'utf8')).replace(/(from\s+['"])(\.\/[^'"]+\.js)(['"])/g,`$1$2?v=${GAME_VERSION}$3`);await writeFile(target,code);}
 if(file==='manifest.webmanifest'){const manifest=JSON.parse(await readFile(target,'utf8'));manifest.icons=manifest.icons.map(icon=>({...icon,src:icon.src+`?v=${GAME_VERSION}`}));await writeFile(target,JSON.stringify(manifest,null,2)+'\n');}
 if(file==='index.html'){const html=(await readFile(target,'utf8')).replace('href="style.css"',`href="style.css?v=${GAME_VERSION}"`).replace('src="app.js"',`src="app.js?v=${GAME_VERSION}"`).replace(/href="(manifest\.webmanifest|assets\/icons\/[^"]+)"/g,`href="$1?v=${GAME_VERSION}"`);await writeFile(target,html);}
 const bytes=await readFile(target);manifest.files.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(new URL('.nojekyll',targetRoot),'');
await writeFile(new URL('release.json',targetRoot),JSON.stringify(manifest,null,2)+'\n');
console.log(`Pages v${GAME_VERSION}: ${files.length} files, ${manifest.files.reduce((sum,x)=>sum+x.bytes,0)} bytes; artwork loads separately.`);
