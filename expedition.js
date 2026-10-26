import {EXPANDED_ENCOUNTERS} from './enemies.js';
import {DIFFICULTY} from './difficulty.js';
export const TRIALS=[
 {level:1,name:'初涉风波',text:'三章四十五程，各门派有可拆解的招法，每章首领与途中遭遇随此局变化。'},
 {level:2,name:'群敌环伺',text:'沿用前阶变化；途中更常遇到结伴敌人，普通敌人逐阶加压，精英护势更强。'},
 {level:3,name:'风尘难歇',text:'沿用前阶变化；歇脚疗伤降至20%，行商价格提高10%。'},
 {level:4,name:'宗师争锋',text:'沿用前阶变化；首领战更为险峻，持久交锋需要更稳健的构筑。'},
 {level:5,name:'险峰问道',text:'沿用前阶变化；首领起手劲力+1，久战蓄劲更快。'}
];
export const validTrialLevel=n=>Number.isInteger(n)&&n>=1&&n<=5;
function hash(seed,ch){let x=((seed>>>0)^Math.imul(ch+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return (x^(x>>>16))>>>0;}
export const plannedBosses=seed=>EXPANDED_ENCOUNTERS.map((ch,i)=>ch.bosses[hash(seed,i)%ch.bosses.length].ids[0]);
export function newExpedition(seed,level){if(!validTrialLevel(level))throw Error('历练等阶无效');return {revision:1,level,bosses:plannedBosses(seed),seen:[],...(level===1?{onboarding:1}:{})};}
export function validExpedition(s){const e=s?.expedition;if(e===undefined)return true;return !!s.journey&&s.ruleset===DIFFICULTY&&e?.revision===1&&validTrialLevel(e.level)&&Array.isArray(e.bosses)&&e.bosses.length===3&&e.bosses.every((id,i)=>EXPANDED_ENCOUNTERS[i].bosses.some(b=>b.ids[0]===id))&&Array.isArray(e.seen)&&e.seen.length<=45&&e.seen.every(x=>x&&Number.isInteger(x.step)&&x.step>=0&&x.step<45&&['battle','elite','boss'].includes(x.kind)&&Number.isInteger(x.chapter)&&x.chapter===Math.floor(x.step/15)&&typeof x.title==='string'&&x.title.length<100)&&new Set(e.seen.map(x=>x.step)).size===e.seen.length;}
export const trialLevel=s=>s?.expedition?.revision===1?s.expedition.level:0;
// Old 45-road clears under the current hard rules count as a first-tier clear.
export function unlockedTrial(records){let highest=1;for(const r of records){if(r.routeLength!==45||r.snapshot!=='boss-defeat'||r.ruleset!==DIFFICULTY)continue;const level=r.trialLevel??1;if(validTrialLevel(level))highest=Math.max(highest,Math.min(5,level+1));}return highest;}
export function encounterFor(game,kind){const s=game.s,e=s.expedition,ch=EXPANDED_ENCOUNTERS[game.chapter];if(kind==='boss')return ch.bosses.find(b=>b.ids[0]===e.bosses[game.chapter]);let pool=kind==='elite'?ch.elite:ch.normal;if(kind==='battle'&&game.chapterStep===0)pool=pool.filter(x=>x.ids.length<=2);if(kind==='battle'&&e.onboarding===1&&game.chapter===0){const fought=e.seen.filter(x=>x.chapter===0&&x.kind==='battle').length;const plain=x=>x.ids.every(id=>id==='qingcheng'||id==='songshan');const gentle=fought===0?pool.filter(x=>x.ids.length===1&&plain(x)):fought===1?pool.filter(x=>x.ids.length<=2&&plain(x)):null;if(gentle?.length)pool=gentle;}const seen=new Set(e.seen.filter(x=>x.chapter===game.chapter&&x.kind===kind).map(x=>x.title));const fresh=pool.filter(x=>!seen.has(x.title));if(fresh.length)pool=fresh;if(kind==='battle'&&e.level>=2&&game.chapterStep>0){const groups=pool.filter(x=>x.ids.length>1);if(groups.length&&game.random()<.75)pool=groups;}return game.pick(pool);}
export const restRate=s=>trialLevel(s)>=3?.20:.25;
export const trialPrice=(s,n)=>trialLevel(s)>=3?Math.ceil(n*1.10):n;
