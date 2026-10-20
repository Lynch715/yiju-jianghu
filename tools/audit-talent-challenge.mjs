import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {Game} from '../engine.js';
import {GAME_VERSION} from '../data.js';
import {HEROES,TALENTS} from '../players.js';
import {ENEMY} from '../enemies.js';
import {visibleTurn} from '../tests/expedition-policy.mjs';
import {runGame} from '../tests/playthrough.mjs';
const baseline=process.env.CHALLENGE_BASELINE_DIR;
if(!baseline)throw Error('Set CHALLENGE_BASELINE_DIR to the preserved v0.20.0 source directory');
const Before=(await import(pathToFileURL(path.resolve(baseline,'engine.js')).href)).Game;
const identities=[...HEROES.map(h=>({hero:h.id,label:h.name})),...TALENTS.filter(t=>t.common).map(t=>({hero:'custom',talent:t.id,label:t.name}))];
const profiles={common:{ids:['W01','W01','U01','U01','U02','W02','W02','W09','W09','W05','U07','W04','U12','U13'],refined:false,relics:[]},strength:{ids:['W01','U01','U01','U02','W13','W12','W07','W08','W17','W19','W21','W11'],refined:true,relics:['R13','R20']},guard:{ids:['W01','U01','U01','U02','W22','W29','W28','W19','W23','W24','W27','W21'],refined:true,relics:['R06','R12']},blood:{ids:['W01','U01','U01','U02','W48','W51','W43','W44','W47','W49','W13','W19','W21','W17'],refined:true,relics:['R07','R08']}};
function create(Engine,identity,seed,level){const g=new Engine();g.start(seed,{trialLevel:level});g.chooseHero(identity.hero);if(identity.hero==='custom'){g.setCharacterName('试剑人');g.choosePlayerPortrait('female-qing');g.chooseTalent(identity.talent);}if(!g.finishCharacter())throw Error(g.characterError());g.s.phase='map';return g;}
Object.assign(profiles,{exhaust:{ids:['W01','W01','U01','U01','U02','W36','W37','W38','W35','W31','W32','W33','W41','W21','W13','W08','W54','U04','W56','W40','W12'],refined:true,relics:['R17','R09']},combo:{ids:['W01','U01','U02','W28','W58','W58','W55','W55','W53','W53','W57','W04','U12','W21','W13','W12'],refined:true,relics:['R03','R16']}});
const battles=[];
for(const identity of identities)for(const level of [1,3,5])for(let chapter=0;chapter<3;chapter++)for(const kind of ['battle','elite','boss']){
 const runs=[];
 for(let seed=1;seed<=5;seed++)for(const [revision,Engine] of [['before',Before],['after',Game]]){
  const g=create(Engine,identity,seed,level),profile=kind==='battle'?'common':['strength','guard','blood','exhaust','combo'][(seed-1)%5],spec=profiles[profile];g.s.step=chapter*15+(kind==='boss'?14:kind==='elite'?4:chapter===0?0:8);g.s.deck=spec.ids.map(id=>g.make(id,spec.refined));g.s.relics=['R01',...spec.relics,...(spec.refined&&chapter>0?['R26']:[]),...(spec.refined&&chapter>1?['R25']:[])];
  const initialHp=g.s.hp;let healed=0;const heal=g.heal;g.heal=function(...args){const hp=this.s.hp;const r=heal.apply(this,args);healed+=this.s.hp-hp;return r;};g.combat(kind);const initialFoes=g.s.b.enemies.map(e=>({id:e.id,hp:e.hp,damageScale:e.damageScale,guardScale:e.guardScale,block:e.block}));
  while(g.s.phase==='battle'&&g.s.b.turn<80)visibleTurn(g);
  if(g.s.phase==='battle')throw Error('Fight timeout '+JSON.stringify({identity,level,chapter,kind,seed,revision}));
  runs.push({revision,seed,profile,win:g.s.phase==='reward',turns:g.s.b.turn,rawLoss:initialHp+healed-g.s.hp,hp:g.s.hp,initialFoes});
 }
 battles.push({identity:identity.label,level,chapter:chapter+1,kind,runs});
}
console.log('Paired battles complete:',battles.length*10);
const journeys=[];
for(const identity of identities)for(const level of [1,5])for(const seed of [42,123,365,1934])for(const [revision,Engine] of [['before',Before],['after',Game]]){
 class TrialGame extends Engine{start(seed,options={}){return super.start(seed,{...options,trialLevel:level});}}
 const r=runGame('随缘',seed,true,{Engine:TrialGame,combat:visibleTurn,hero:identity.hero,talent:identity.talent});if(!['win','lost'].includes(r.phase))throw Error('Journey timeout');delete r.state;journeys.push({identity:identity.label,level,revision,...r});
}
const summarize=revision=>{const rows=battles.flatMap(b=>b.runs.filter(r=>r.revision===revision));return {fights:rows.length,wins:rows.filter(r=>r.win).length,meanRawLoss:+(rows.reduce((n,r)=>n+r.rawLoss,0)/rows.length).toFixed(2),meanTurns:+(rows.reduce((n,r)=>n+r.turns,0)/rows.length).toFixed(2),fullRuns:journeys.filter(r=>r.revision===revision).length,clears:journeys.filter(r=>r.revision===revision&&r.phase==='win').length};};
const sourceHashes={};for(const file of ['engine.js','difficulty.js','enemy-tactics.js','players.js','tests/expedition-policy.mjs','tests/playthrough.mjs'])sourceHashes[file]=createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
const report={version:GAME_VERSION,note:'Paired same-identity, seed, tier and starting resources. Isolated encounters grant listed conditional decks and relics, not acquisition probabilities. Full journeys use actual basic opening, random rewards, finite gold, shops and healing. Policy reads visible intent and immediate outcomes; these results are not human win rates.',identities,profiles,summary:{before:summarize('before'),after:summarize('after')},battles,journeys,sourceHashes};
fs.mkdirSync(new URL('../output/balance/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../output/balance/talent-challenge-v'+GAME_VERSION+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
