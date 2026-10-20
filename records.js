import {validChallenge} from './difficulty.js';
import {validTrialLevel} from './expedition.js';
import {ENEMY} from './enemies.js';
import {CARD,RELIC,GAME_VERSION} from './data.js';
import {validPlayer} from './players.js';
export const RECORDS_KEY='yiju-jianghu-clears-v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const whole=n=>Number.isFinite(n)&&Number.isInteger(n)&&n>=0;
const stamp=n=>whole(n)&&Number.isFinite(new Date(n).getTime());
const text=s=>typeof s==='string'&&s.length>0&&s.length<=160;
const statKeys=['turns','played','damage','exhausted','self','kills','wins'];
export function groupDeck(deck){const groups=new Map();for(const c of deck){const key=c.id+':'+!!c.up,entry=groups.get(key);if(entry)entry.count++;else groups.set(key,{id:c.id,up:!!c.up,count:1});}return [...groups.values()].sort((a,b)=>a.id.localeCompare(b.id)||Number(a.up)-Number(b.up));}
export function createClearRecord(s,{at=Date.now(),legacy=false}={}){
 const length=s.journey?45:18,route=(s.history||[]).map(x=>({step:x.step,kind:x.kind,place:x.place||null,nodeId:x.nodeId||null}));
 if(!legacy)route.push({step:s.step,kind:'boss',place:s.scene?.place||null,nodeId:s.scene?.nodeId||null});
 return {...(s.challengeRevision===1?{challengeRevision:1}:{}),...(s.skirmishRevision===1?{skirmishRevision:1}:{}),...(s.expedition?{trialLevel:s.expedition.level,expeditionRevision:s.expedition.revision,bosses:[...s.expedition.bosses]}:{}),schema:1,id:`${s.created}:${s.seed}:${length}`,seed:s.seed,created:s.created,completedAt:at,startVersion:s.runInfo?.version||null,clearVersion:legacy?null:GAME_VERSION,ruleset:s.ruleset||'classic',routeLength:length,snapshot:legacy?'legacy-finish':'boss-defeat',player:copy(s.player),hp:Math.max(0,s.hp),maxHp:s.maxHp,gold:s.gold,stats:Object.fromEntries(statKeys.map(k=>[k,s.stats[k]])),activeMs:!legacy&&s.runInfo?.timed===true&&whole(s.runInfo.activeMs)?s.runInfo.activeMs:null,deck:groupDeck(s.deck),relics:[...s.relics],route};
}
export function validClearRecord(r){
 return !!r&&validChallenge(r)&&(r.skirmishRevision===undefined||r.skirmishRevision===1)&&(r.trialLevel===undefined||validTrialLevel(r.trialLevel)&&r.expeditionRevision===1&&r.routeLength===45&&Array.isArray(r.bosses)&&r.bosses.length===3&&r.bosses.every((id,i)=>ENEMY[id]?.rank==='boss'&&ENEMY[id].chapter===i))&&r.schema===1&&text(r.id)&&whole(r.seed)&&r.seed<=0xffffffff&&stamp(r.created)&&stamp(r.completedAt)&&r.completedAt>=r.created&&(r.startVersion===null||text(r.startVersion))&&(r.clearVersion===null||text(r.clearVersion))&&text(r.ruleset)&&[18,45].includes(r.routeLength)&&['legacy-finish','boss-defeat'].includes(r.snapshot)&&validPlayer(r.player)&&whole(r.hp)&&whole(r.maxHp)&&r.maxHp>0&&r.hp<=r.maxHp&&whole(r.gold)&&statKeys.every(k=>whole(r.stats?.[k]))&&(r.activeMs===null||whole(r.activeMs))&&Array.isArray(r.deck)&&r.deck.length>0&&r.deck.every(c=>c&&CARD[c.id]&&typeof c.up==='boolean'&&whole(c.count)&&c.count>0)&&new Set(r.deck.map(c=>c.id+':'+c.up)).size===r.deck.length&&Array.isArray(r.relics)&&r.relics.every(id=>RELIC[id])&&new Set(r.relics).size===r.relics.length&&Array.isArray(r.route)&&r.route.length===r.routeLength&&r.route.every((n,i)=>n?.step===i&&(n.kind==='boss')===(i%(r.routeLength/3)===r.routeLength/3-1)&&['battle','elite','boss','rest','event','shop','treasure'].includes(n.kind)&&(n.place===null||text(n.place))&&(n.nodeId===null||text(n.nodeId)))&&r.route.filter(n=>n.kind==='boss').length===3;
}
export function clearRecordForState(s){
 if(!s)return null;const length=s.journey?45:18,finalReward=s.phase==='reward'&&s.step===length-1&&s.b?.kind==='boss'&&s.b.enemies?.length&&s.b.enemies.every(e=>e.hp<=0);
 if(s.phase!=='win'&&!finalReward)return null;
 if(validClearRecord(s.clearRecord)&&s.clearRecord.seed===s.seed&&s.clearRecord.created===s.created&&s.clearRecord.routeLength===length)return copy(s.clearRecord);
 // Older completed saves have only post-reward data. Never label it a boss-defeat snapshot.
 if(s.phase==='win'&&whole(s.finished)){try{const record=createClearRecord(s,{at:s.finished,legacy:true});return validClearRecord(record)?record:null;}catch{return null;}}return null;
}
export const recordGroup=r=>JSON.stringify([r.startVersion,r.clearVersion,r.ruleset,r.routeLength,r.snapshot,r.trialLevel??0,r.expeditionRevision??0,r.skirmishRevision??0,r.challengeRevision??0]);
export const eliteCount=r=>r.route.filter(n=>n.kind==='elite').length;
export const deckSize=r=>r.deck.reduce((sum,c)=>sum+c.count,0);
export const refinedCount=r=>r.deck.reduce((sum,c)=>sum+(c.up?c.count:0),0);
export function rankRecords(records,mode='turns'){return [...records].sort((a,b)=>(mode==='challenge'?eliteCount(b)-eliteCount(a)||a.stats.turns-b.stats.turns:a.stats.turns-b.stats.turns||eliteCount(b)-eliteCount(a))||a.stats.played-b.stats.played||a.completedAt-b.completedAt||a.id.localeCompare(b.id));}
export function mergeRecords(existing,incoming){const map=new Map();for(const r of [...existing,...incoming]){if(!validClearRecord(r))throw Error('通关记录格式无效');if(!map.has(r.id))map.set(r.id,copy(r));}return [...map.values()];}
export function parseRecords(raw){const data=JSON.parse(raw);if(data?.schema!==1||!Array.isArray(data.records))throw Error('通关记录格式无效');return mergeRecords([],data.records);}
export const serializeRecords=records=>JSON.stringify({schema:1,records:mergeRecords([],records)},null,2);
export function readRecords(storage){try{const raw=storage.getItem(RECORDS_KEY);return {records:raw===null?[]:parseRecords(raw),error:null};}catch(error){return {records:[],error};}}
export function storeRecords(storage,incoming){const loaded=readRecords(storage);if(loaded.error)throw loaded.error;const records=mergeRecords(loaded.records,incoming);if(records.length!==loaded.records.length)storage.setItem(RECORDS_KEY,serializeRecords(records));return records;}
// A fresh clock starts on each page load. Hidden time, menus and long suspension gaps never accrue.
export class PlayClock{
 constructor(){this.state=null;this.at=null;this.active=false;}
 sample(state,active,now){const elapsed=now-this.at;if(this.state===state&&this.active&&elapsed>=0&&elapsed<=5000&&state?.runInfo?.timed===true&&!state.clearRecord&&!['character','win','lost'].includes(state.phase)){state.runInfo.activeMs=(whole(state.runInfo.activeMs)?state.runInfo.activeMs:0)+Math.floor(elapsed);}this.state=state;this.at=now;this.active=active;}
}
