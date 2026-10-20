// Mechanical resizing / compression only. Keep original generated artwork untouched.
// Requires Google's cwebp utility (libwebp), no API key or network calls.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {mkdir,stat} from 'node:fs/promises';
import {ENEMIES} from '../enemies.js';
import {PLAYERS,HEROES} from '../players.js';
import {CARD_ART_THEMES} from '../card-art.js';
import {HOME_COVER} from '../home-art.js';
const exec=promisify(execFile);
const artJobs=[
 // Preserve native cover detail; never use the 480px card derivative for the title screen.
 {source:'assets/cards/originals/sword.png',target:HOME_COVER.art,options:['-q','86','-sharp_yuv']},
 ...ENEMIES.map(d=>({source:`assets/enemies/${d.id}.png`,target:d.art,options:['-q','76','-alpha_q','85','-resize','0','480']})),
 ...PLAYERS.map(p=>({source:`assets/players/${p.id}.png`,target:p.art,options:['-q','76','-alpha_q','85','-resize','0','480']})),
 ...HEROES.map(h=>({source:`assets/heroes/originals/${h.id}.png`,target:h.art,options:['-q','80','-alpha_q','90','-resize','0','560']})),
 ...Object.values(CARD_ART_THEMES).map(t=>({source:`assets/cards/originals/${t.id}.png`,target:t.art,options:['-q','72','-resize','480','320']}))
];
for(const job of artJobs){
 const source=new URL('../'+job.source,import.meta.url),target=new URL('../'+job.target,import.meta.url);
 await mkdir(new URL('./',target),{recursive:true});
 let original,current;try{original=await stat(source);}catch{}
 try{current=await stat(target);}catch{}
 // Published checkouts ship ready-to-use card art; full-size generated card originals stay local.
 if(!original){if(current)continue;throw Error('Missing artwork source and runtime file: '+job.target);}
 if(!current||current.mtimeMs<original.mtimeMs)await exec('cwebp',['-quiet','-m','6',...job.options,fileURLToPath(source),'-o',fileURLToPath(target)]);
 await stat(target);
}
console.log(`Prepared ${artJobs.length} lightweight WebP assets; original artwork preserved.`);
