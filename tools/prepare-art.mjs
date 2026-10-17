// Mechanical runtime resizing only; original generated PNGs remain untouched.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {mkdir,stat} from 'node:fs/promises';
import {ENEMIES} from '../enemies.js';
import {PLAYERS} from '../players.js';
const exec=promisify(execFile);
for(const [folder,portraits] of [['enemies',ENEMIES],['players',PLAYERS]]){
 await mkdir(new URL(`../assets/${folder}/runtime/`,import.meta.url),{recursive:true});
 for(const d of portraits){const source=new URL(`../assets/${folder}/${d.id}.png`,import.meta.url),target=new URL(`../assets/${folder}/runtime/${d.id}.png`,import.meta.url);const original=await stat(source);let current;try{current=await stat(target);}catch{}if(!current||current.mtimeMs<original.mtimeMs)await exec('sips',['-Z','640',fileURLToPath(source),'--out',fileURLToPath(target)]);await stat(target);}
}
console.log('Prepared 22 runtime portraits; original transparent PNGs preserved.');
