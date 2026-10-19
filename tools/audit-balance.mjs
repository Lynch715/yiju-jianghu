import fs from 'node:fs';import {createHash} from 'node:crypto';
import {Game,STARTING_DECK} from '../engine.js';import {GAME_VERSION,CARD} from '../data.js';
import {runGame} from '../tests/playthrough.mjs';
import {visibleTurn} from '../tests/expedition-policy.mjs';
const profiles={
 starting:{ids:STARTING_DECK,refined:false},
 developing:{ids:['W01','W01','U01','U01','U02','W02','W06','W13','W19','W21','W23','W17','W08','W12'],refined:false},
 mature_strength:{ids:['W01','U01','U01','U02','W13','W12','W07','W08','W17','W19','W21','W11'],refined:true},
 mature_guard:{ids:['W01','U01','U01','U02','W22','W29','W28','W19','W23','W24','W27','W21'],refined:true},
 mature_blood:{ids:['W01','U01','U01','U02','W48','W51','W43','W44','W47','W49','W13','W19','W21','W17'],refined:true}
};
const matchups=[];
for(let chapter=0;chapter<3;chapter++)for(const kind of ['battle','elite','boss'])for(const [profile,spec]of Object.entries(profiles)){
 let wins=0,turns=0,netHpCost=0;
 for(let seed=1;seed<=50;seed++){
  const g=new Game();g.start(seed,{opening:false});g.s.deck=spec.ids.map(id=>g.make(id,spec.refined));g.s.step=chapter*15+(kind==='boss'?14:10);g.s.relics=chapter===0?['R01']:chapter===1?['R01','R26']:['R01','R26','R25'];g.combat(kind);
  while(g.s.phase==='battle'&&g.s.b.turn<80)g.autoPlayTurn();if(g.s.phase==='battle')throw Error(`Unfinished ${chapter}/${kind}/${profile}/${seed}`);
  wins+=g.s.phase==='reward';turns+=g.s.b.turn;netHpCost+=80-g.s.hp;
 }
 matchups.push({chapter:chapter+1,kind,profile,runs:50,wins,meanTurns:+(turns/50).toFixed(2),meanNetHpCost:+(netHpCost/50).toFixed(2)});
}
const gifts={common:0,uncommon:0,rare:0};
for(let seed=1;seed<=5000;seed++){const g=new Game();g.start(seed,{opening:false});g.s.phase='event';g.s.scene={event:'master'};g.eventChoice(0);gifts[{1:'common',2:'uncommon',3:'rare'}[CARD[g.s.deck.at(-1).id].rarity]]++;}
class CurrentTrial extends Game{start(seed,options={}){return super.start(seed,{...options,trialLevel:1});}}
const completed=[];for(const [policy,seed]of Object.entries({'随缘':89})){const r=runGame(policy,seed,true,{Engine:CurrentTrial,combat:visibleTurn});if(r.phase!=='win'||r.state.history.length!==45||r.state.history.filter(x=>x.kind==='boss').length!==3)throw Error('Full-run regression: '+policy);completed.push({policy,seed,phase:r.phase,steps:r.state.history.length,hp:r.hp,deck:r.deck,relics:r.relics,turns:r.turns});}
const root=new URL('../',import.meta.url),hashes={};for(const file of ['engine.js','enemy-tactics.js','difficulty.js','data.js','app.js','tests/playthrough.mjs'])hashes[file]=createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex');
const report={version:GAME_VERSION,note:`2250 isolated preset encounters use real rules and a fixed blind heuristic. Mature presets are deliberately granted complete upgraded decks and chapter energy relics; these measure conditional strength, not acquisition probability. Net HP cost includes victory healing. Automated outcomes are not human win rates. ${completed.length} full-run cases use actual opening rewards, routes, drops, shop costs and rest rules.`,matchups,masterGiftSamples:{runs:5000,...gifts},completed,sourceHashes:hashes};
const path=new URL(`output/balance/v${GAME_VERSION}.json`,root);fs.mkdirSync(new URL('./',path),{recursive:true});fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({version:report.version,presetFights:2250,fullCompletions:completed.length,masterGiftSamples:report.masterGiftSamples,report:path.pathname}));
