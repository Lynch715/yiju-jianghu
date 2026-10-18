// Mechanical WebP resizing/compression. Keep all generated originals local and unchanged.
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {mkdir,stat,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {BATTLE_SCENES} from '../battle-art.js';
const run=promisify(execFile),limit=72*1024,report=[];
for(const scene of BATTLE_SCENES){
 const source=new URL(`../assets/battles/originals/${scene.id}.png`,import.meta.url),target=new URL('../'+scene.art,import.meta.url);
 await mkdir(new URL('./',target),{recursive:true});let width=960,quality=62,bytes;
 while(true){
  await run('cwebp',['-quiet','-m','6','-q',String(quality),'-resize',String(width),'0',fileURLToPath(source),'-o',fileURLToPath(target)]);
  bytes=(await stat(target)).size;if(bytes<=limit)break;
  if(quality>50)quality-=4;else if(width>720){width-=120;quality=62;}else throw Error('Battle background exceeds 72 KiB: '+scene.id);
 }
 report.push({id:scene.id,path:scene.art,width,quality,bytes});
}
await writeFile(new URL('../art/battle-art-sizes-v2.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({assets:report,totalBytes:report.reduce((sum,x)=>sum+x.bytes,0)}));
