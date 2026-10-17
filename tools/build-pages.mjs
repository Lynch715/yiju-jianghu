// Lightweight web package. Keep the separate standalone build for offline use.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GAME_VERSION} from '../data.js';
import {ENEMIES} from '../enemies.js';
import {PLAYERS} from '../players.js';
const sourceRoot=new URL('../',import.meta.url),targetRoot=new URL('../docs/',import.meta.url);
const files=['index.html','app.js','data.js','engine.js','enemies.js','players.js','style.css',...ENEMIES.map(x=>x.art),...PLAYERS.map(x=>x.art)];
const manifest={version:GAME_VERSION,entry:'index.html',files:[]};
for(const file of files){const source=new URL(file,sourceRoot),target=new URL(file,targetRoot);await mkdir(new URL('./',target),{recursive:true});await copyFile(source,target);const bytes=await readFile(target);manifest.files.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(new URL('.nojekyll',targetRoot),'');
await writeFile(new URL('release.json',targetRoot),JSON.stringify(manifest,null,2)+'\n');
console.log(`Pages v${GAME_VERSION}: ${files.length} files, ${manifest.files.reduce((sum,x)=>sum+x.bytes,0)} bytes; artwork loads separately.`);
