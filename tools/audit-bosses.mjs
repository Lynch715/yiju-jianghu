import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import {Game} from '../engine.js';import {GAME_VERSION} from '../data.js';import {exploreTurn} from '../tests/combat-policy.mjs';
// These are conditional, fully refined constructed decks, not rewards given in a run.
// Each receives two relevant relics plus the same chapter energy relics.
const profiles={
 strength:{ids:['W01','U01','U01','U02','W13','W12','W07','W08','W17','W19','W21','W11'],relics:['R13','R20']},
 guard:{ids:['W01','U01','U01','U02','W22','W29','W28','W19','W23','W24','W27','W21'],relics:['R06','R12']},
 blood:{ids:['W01','U01','U01','U02','W48','W51','W43','W44','W47','W49','W13','W19','W21','W17'],relics:['R07','R08']},
 exhaust:{ids:['W01','W01','U01','U01','U02','W36','W37','W38','W35','W31','W32','W33','W41','W21','W13','W08','W54','U04','W56','W40','W12'],relics:['R17','R09']},
 combo:{ids:['W01','U01','U02','W28','W58','W58','W55','W55','W53','W53','W57','W04','U12','W21','W13','W12'],relics:['R03','R16']}
};
const engines=[['current',Game]],baseline=process.env.BOSS_BASELINE_DIR;if(baseline)engines.unshift(['baseline',(await import(pathToFileURL(path.resolve(baseline,'engine.js')).href)).Game]);
const results=[];
for(const [revision,Engine] of engines)for(const [policy,play]of [['simple',g=>g.autoPlayTurn()],['observed',exploreTurn]])for(let chapter=0;chapter<3;chapter++)for(const [profile,spec]of Object.entries(profiles)){
 let wins=0,turns=0,hpCost=0;for(let seed=1;seed<=100;seed++){
  const g=new Engine();g.start(seed,{opening:false});g.s.deck=spec.ids.map(id=>g.make(id,true));g.s.step=chapter*15+14;g.s.relics=['R01',...(chapter>0?['R26']:[]),...(chapter>1?['R25']:[]),...spec.relics];g.combat('boss');
  while(g.s.phase==='battle'&&g.s.b.turn<80)play(g);if(g.s.phase==='battle')throw Error(`Unfinished ${revision}/${policy}/${chapter}/${profile}/${seed}`);wins+=g.s.phase==='reward';turns+=g.s.b.turn;hpCost+=80-g.s.hp;
 }
 results.push({revision,policy,chapter:chapter+1,profile,wins,runs:100,meanTurns:+(turns/100).toFixed(2),meanNetHpCost:+(hpCost/100).toFixed(2)});
}
for(const profile of Object.keys(profiles))for(let chapter=1;chapter<=3;chapter++)if(!results.some(r=>r.revision==='current'&&r.profile===profile&&r.chapter===chapter&&r.wins>0))throw Error(`No observed viable result: ${profile}/${chapter}`);
const root=new URL('../',import.meta.url),sourceHashes={};for(const file of ['enemy-tactics.js','engine.js','difficulty.js','data.js','tests/combat-policy.mjs','tests/playthrough.mjs'])sourceHashes[file]=createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex');
const report={version:GAME_VERSION,note:'Conditional fully refined decks, active powers are NOT preinstalled. Every fight includes shuffled startup, finite exhaust fuel, and actual HP costs. Both policies are blind to future intents. Combo/exhaust include supporting strength growth; fixed-damage resource engines alone are not equivalent to a complete scaling deck. Net HP costs include victory recovery and lost attempts. Outcomes are automated strategy samples, not human win rates or acquisition odds.',profiles,results,sourceHashes};
const output=new URL(`output/balance/bosses-v${GAME_VERSION}.json`,root);fs.mkdirSync(new URL('./',output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({version:GAME_VERSION,fights:results.reduce((s,r)=>s+r.runs,0),report:output.pathname}));
