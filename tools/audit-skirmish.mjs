import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,STARTING_DECK} from '../engine.js';
import {Game as Before} from '../tests/fixtures/v0.17.0/engine.js';
import {GAME_VERSION,CARD} from '../data.js';
import {visibleTurn} from '../tests/expedition-policy.mjs';
const profiles={starter:{ids:STARTING_DECK},common:{ids:['W01','W01','U01','U01','U02','W02','W02','W09','W09','W05','U07','W04','U12','U13']},refinedCommon:{ids:['W02','W02','W09','W09','W14','W14','W04','W04','U12','U12','U07','U13','U13','W05'],refined:true}};
for(const p of Object.values(profiles))if(p.ids.some(id=>CARD[id].rarity>1))throw Error('Non-common card in audit');
const results=[];
for(const [version,Engine] of [['before',Before],['after',Game]])for(const level of [1,5])for(const chapter of [0,1,2])for(const progress of [0,10])for(const [profile,preset] of Object.entries(profiles)){
 let wins=0,flawless=0,fullHealth=0,rawLoss=0,turns=0,timeout=0;
 for(let seed=1;seed<=30;seed++){
  const g=new Engine();g.start(seed,{opening:false,trialLevel:level});g.s.step=chapter*15+progress;g.s.deck=preset.ids.map(id=>g.make(id,!!preset.refined));if(preset.refined)g.s.relics=['R01','R02','R06',...(chapter>0?['R26']:[]),...(chapter>1?['R25']:[])];
  let healed=0;const heal=g.heal;g.heal=function(n,...rest){const before=this.s.hp;const result=heal.call(this,n,...rest);healed+=this.s.hp-before;return result;};g.combat('battle');
  while(g.s.phase==='battle'&&g.s.b.turn<60)visibleTurn(g);const won=g.s.phase==='reward',hurt=80+healed-g.s.hp;wins+=won;flawless+=won&&hurt===0;fullHealth+=won&&g.s.hp===80;rawLoss+=hurt;turns+=g.s.b.turn;timeout+=g.s.phase==='battle';
 }
 results.push({version,level,chapter:chapter+1,progress,profile,runs:30,wins,flawless,fullHealth,meanRawLoss:+(rawLoss/30).toFixed(2),meanTurns:+(turns/30).toFixed(2),timeout});
}
const root=new URL('../',import.meta.url),sourceHashes={};for(const file of ['engine.js','enemy-tactics.js','difficulty.js','enemy-action.js','tests/expedition-policy.mjs'])sourceHashes[file]=createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex');
const report={version:GAME_VERSION,note:'2160 isolated encounters, equal seeds/presets/resources before and after. Common preset contains no refined or above-common cards and only the starter relic. RefinedCommon grants a fully refined common-only deck plus specified relics and chapter energy, measuring conditional viability, not acquisition. Raw loss includes poison and excludes victory healing. Fixed automated policies are not human win rates. No browser/device acceptance is implied.',profiles,results,sourceHashes};fs.mkdirSync(new URL('../output/balance/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/balance/skirmish-v'+GAME_VERSION+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({fights:results.reduce((n,r)=>n+r.runs,0),timeouts:results.reduce((n,r)=>n+r.timeout,0),firstChapterCommon:results.filter(r=>r.level===1&&r.chapter===1&&r.profile==='common'),refinedCommonLate:results.filter(r=>r.version==='after'&&r.level===1&&r.chapter===3&&r.profile==='refinedCommon')}));
