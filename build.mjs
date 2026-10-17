import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GAME_VERSION,CARDS,CARD,RELICS,describe,OPENING_BOONS} from './data.js';
import {ENEMIES} from './enemies.js';
import {PLAYERS} from './players.js';
const files=['data.js','enemies.js','players.js','engine.js','combat-ui.js','app.js'];
const source=await Promise.all(files.map(f=>readFile(new URL(f,import.meta.url),'utf8')));
// Check actual displayed descriptions in both refinement states, not just raw source text.
const visibleText=[source.at(-1),...PLAYERS.flatMap(p=>[p.title,p.description]),...ENEMIES.flatMap(d=>[d.name,d.faction,d.trait,...d.moves.map(i=>i.label),...(d.enragedMoves||[]).map(i=>i.label)]),...OPENING_BOONS.flatMap(d=>[d.title,d.text]),...CARDS.flatMap(d=>[d.name,d.source,d.path,describe({id:d.id,up:false}),describe({id:d.id,up:true})]),...['QI','CURSE'].map(id=>describe({id})),...RELICS.flatMap(r=>[r.name,r.source,r.text])];
if(visibleText.some(text=>/暂退|护体|忘却/.test(text)))throw Error('Release blocked: obsolete terminology remains in visible game text');
const portraits={};
for(const d of ENEMIES){const image=await readFile(new URL(d.art,import.meta.url));if(!image.length)throw Error('Missing portrait: '+d.id);portraits[d.id]='data:image/png;base64,'+image.toString('base64');}
const playerImages={};
for(const p of PLAYERS){const image=await readFile(new URL(p.art,import.meta.url));if(!image.length)throw Error('Missing player portrait: '+p.id);playerImages[p.id]='data:image/png;base64,'+image.toString('base64');}
const script='const PLAYER_IMAGE_DATA='+JSON.stringify(playerImages)+';\n'+'const ENEMY_IMAGE_DATA='+JSON.stringify(portraits)+';\n'+source.map((s,i)=>`// ---- ${files[i]} ----\n`+s.replace('art:`assets/enemies/runtime/${d.id}.png`','art:ENEMY_IMAGE_DATA[d.id]').replace('art:`assets/players/runtime/${p.id}.png`','art:PLAYER_IMAGE_DATA[p.id]').replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'')).join('\n\n');
const css=await readFile(new URL('style.css',import.meta.url),'utf8');
let html=await readFile(new URL('index.html',import.meta.url),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>',`<script type="module">\n${script}\n</script>`);
html=html.replace(/<title>[^<]*<\/title>/,`<title>一局江湖 · v${GAME_VERSION}</title>`);
if(/(?:src|href)="(?:app\.js|style\.css)"/.test(html)||/^import .*?from /m.test(script))throw Error('Build contains external module dependencies');
await mkdir(new URL('dist/',import.meta.url),{recursive:true});
await writeFile(new URL('dist/一局江湖.html',import.meta.url),html);
await writeFile(new URL('dist/index.html',import.meta.url),html);
await writeFile(new URL(`dist/一局江湖-v${GAME_VERSION}.html`,import.meta.url),html);
console.log(`Standalone build: ${Buffer.byteLength(html)} bytes; SHA256 ${createHash('sha256').update(html).digest('hex')}`);
