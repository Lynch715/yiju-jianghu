import {HOME_COVER} from './home-art.js?v=0.25.0';
import {GAME_THEMES,gameTheme,readTheme,storeTheme,applyTheme} from './themes.js?v=0.25.0';
import {TRIALS,unlockedTrial,validExpedition,trialLevel,restRate} from './expedition.js?v=0.25.0';
import {battleBackdrop} from './battle-art.js?v=0.25.0';
import {journeyScene,journeyIcon} from './journey-art.js?v=0.25.0';
import {journeyResultItems,restRecovery} from './journey-ui.js?v=0.25.0';
import {describeCombatCardHTML,cardCostHTML} from './card-preview.js?v=0.25.0';
import {COMBAT_RULES,COMBAT_RULE,enemyReadout} from './combat-guide.js?v=0.25.0';
import {enemyActionView,enemyActionTagHTML} from './enemy-action.js?v=0.25.0';
import {readRecords,storeRecords,mergeRecords,parseRecords,serializeRecords,clearRecordForState,recordGroup,eliteCount,deckSize,refinedCount,rankRecords,PlayClock} from './records.js?v=0.25.0';
import {validJourney} from './journey.js?v=0.25.0';
import {travelMark,travelTerrain} from './map-art.js?v=0.25.0';
import {relicIcon} from './relic-art.js?v=0.25.0';
import {cardArtwork} from './card-art.js?v=0.25.0';
import {captureCombatAction,playCombatSteps,combatStepFeedback} from './combat-ui.js?v=0.25.0';
import {HandScrub} from './hand-gesture.js?v=0.25.0';
import {PLAYERS,PLAYER,HEROES,HERO,TALENTS,playerTalent,playerArtwork,validPlayer,validCharacterDraft,playerNameError,cleanPlayerName} from './players.js?v=0.25.0';
import {ENEMIES,ENEMY,ENEMY_RANK} from './enemies.js?v=0.25.0';
import {DIFFICULTY,combatDefinition,validChallenge} from './difficulty.js?v=0.25.0';
import {CARDS,CARD,RELICS,RELIC,CHAPTERS,ROUTES,NODE_NAMES,TYPE,RARITY,describe,GAME_VERSION,OPENING_BOONS} from './data.js?v=0.25.0';
import {Game,SAVE_VERSION,validOpening} from './engine.js?v=0.25.0';
let activeTheme;try{activeTheme=readTheme(localStorage);}catch{activeTheme='dawn';}applyTheme(document,activeTheme);
let themeStorageError=false;
document.title=`一局一江湖 · v${GAME_VERSION}`;
// Block multi-touch zoom without cancelling ordinary one-finger scrolling.
for(const type of ['touchstart','touchmove'])document.addEventListener(type,e=>{if(e.touches.length>1&&e.cancelable)e.preventDefault();},{passive:false});
for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,e=>{if(e.cancelable)e.preventDefault();},{passive:false});
const $=s=>document.querySelector(s), SAVE='yiju-jianghu-v1';
const escapeHTML=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon={battle:'剑',elite:'武',rest:'憩',event:'缘',shop:'市',boss:'巅'};
const COMBAT_PACE=Object.freeze({cue:420,flight:420,approach:160,return:240,feedback:640,impact:400});
let game=new Game(),view='home',modal=null,target=0,selected=[],pending=null,filter='',pathFilter='',showUp=false,saveError=false,heroGender='male';
let toastTimer,combatBusy=false,inspectedCard=null,mapViewChapter=null;
let combatDescriptionCache=new Map();
const handScrub=new HandScrub();let scrubHand=null,selectionFrame=0,queuedCard=null,previewRoot=null,previewCards=new Map(),handCards=new Map();
function flushHandSelection(){
 if(selectionFrame)cancelAnimationFrame(selectionFrame);selectionFrame=0;
 const uid=queuedCard;queuedCard=null;if(uid!==null)inspectHandCard(uid);
}
function cancelHandScrub(time=performance.now()){
 if(selectionFrame)cancelAnimationFrame(selectionFrame);selectionFrame=0;queuedCard=null;
 const pointerId=handScrub.current?.pointerId;handScrub.cancel(time);
 if(scrubHand?.hasPointerCapture(pointerId))scrubHand.releasePointerCapture(pointerId);scrubHand?.classList.remove('scrubbing');scrubHand=null;
}
function positionHandPreview(){
 const hand=$('.hand'),controls=$('.turn-panel');if(!previewRoot||!hand)return;
 previewRoot.style.setProperty('--scrub-preview-bottom',`${innerHeight-(controls||hand).getBoundingClientRect().top}px`);
}
function closeHandPreview(){
 handCards.get(inspectedCard)?.classList.remove('inspected');handCards.get(inspectedCard)?.setAttribute('aria-expanded','false');
 previewCards.get(inspectedCard)?.setAttribute('hidden','');inspectedCard=null;
 if(previewRoot)previewRoot.hidden=true;$('.layout')?.classList.remove('has-hand-preview');
}
function inspectHandCard(uid){
 if(combatBusy||modal||game.s?.phase!=='battle'||!previewCards.has(uid)||inspectedCard===uid)return;
 handCards.get(inspectedCard)?.classList.remove('inspected');handCards.get(inspectedCard)?.setAttribute('aria-expanded','false');
 previewCards.get(inspectedCard)?.setAttribute('hidden','');inspectedCard=uid;
 const card=handCards.get(uid),panel=previewCards.get(uid);card?.classList.add('inspected');card?.setAttribute('aria-expanded','true');panel.hidden=false;
 previewRoot.hidden=false;previewRoot.setAttribute('aria-label',panel.dataset.label);$('.layout')?.classList.add('has-hand-preview');
}
document.addEventListener('pointerdown',ev=>{
 if(!ev.isPrimary){cancelHandScrub(ev.timeStamp);return;}
 if(ev.button!==0||combatBusy||modal||view==='home'||game.s?.phase!=='battle'||!matchMedia('(max-width:900px)').matches)return;
 const hand=ev.target.closest('.hand'),preview=ev.target.closest('.hand-preview');if(!hand&&(!preview||ev.target.closest('button')))return;
 const cards=[...handCards.values()],rect=(hand||preview).getBoundingClientRect(),current=cards.findIndex(c=>Number(c.dataset.uid)===inspectedCard);
 // The untransformed card centres stay fixed while the selected face lifts.
 const anchors=hand?cards.map(card=>rect.left+card.offsetLeft):cards.map((_,i)=>ev.clientX+(i-current)*60);
 if(handScrub.begin({pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,anchors,uids:cards.map(c=>Number(c.dataset.uid))}))scrubHand=hand||preview;
});
document.addEventListener('pointermove',ev=>{
 if(!handScrub.current)return;if(!scrubHand?.isConnected||modal||combatBusy||game.s?.phase!=='battle'){cancelHandScrub(ev.timeStamp);return;}
 const result=handScrub.move({pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY});if(!result)return;
 if(result.started){scrubHand.setPointerCapture(ev.pointerId);scrubHand.classList.add('scrubbing');}
 if(ev.cancelable)ev.preventDefault();queuedCard=result.uid;
 if(!selectionFrame)selectionFrame=requestAnimationFrame(flushHandSelection);
},{passive:false});
document.addEventListener('pointerup',ev=>{
 if(handScrub.current?.pointerId!==ev.pointerId)return;
 // Flush the last coordinate before release, even when it arrives between frames.
 const result=handScrub.move({pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY});if(result)queuedCard=result.uid;flushHandSelection();
 handScrub.end({pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,time:ev.timeStamp});
 if(scrubHand?.hasPointerCapture(ev.pointerId))scrubHand.releasePointerCapture(ev.pointerId);scrubHand?.classList.remove('scrubbing');scrubHand=null;
});
for(const type of ['pointercancel','lostpointercapture'])document.addEventListener(type,ev=>{if(handScrub.current?.pointerId===ev.pointerId)cancelHandScrub(ev.timeStamp);});
document.addEventListener('click',ev=>{
 if(ev.detail!==0&&handScrub.consumesClick({pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,time:ev.timeStamp})){ev.preventDefault();ev.stopImmediatePropagation();}
},true);
window.addEventListener('resize',()=>{cancelHandScrub();positionHandPreview();});
function validSave(s){
 if(!s||![1,2,3,4,5,6,7,SAVE_VERSION].includes(s.version)||!Array.isArray(s.deck)||!s.deck.every(c=>CARD[c.id]&&Number.isInteger(c.uid))||!Array.isArray(s.relics)||!s.relics.every(id=>RELIC[id])||!Number.isFinite(s.hp)||!Number.isFinite(s.rng)||!Number.isInteger(s.step)||s.step<0||s.step>(s.journey?45:18)||!validJourney(s)||!validExpedition(s)||!validChallenge(s)||(s.skirmishRevision!==undefined&&s.skirmishRevision!==1))return false;
 if(!['character','opening','draft','map','battle','reward','rest','shop','event','treasure','win','lost'].includes(s.phase))return false;
 if((s.player!==undefined||s.version===SAVE_VERSION)&&!validPlayer(s.player))return false;
 if(s.phase==='treasure'&&(!s.scene||!Array.isArray(s.scene.relics)||s.scene.relics.length>2||!s.scene.relics.every(id=>RELIC[id])||!(s.scene.claimed===null||typeof s.scene.claimed==='string')))return false;
 if(s.phase==='character'&&(!validCharacterDraft(s.character)||s.character.editing&&(s.character.hero!==s.player?.hero||s.character.talent!==s.player?.talent)))return false;
 const phase=s.phase==='character'&&s.character.editing?s.character.returnPhase:s.phase;
 if(phase==='opening'&&(s.step!==0||!validOpening(s.opening)))return false;
 if(phase==='draft'&&(s.deck.length>10||!s.deck.every(c=>CARDS.some(d=>d.id===c.id)&&!c.up)||!s.deck.filter(c=>CARD[c.id].type==='p').every((c,i,a)=>a.findIndex(x=>x.id===c.id)===i)))return false;
 if(s.b&&(!Array.isArray(s.b.hand)||!s.b.hand.every(c=>CARD[c.id])))return false;
 if(phase==='battle'&&(!s.b||!Array.isArray(s.b.enemies)||!s.b.enemies.length))return false;
 return true;
}
try{const s=JSON.parse(localStorage.getItem(SAVE));if(validSave(s))game=new Game(s);}catch{}
function save(){syncPlayTime();if(!game.s)return;archiveCurrent();try{localStorage.setItem(SAVE,JSON.stringify(game.s));saveError=false;}catch{saveError=true;}}
const recordArchiveInitial=loadRecordArchive();let recordArchive=recordArchiveInitial.records,recordError=recordArchiveInitial.error,archivedRunId=null,recordMode='turns',recordGroupSelection=null,recordPage=0;
const playClock=new PlayClock();
function loadRecordArchive(){try{return readRecords(localStorage);}catch(error){return {records:[],error};}}
function syncPlayTime(){playClock.sample(game.s,view==='game'&&!modal&&!document.hidden&&document.hasFocus(),performance.now());}
function archiveCurrent(){const candidate=clearRecordForState(game.s);if(!candidate||candidate.id===archivedRunId)return;try{recordArchive=storeRecords(localStorage,[candidate]);recordError=null;archivedRunId=candidate.id;}catch(error){recordError=error;recordArchive=mergeRecords(recordArchive,[candidate]);}}
function recordDate(value){return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function recordTime(ms){if(ms===null)return '未记录';const seconds=Math.floor(ms/1000);return seconds<60?'不足1分钟':`${Math.floor(seconds/3600)?Math.floor(seconds/3600)+'小时':''}${Math.floor(seconds/60)%60}分钟`;}
function recordGroupLabel(r){const version=r.clearVersion?(r.startVersion&&r.startVersion!==r.clearVersion?`v${r.startVersion} → v${r.clearVersion}`:`${r.startVersion?'':'旧档续玩 · '}v${r.clearVersion}`):'历史版本';return `${version} · ${r.routeLength}程 · ${r.ruleset==='classic'?'旧版规则':'进阶规则'}${r.snapshot==='legacy-finish'?' · 战后记录':''}${r.trialLevel?' · 历练'+r.trialLevel+'阶':''}${r.skirmishRevision?' · 群敌新招':''}${r.challengeRevision?' · 天赋挑战':''}`;}
function personalRecords(){
 const groups=[...new Map([...recordArchive].sort((a,b)=>b.completedAt-a.completedAt).map(r=>[recordGroup(r),r])).entries()];
 if(!groups.some(([key])=>key===recordGroupSelection))recordGroupSelection=groups[0]?.[0]||null;
 const ranked=rankRecords(recordArchive.filter(r=>recordGroup(r)===recordGroupSelection),recordMode),pages=Math.max(1,Math.ceil(ranked.length/20));recordPage=Math.max(0,Math.min(recordPage,pages-1));
 return `<p class="records-intro">只记录这台设备、当前浏览器的通关。另开新局仍会保留；可导出备份，换浏览器后再导入。</p>${recordError?'<p class="save-warning" role="alert">通关记录暂未成功保存，请导出备份。原有浏览器数据未被覆盖。</p>':''}<div class="record-overview"><div><strong>${recordArchive.length}</strong><span>次江湖留名</span></div><p>不同版本、规则、历练等阶与行程分别排名</p></div>${groups.length?`<label class="record-group-label">对局分组<select id="record-group" aria-label="通关榜分组">${groups.map(([key,r])=>`<option value="${escapeHTML(key)}" ${key===recordGroupSelection?'selected':''}>${escapeHTML(recordGroupLabel(r))}</option>`).join('')}</select></label><div class="record-tabs" role="group" aria-label="排行榜类型"><button data-action="record-mode" data-id="turns" aria-pressed="${recordMode==='turns'}">少回合榜</button><button data-action="record-mode" data-id="challenge" aria-pressed="${recordMode==='challenge'}">挑战榜</button></div><p class="record-sort">${recordMode==='turns'?'总战斗回合少者优先，相同时精英胜场多者优先':'精英胜场多者优先，相同时战斗回合少者优先'}；再比较出牌数和通关日期。</p><div class="record-list">${ranked.slice(recordPage*20,recordPage*20+20).map((r,i)=>`<button class="record-row" data-action="record-detail" data-id="${escapeHTML(r.id)}" aria-label="查看第${recordPage*20+i+1}名战绩"><span class="record-rank">${recordPage*20+i+1}</span>${playerFigure(r.player,'record-portrait')}<span class="record-row-copy"><strong>${escapeHTML(r.player.name)}</strong><small>${escapeHTML(recordDate(r.completedAt))}</small><span>${deckSize(r)}张武学 · ${refinedCount(r)}张精进 · ${r.relics.length}件奇物</span></span><span class="record-row-score"><strong>${recordMode==='turns'?r.stats.turns:eliteCount(r)}</strong><small>${recordMode==='turns'?'战斗回合':'精英胜场'}</small><span>${recordMode==='turns'?eliteCount(r)+'场精英':r.stats.turns+' 回合'}</span></span></button>`).join('')}</div>${pages>1?`<div class="record-pagination"><button data-action="record-page" data-key="-1" ${recordPage===0?'disabled':''}>上一页</button><span>${recordPage+1} / ${pages}</span><button data-action="record-page" data-key="1" ${recordPage===pages-1?'disabled':''}>下一页</button></div>`:''}`:'<div class="records-empty"><span>录</span><h3>江湖尚待留名</h3><p>通关三章后，你的构筑与战绩会自动留在这里。</p></div>'}<div class="record-backup"><button data-action="export-records" ${recordArchive.length?'':'disabled'}>导出通关记录</button><label class="record-import">导入通关记录<input id="import-records" type="file" accept="application/json,.json" aria-label="导入通关记录"></label></div>`;
}
function personalRecordDetail(r){
 const metrics=[['战斗回合',r.stats.turns],['精英胜场',eliteCount(r)],['战斗胜场',r.stats.wins],['累计出牌',r.stats.played],['剩余气血',`${r.hp} / ${r.maxHp}`],['游玩时长',recordTime(r.activeMs)],['剩余银两',r.gold],['击败敌人',r.stats.kills],['累计伤害',r.stats.damage],['消耗卡牌',r.stats.exhausted],['累计自损',r.stats.self],['携带奇物',r.relics.length]];
 return `<div class="record-detail-hero">${playerFigure(r.player,'record-portrait')}<div><span class="eyebrow">三章通关 · 江湖留名</span><h3>${escapeHTML(r.player.name)}</h3><p>${escapeHTML(recordDate(r.completedAt))}</p>${talentHTML(r.player)}</div></div><p class="record-snapshot-note">${r.snapshot==='boss-defeat'?'以下气血、银两与构筑锁定于最终首领倒下时，未计入战后恢复和奖励。':'历史存档补录：以下为战后结算数据，实际游玩时长未记录。'}</p><div class="record-metrics">${metrics.map(([name,value])=>`<div><small>${name}</small><strong>${escapeHTML(value)}</strong></div>`).join('')}</div><h3 class="record-section-title">通关武学 <small>${deckSize(r)}张 · ${refinedCount(r)}张精进</small></h3><div class="collection record-deck">${r.deck.map(c=>`<div class="record-card-stack"><span class="record-card-count">×${c.count}</span>${cardHTML(c,{read:true,compact:true})}</div>`).join('')}</div><h3 class="record-section-title">随身奇物 <small>${r.relics.length}件</small></h3><div class="relic-options">${r.relics.map(id=>relicHTML(id)).join('')||'<p class="muted">未携带奇物</p>'}</div><details class="record-route"><summary>查看实际路线 · ${r.routeLength}程</summary><ol>${r.route.map(n=>`<li><span>${n.step+1}</span><strong>${escapeHTML(n.place||`第${Math.floor(n.step/(r.routeLength/3))+1}章 · 第${n.step%(r.routeLength/3)+1}程`)}</strong><small>${NODE_NAMES[n.kind]}</small></li>`).join('')}</ol></details><p class="record-metadata">${escapeHTML(recordGroupLabel(r))}${r.bosses?'<br>此行首领 '+r.bosses.map(id=>escapeHTML(ENEMY[id].name)).join('、'):''}<br>随机种子 ${r.seed}</p><button class="card-back" data-action="close-modal">返回通关榜</button>`;
}

function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);}
const mountain=`<svg class="mountain-bg" viewBox="0 0 1000 650" width="100%" height="100%" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#76816b" stop-opacity=".12"/><stop offset="1" stop-color="#94a381" stop-opacity=".8"/></linearGradient></defs><circle cx="660" cy="128" r="62" fill="#bba57b" opacity=".25"/><path d="M0 470 125 320 204 385 376 120 474 270 532 230 709 440 805 280 1000 470V650H0Z" fill="url(#mist)"/><path d="m245 650 128-255 90 90 129-227 131 220 64-70 213 235v57z" fill="#52694f" opacity=".7"/><path d="m0 570 145-135 165 150 150-75 157 110 180-126 203 80v76H0Z" fill="#243c2b"/><path d="m565 226 30 21-5 49 23 14-20 50 55 68-51-39 5-66-37-20 16-32z" fill="#b4b79c" opacity=".14"/><path d="M-50 530Q300 480 550 540T1100 505M-50 560Q300 510 600 570T1100 550" fill="none" stroke="#bbc4a5" stroke-width="10" opacity=".09"/></svg>`;
function figure(enemy=false){return `<svg class="figure" viewBox="0 0 120 160" aria-hidden="true"><ellipse cx="60" cy="151" rx="35" ry="5" fill="#080e0b" opacity=".4"/><path d="M77 48 98 8 103 12 82 56" fill="#9b9d85"/><path d="m80 46 11 7" stroke="#c4a569" stroke-width="4"/><path d="m48 104-9 43 14 2 12-34 10 33 15-2-13-45" fill="#141c18"/><path d="M40 50Q61 39 79 53L88 112Q60 124 30 111Z" fill="${enemy?'#684c3c':'#60795e'}"/><path d="m44 57-20 38 12 8 20-27m19-17 20 32-9 8-24-28" fill="${enemy?'#7f5e48':'#819076'}"/><path d="m49 48 12 20 13-20-4 40-18-2" fill="#c4b997" opacity=".65"/><path d="M36 96 83 93" stroke="#282e23" stroke-width="8"/><path d="m63 98 31 17" stroke="#8c3d30" stroke-width="4"/><ellipse cx="60" cy="31" rx="14" ry="17" fill="#c1ac86"/><path d="M45 29Q42 6 61 8Q81 7 76 33L72 21 48 24" fill="#17201a"/><path d="m35 25 26-18 26 18-30 4z" fill="${enemy?'#3e3f2d':'#3d4d36'}"/><path d="m61 12-6-9" stroke="#16201a" stroke-width="7"/></svg>`;}
function playerFigure(profile=game.s.player,extra=''){const p=playerArtwork(profile);return `<img class="player-art ${extra}" src="${p.art}" alt="${p.title}立绘" width="200" height="280" draggable="false">`;}
function talentHTML(profile=game.s.player){const t=playerTalent(profile);return t?`<div class="talent-summary"><strong>${t.name}</strong><span>${t.text}</span></div>`:'';}
function characterPage(){
 const c=game.s.character,name=cleanPlayerName(c.name),error=game.characterError(),custom=c.editing||c.hero===undefined&&c.selectionMode!=='heroes'||c.selectionMode==='custom'||!c.selectionMode&&c.hero==='custom';
 const tabs=`<div class="gender-tabs" role="group" aria-label="角色性别"><button data-action="hero-gender" data-id="male" aria-pressed="${heroGender==='male'}">男性 · ${ (custom?PLAYERS:HEROES).filter(h=>h.gender==='male').length}位</button><button data-action="hero-gender" data-id="female" aria-pressed="${heroGender==='female'}">女性 · ${ (custom?PLAYERS:HEROES).filter(h=>h.gender==='female').length}位</button></div>`;
 const roster=`${tabs}<div class="portrait-grid named-heroes">${HEROES.filter(h=>h.gender===heroGender).map(h=>`<button class="portrait-choice ${h.id===c.hero?'selected':''}" data-action="hero-select" data-id="${h.id}" aria-label="选择${h.name}" aria-pressed="${h.id===c.hero}">${playerFigure({hero:h.id,portrait:h.portrait})}<strong>${h.name}</strong><span class="hero-talent-name">${playerTalent(h).name}</span><p class="hero-talent-text">${playerTalent(h).text}</p><span>${h.id===c.hero?'已选择':'选择侠客'}</span></button>`).join('')}</div>`;
 const form=`<label class="name-label" for="hero-name">侠客姓名</label><div class="name-input-row"><input id="hero-name" aria-label="侠客姓名" value="${escapeHTML(c.name)}" maxlength="24" placeholder="给你的侠客起个名字" autocomplete="off" spellcheck="false" aria-describedby="hero-name-help"><span id="hero-name-count">${Array.from(name).length} / 12</span></div><small id="hero-name-help">最多12个字。</small>${tabs}<div class="portrait-grid">${PLAYERS.filter(d=>d.gender===heroGender).map(d=>`<button class="portrait-choice ${d.id===c.portrait?'selected':''}" data-action="hero-portrait" data-id="${d.id}" aria-label="选择${d.title}（${d.gender==='male'?'男':'女'}）" aria-pressed="${d.id===c.portrait}">${playerFigure({portrait:d.id,...(c.editing?{hero:c.hero}:{})})}<strong>${c.editing&&HEROES.some(h=>h.id===c.hero&&h.portrait===d.id)?HERO[c.hero].name+' · 原貌':d.title}</strong><small>${d.description}</small><span>${d.id===c.portrait?'已选择':'选择立绘'}</span></button>`).join('')}</div>${!c.editing&&c.hero==='custom'?`<h3 class="talent-heading">选择一项通用天赋</h3><div class="talent-options" role="group" aria-label="通用天赋">${TALENTS.filter(t=>t.common).map(t=>`<button data-action="hero-talent" data-id="${t.id}" aria-pressed="${c.talent===t.id}" aria-label="选择天赋${t.name}"><strong>${t.name}</strong><span>${t.text}</span></button>`).join('')}</div>`:talentHTML(c)}`;
 return `<div class="heading"><div><div class="eyebrow">${c.editing?'侠客档案 · 更名易容':'初入江湖 · 选择侠客'}</div><h2>${c.editing?'换一身行装，仍是你的江湖':'选择侠客'}</h2><p>${c.editing?'可更名、换装，天赋不变。':'选名侠或自创侠客，带上天赋出发。'}</p></div></div><div class="character-layout"><section class="character-form" aria-label="侠客与天赋选择">${c.editing?'':`<div class="gender-tabs identity-tabs" role="group" aria-label="侠客来源"><button data-action="hero-mode" data-id="heroes" aria-pressed="${!custom}">正派名侠</button><button data-action="hero-mode" data-id="custom" aria-pressed="${custom}">自创侠客</button></div>`}${custom?form:roster}${!custom&&HEROES.some(h=>h.id===c.hero)?`<div class="hero-selection"><h3>${escapeHTML(c.name)} · ${HERO[c.hero].description}</h3>${talentHTML(c)}</div>`:''}<p class="character-rule">${c.hero===undefined?'此侠客没有天赋。':'天赋选定后，本局不能更换。'}</p><div class="character-footer"><span id="hero-form-error" class="muted" aria-live="polite">${escapeHTML(error||'已选好侠客')}</span><div>${c.editing?'<button data-action="hero-cancel">取消修改</button>':''}<button class="primary" id="hero-confirm" data-action="hero-confirm" ${error?'disabled':''}>${c.editing?'保存姓名与立绘':'确认侠客，领取机缘 →'}</button></div></div></section></div>`;
}
function combatCardDescription(c,{selections=[],selectionKnown=false}={}){
 const key=`${c.uid}:${!!c.up}:${target}:${selectionKnown}:${selections.join(',')}`;
 if(!combatDescriptionCache.has(key))combatDescriptionCache.set(key,describeCombatCardHTML(game,c,target,{selections,selectionKnown}));
 return combatDescriptionCache.get(key);
}
function cardHTML(c,{action='',uid=null,read=false,battle=false,choice=false,compact=false,handIndex=null}={}){
 const d=CARD[c.id],rar=d.rarity,art=cardArtwork(c.id),live=battle||modal?.type==='select'||modal?.type==='pile'&&modal.id==='hand'||modal?.type==='card'&&modal.live;
 const reason=battle?game.reason(c):'',inspectable=battle&&!read&&matchMedia('(max-width:900px)').matches,label=`${d.name}${c.up?'·精进':''}`;
 const fanPosition=handIndex===null?0:game.s.b.hand.length<2?0:(handIndex/(game.s.b.hand.length-1)*2-1);
 // A small hand closes into the centre instead of stretching to both dock edges.
 const fanTilt=handIndex===null?0:Math.min(14,(game.s.b.hand.length-1)*4);
 const fanStyle=handIndex===null?'':`style="--fan-position:${fanPosition};--fan-angle:${fanPosition*fanTilt}deg;--fan-drop:${fanPosition*fanPosition*fanTilt}px;--fan-order:${handIndex+1}"`;
 if(compact)action='inspect-card';
 const attr=action?`data-action="${action}" ${uid!==null?`data-uid="${uid}"`:''} data-id="${d.id}" ${compact?`data-refined="${c.up?'1':'0'}"`:''}`:'';
 return `<${read&&!compact?'article':'button'} class="card ${d.type} r${rar} ${c.up?'up':''} ${read?'readonly':''} ${compact?'compact-card':''} ${inspectable&&reason?'unavailable':''} ${inspectable&&inspectedCard===c.uid?'inspected':''} ${choice&&selected.includes(c.uid)?'selected':''}" ${attr} ${fanStyle} ${battle&&reason&&!read&&!inspectable?'disabled':''} ${inspectable?`aria-expanded="${inspectedCard===c.uid}"`:''} ${!read||compact?`aria-label="${label}${battle&&reason?'，'+reason:''}"`:''}>
 ${cardCostHTML(game,c,{live})}<div class="type">${TYPE[d.type]}${c.up?' · 精进':''}</div><h3>${label}</h3>${battle&&!read?`<span class="folded-name" aria-hidden="true">${escapeHTML(d.name)}${c.up?'<small>精进</small>':''}</span>`:''}${art?`<img class="card-art" src="${art.art}" alt="${art.label}意境插画" width="480" height="320" loading="${battle?'eager':'lazy'}" decoding="async" draggable="false">`:''}<div class="description">${live?combatCardDescription(c):describe(c)}</div><footer><span>${d.path}</span><span>${RARITY[rar]||''}</span></footer>${read?`<div class="card-source">${d.source}</div>`:''}${battle&&reason?`<div class="unplayable">${reason}</div>`:''}</${read&&!compact?'article':'button'}>`;
}
function relicHTML(id,action='',extra=''){const r=RELIC[id];return `<${action?'button':'article'} class="relic-option" ${action?`data-action="${action}" data-id="${id}"`:''} ${extra}><div class="relic-option-head">${relicIcon(id)}<div><div class="eyebrow">${['初始','随身','珍奇','镇派'][r.tier]}</div><h3>${r.name}</h3></div></div><p>${r.text}</p><small>${r.source}</small></${action?'button':'article'}>`;}
function home(){
 const resumable=!!game.s,profile=resumable?`${escapeHTML(game.s.player.name)} · 第${game.chapter+1}章 · ${Math.min(game.s.step+1,game.totalSteps)}/${game.totalSteps}程`:'十招起步，沿途习武，自成一家';
 return `<div class="home"><nav class="home-nav" aria-label="首页导航"><div class="brand"><span class="seal">侠</span><div><strong>一局江湖</strong><small>武侠卡牌冒险</small></div></div><div class="home-links"><button class="small" data-action="appearance" aria-label="切换江湖配色">配色</button><button class="small" data-action="enemy-book">群敌录</button><button class="small" data-action="catalogue">图鉴 →</button></div></nav><section class="home-hero" aria-label="一局江湖封面"><img class="home-cover" src="${HOME_COVER.art}" alt="${HOME_COVER.label}" width="${HOME_COVER.width}" height="${HOME_COVER.height}" fetchpriority="high" decoding="async"><div class="home-cover-copy"><div class="eyebrow">以牌入江湖 · 以武问山河</div><h1><span>一局</span><span>一江湖</span></h1><p>从无名侠客，到华山论剑。</p></div><span class="home-cover-note" aria-hidden="true">牌由你组 · 路由你行</span></section><section class="home-entry" aria-label="开始冒险"><button class="primary home-start" data-action="${resumable?'continue':'new'}"><span><strong>${resumable?'继续此局':'踏入江湖'}</strong><small>${profile}</small></span><b aria-hidden="true">→</b></button><div class="intro-actions">${resumable?'<button data-action="new">另启新程</button>':''}<button data-action="help">初入须知</button><button data-action="records">通关榜</button></div></section><section class="home-bottom" aria-label="江湖一览"><div><strong>80<small> 招</small></strong><span>武学技法</span></div><div><strong>30<small> 件</small></strong><span>随身奇物</span></div><div><strong>45<small> 程</small></strong><span>三章江湖</span></div></section><footer class="home-footer"><span>一局一江湖，取舍皆由你</span><span>v${GAME_VERSION} · 自动存档</span></footer></div>`;
}
function header(){const s=game.s;return `<header class="topbar"><dl class="stats" aria-label="侠客状态"><div class="top-stat hp"><dt>气血</dt><dd><strong>${s.hp}</strong><small>/ ${s.maxHp}</small></dd></div><div class="top-stat gold-stat"><dt>银两</dt><dd><strong>${s.gold}</strong></dd></div><div class="top-stat journey-stat"><dt>行程</dt><dd><strong>${Math.min(s.step+1,game.totalSteps)}</strong><small>/ ${game.totalSteps}</small></dd></div></dl><div class="top-actions"><span class="build-badge" aria-label="游戏版本 v${GAME_VERSION}">v${GAME_VERSION}</span><button class="small" data-action="deck">牌组 ${s.deck.length}</button><button class="small" data-action="relics">奇物 ${s.relics.length}</button><button class="small desktop-only" data-action="help">须知</button><button class="small" data-action="menu">菜单</button></div></header>`;}
function sidebar(){const s=game.s,ch=CHAPTERS[game.chapter];return `<aside class="side"><div class="brand"><span class="seal">侠</span><div><strong>一局江湖</strong><small>A MARTIAL JOURNEY</small></div></div><div class="side-chapter"><span class="eyebrow">第 ${game.chapter+1} 章 / 共三章${trialLevel(s)?' · 历练'+trialLevel(s)+'阶':''}</span><h3>${ch.name}</h3><small>${ch.place}</small><div class="journey-bar">${Array.from({length:game.totalSteps},(_,i)=>`<i class="${i<s.step?'done':''}"></i>`).join('')}</div></div><nav><button data-action="map"><b>⌁</b> 江湖行程</button><button data-action="deck"><b>▤</b> 我的武学 <small>${s.deck.length}</small></button><button data-action="relics"><b>◇</b> 随身奇物 <small>${s.relics.length}</small></button><button data-action="catalogue"><b>冊</b> 武学图鉴</button><button data-action="edit-player"><b>侠</b> 姓名与立绘</button><button data-action="enemy-book"><b>劍</b> 江湖群敌</button><button data-action="help"><b>?</b> 初入须知</button></nav><div class="side-foot">${ch.quote}<br>牌由你组，路由你行<br><span class="version">v${GAME_VERSION} · ${saveError?'存档受限':'进度已自动保存'}</span></div></aside>`;}
function mapBoard(interactive=true){
 const s=game.s,ch=mapViewChapter??game.chapter,map=game.chapterMap(ch),height=map.rows.length*96+210,base=ch*game.chapterLength;
 const visited=new Set(s.journey?s.journey.path:s.history.filter(h=>Math.floor(h.step/6)===ch).map(h=>map.rows[h.step%6].find(n=>n.kind===h.kind)?.id));
 const active=s.journey?.active||(!s.journey&&game.chapter===ch&&s.phase!=='map'?map.rows[game.chapterStep].find(n=>n.kind===s.scene?.kind)?.id:null);
 const available=new Set(interactive&&ch===game.chapter?game.availableNodes.map(n=>n.id):[]),byId=Object.fromEntries(map.nodes.map(n=>[n.id,n]));
 const point=n=>({x:n.x*7.2,y:height-125-n.floor*96+(n.yOffset||0)});
 const edgeHTML=map.edges.map(([a,b])=>{const p=point(byId[a]),q=point(byId[b]),walked=visited.has(a)&&(visited.has(b)||b===active),next=visited.has(a)&&available.has(b);return `<path class="travel-road ${walked?'walked':next?'next':''}" d="M${p.x} ${p.y}C${p.x} ${p.y-48} ${q.x} ${q.y+48} ${q.x} ${q.y}"/>`;}).join('');
 const focus=map.nodes.find(n=>available.has(n.id))||byId[active]||map.rows[0][0],here=s.journey?.path.at(-1);
 return `<section class="travel-map" aria-label="${CHAPTERS[ch].name}行路图"><div class="travel-map-toolbar"><div class="travel-chapters" role="group" aria-label="查看章节地图">${CHAPTERS.map((c,i)=>`<button data-action="map-chapter" data-key="${i}" aria-pressed="${i===ch}" aria-label="查看第${i+1}章${c.name}"><small>第${i+1}章</small><span>${c.name}</span>${i<game.chapter?'<i>已过</i>':i===game.chapter?'<i>此行</i>':''}</button>`).join('')}</div><button class="quiet small map-locate" data-action="map-locate">定位此行 ⌖</button></div><div class="travel-map-scroll" tabindex="0" aria-label="上下滚动查看江湖路线" data-map-key="${ch}" data-map-focus="${point(focus).y}"><div class="travel-canvas" style="height:${height}px">${travelTerrain(ch,height)}<svg class="travel-roads" viewBox="0 0 720 ${height}" preserveAspectRatio="none" aria-hidden="true">${edgeHTML}</svg><div class="map-compass" aria-hidden="true">北<span>✧</span></div><div class="travel-destination"><span>第${ch+1}章 · ${map.rows.length}程</span><strong>${ch===0?'青城山门':ch===1?'星宿石台':'华山绝顶'}</strong><small>守关 · 守关人</small></div>${[3,8,12].filter(i=>i<map.rows.length-1).map((floor,i)=>`<span class="travel-area" style="top:${height-125-floor*96}px;${i%2?'right:4%':'left:4%'}">${[['烟雨水乡','古道深处','山门在望'],['中州旷野','群山藏锋','险峰之上'],['云起西岳','栈道悬空','剑指绝巅']][ch][i]}</span>`).join('')}${map.nodes.map(n=>{const pos=point(n),done=visited.has(n.id),open=available.has(n.id),isHere=n.id===active||n.id===here,passed=base+n.floor<s.step;return `<button class="travel-node kind-${n.kind} ${done?'visited':passed?'bypassed':''} ${open?'available':''} ${isHere?'here':''}" style="left:${n.x}%;top:${pos.y}px" data-action="enter-node" data-id="${n.id}" ${!open?'disabled':''} aria-label="${n.kind==='boss'?'守关之地':n.name} · ${NODE_NAMES[n.kind]}${open?' · 可前往':done?' · 已走过':isHere?' · 当前地点':' · 暂不可达'}"><span class="travel-node-mark">${travelMark(n.kind)}${done?'<i>✓</i>':''}</span><strong>${n.kind==='boss'?'守关之地':n.name}</strong><small>${NODE_NAMES[n.kind]}</small></button>`;}).join('')}<div class="travel-origin"><span>此行始于</span><strong>${CHAPTERS[ch].place}</strong></div></div></div><div class="travel-legend"><span><i class="legend-current"></i>可前往</span><span><i class="legend-done"></i>已走过</span><span>沿相连的路向上行进</span></div></section>`;
}
function openingPage(){
 const o=game.s.opening,option=o.options.find(x=>x.id===o.selected),d=OPENING_BOONS.find(x=>x.id===o.selected);
 const intro=`<div class="eyebrow">初次出山 · 山门赠别</div><h2>临行赠礼</h2><p>十招基础武学，一只粗布药囊。<br>山中老者为你备下四份机缘，任选其一，再入江湖。</p>`;
 if(o.result){
  const extra=['relicWound','relicCurse'].includes(option.id)?relicHTML(option.relic):option.id==='rareToll'?cardHTML({id:option.card},{read:true}):'';
  return `<div class="center-box opening-page">${intro}<div class="opening-result info-box"><span class="eyebrow">${d.title} · 已领取</span><h3>${escapeHTML(o.result)}</h3>${extra}</div><button class="primary" data-action="opening-leave">带上机缘，踏入江湖 →</button></div>`;
 }
 if(option){
  const cards=option.id==='insight'?option.cards.map(id=>({id,up:false})):game.s.deck.filter(c=>option.id!=='refine'||!c.up);
  return `<div class="opening-page"><div class="heading"><div><div class="eyebrow">山门赠别 · ${d.title}</div><h2>${option.id==='refine'?'选择一张牌，永久精进':option.id==='simplify'?'选择一张牌，永久移除':'三卷残篇，取其一'}</h2><p>${option.id==='refine'?'下方预览精进后的效果。选定后立即生效。':d.text}</p></div><button data-action="opening-back">返回重选</button></div><div class="collection opening-cards">${cards.map(c=>cardHTML(option.id==='refine'?{...c,up:true}:c,{action:'opening-card',uid:c.uid??null})).join('')}</div></div>`;
 }
 return `<div class="center-box opening-page">${intro}<div class="opening-options">${o.options.map((x,i)=>{const boon=OPENING_BOONS.find(d=>d.id===x.id);return `<button class="opening-option" data-action="opening-choice" data-id="${x.id}" aria-label="选择${boon.title}"><span class="opening-number">0${i+1}</span><span class="tag ${boon.risk?'':'gold'}">${boon.risk?'有代价':'赠礼'}</span><h3>${boon.title}</h3><p>${boon.text}</p><small>选择这份机缘 →</small></button>`;}).join('')}</div><small></small></div>`;
}
function mapPage(){
 const s=game.s,ch=CHAPTERS[game.chapter],next=game.availableNodes,kinds=[...new Set(next.map(n=>NODE_NAMES[n.kind]))];
 return `<div class="heading travel-heading"><div><div class="eyebrow">江湖行路图 · 第${game.chapter+1}章 / 共三章${trialLevel(s)?' · 历练'+trialLevel(s)+'阶':''}</div><h2>${ch.name}<small>第 ${game.chapterStep+1} / ${game.chapterLength} 程</small></h2><p>${s.journey?'选择亮起的地点，继续赶路。':'沿原有行程继续赶路。'}</p></div></div><div class="travel-layout">${mapBoard()}<aside class="travel-summary"><section class="info-box"><span class="eyebrow">下一站</span><h3>${kinds.join(' / ')}</h3><p>沿相连的路线前进。</p><div class="travel-progress"><span>走过 ${s.step} 程</span><span>全程 ${game.totalSteps} 程</span><i><b style="width:${s.step/game.totalSteps*100}%"></b></i></div></section><section class="info-box travel-belongings">${talentHTML(s.player)}<span class="eyebrow">此行行囊</span><h3>${s.deck.length} 招武学 · ${s.relics.length} 件奇物</h3><div class="relic-strip">${s.relics.slice(-5).map(id=>`<button class="relic-token" data-action="relic-detail" data-id="${id}">${relicIcon(id)}<span>${RELIC[id].name}</span></button>`).join('')}</div><small></small></section></aside></div>`;
}
function statusHTML(){const b=game.s.b;return `${b.str?`<button class="status-chip" data-action="combat-rules" data-id="str">劲力 ${b.str}</button>`:''}${b.weak?`<button class="status-chip red" data-action="combat-rules" data-id="weak">虚弱 ${b.weak}</button>`:''}${b.vuln?`<button class="status-chip red" data-action="combat-rules" data-id="vuln">破绽 ${b.vuln}</button>`:''}${b.poison?`<button class="status-chip red" data-action="combat-rules" data-id="poison">中毒 ${b.poison}</button>`:''}${b.qiPenalty?`<button class="status-chip red" data-action="combat-rules" data-id="chill">寒气 · 真气−${b.qiPenalty}</button>`:''}${b.repeat?`<button class="status-chip" data-action="combat-rules" data-id="power">互搏额外 ${Number(b.repeat)} 次</button>`:''}${b.discount?`<span class="status-chip">技法减费 ${b.discount}</span>`:''}${game.reflectionStacks('next')?`<span class="status-chip">单段反震 ×${game.reflectionStacks('next')}</span>`:''}${game.reflectionStacks('round')?`<span class="status-chip">本轮反震 ×${game.reflectionStacks('round')}</span>`:''}`;}
function enemyFigure(e){const d=ENEMY[e.id];return d?`<img class="enemy-art" src="${d.art}" alt="${d.name}立绘" width="200" height="250" draggable="false">`:figure(true);}
function handPreview(){
 const enemy=game.s.b.enemies.find(e=>e.key===target&&e.hp>0)||game.s.b.enemies.find(e=>e.hp>0);
 const panels=game.s.b.hand.map((c,index)=>{
  const d=CARD[c.id],reason=game.reason(c),art=cardArtwork(c.id),label=`${d.name} · 完整牌面`;
  return `<article class="hand-preview-card" data-preview-uid="${c.uid}" data-label="${label}" ${c.uid===inspectedCard?'':'hidden'}><div class="preview-switcher"><button data-action="inspect-prev" aria-label="上一张手牌" ${game.s.b.hand.length<2?'disabled':''}>‹</button><small>${index+1}/${game.s.b.hand.length}</small><button data-action="inspect-next" aria-label="下一张手牌" ${game.s.b.hand.length<2?'disabled':''}>›</button></div><div class="preview-card-title">${cardCostHTML(game,c,{live:true,preview:true})}<h3>${d.name}${c.up?'·精进':''}</h3><small>${TYPE[d.type]}</small></div><div class="preview-card-body">${art?`<img src="${art.art}" alt="${art.label}意境插画" width="72" height="70" draggable="false" decoding="async">`:''}<div class="preview-effect" tabindex="0" aria-label="招式效果">${combatCardDescription(c)}</div></div><div class="hand-preview-action"><small>${escapeHTML(reason||(d.type==='a'?'目标：'+(enemy?.name||'无'):'选定后出招'))}</small><button class="primary" data-action="play-inspected" data-uid="${c.uid}" ${reason?'disabled':''}>${reason?'暂不能出招':'出招 →'}</button></div></article>`;
 }).join('');
 return `<section class="hand-preview compact-preview" role="region" aria-label="${game.s.b.hand.find(c=>c.uid===inspectedCard)?CARD[game.s.b.hand.find(c=>c.uid===inspectedCard).id].name+' · 完整牌面':'手牌预览'}" ${inspectedCard===null?'hidden':''}><button class="preview-close quiet" data-action="close-card-preview" aria-label="收起牌面">✕</button>${panels}</section>`;
}
function vitalsHTML(hp,maxHp,block){
 const safeHp=Math.max(0,hp),safeBlock=Math.max(0,block||0),blockMax=Math.max(maxHp,safeBlock);
 return `<div class="combat-vitals"><div class="health-bar" role="meter" aria-label="气血" aria-valuemin="0" aria-valuemax="${maxHp}" aria-valuenow="${safeHp}"><span style="width:${safeHp/maxHp*100}%"></span><b>气血 ${safeHp} / ${maxHp}</b></div><div class="block-bar" role="meter" aria-label="格挡" aria-valuemin="0" aria-valuemax="${blockMax}" aria-valuenow="${safeBlock}" title="格挡 ${safeBlock}"><span style="width:${Math.min(100,safeBlock/maxHp*100)}%"></span><b>格挡 ${safeBlock}</b></div></div>`;
}
function powersHTML(){return Object.keys(game.s.b.powers).map(id=>{const copies=game.powerCopies(id),up=copies.filter(Boolean).length,detail=`普通${copies.length-up}份，精进${up}份。`+[...new Set(copies)].map(refined=>describe({id,up:refined})).join(' ');return `<span class="power" title="${escapeHTML(detail)}" aria-label="${CARD[id].name}，${escapeHTML(detail)}">${CARD[id].name}${copies.length>1?' ×'+copies.length:up?'⁺':''}</span>`;}).join('')||'<small>尚未运起心法</small>';}
function enemyActionHTML(action,heading='当前意图'){
 const title=action.state==='dead'?'已击败':action.state==='waiting'?'下轮参战':heading;
 return `<div class="enemy-plan" role="group" aria-label="${escapeHTML(title+(action.tags.length?'：'+action.tags.map(t=>t.text).join('，'):''))}"><small class="enemy-plan-heading">${escapeHTML(title)}</small><div class="enemy-plan-tags">${action.tags.map(t=>`<span class="enemy-action-tag ${t.kind}">${enemyActionTagHTML(t)}</span>`).join('')}</div></div>`;
}
function battlePage(){const s=game.s,b=s.b;if(!b.enemies.some(e=>e.key===target&&e.hp>0))target=b.enemies.find(e=>e.hp>0)?.key||0;
 return `<div class="battle-top"><span class="eyebrow">${escapeHTML(s.scene?.place||CHAPTERS[game.chapter].place)}${b.formation?' · '+b.formation:''}</span><span class="round">第 ${b.turn} 回合</span><span class="tag">${NODE_NAMES[b.kind]} · ${b.enemies.filter(e=>e.hp>0).length}人</span><button class="quiet small" data-action="enemy-info">敌情</button><button class="quiet small" data-action="battle-log">查看战报</button></div>${b.openDart?'<div class="info-box" style="padding:12px;margin-bottom:15px">金蛇锥待发：先选中一名敌人，再 <button class="small gold-btn" data-action="dart">投出金蛇锥 · 8伤害</button></div>':''}<div class="battlefield" data-enemies="${b.enemies.length}">${battleBackdrop(game.chapter)}<div class="player"><div class="fighter-intent player-intent">${playerTalent(s.player)?`<button class="player-talent-chip" data-action="talent-detail" aria-label="查看天赋${playerTalent(s.player).name}">${playerTalent(s.player).name}</button>`:''}${playerTalent(s.player)?'':'<span>你的回合</span>'}<small>你的回合 · 见招拆招</small></div>${playerFigure()}<div class="player-details"><div class="player-name">${escapeHTML(s.player.name)}</div>${vitalsHTML(s.hp,s.maxHp,b.block)}<div class="status-row">${statusHTML()}</div></div></div><div class="enemies">${b.enemies.map((e,i)=>`<button class="enemy rank-${ENEMY[e.id]?.rank||'normal'} ${e.hp<=0?'dead':''} ${e.key===target?'selected':''}" data-action="target" data-key="${e.key}" aria-label="选中${e.name}" ${e.hp<=0?'disabled':''}><span class="target-marker" aria-label="敌方出手序号${i+1}${e.key===target?'，已选中':''}">${i+1}${e.key===target?' · 已选中':''}${e.callSign?' · '+e.callSign:''}</span><div class="fighter-intent">${enemyActionHTML(enemyActionView(game,e))}</div>${enemyFigure(e)}<h3>${ENEMY[e.id]?.name||e.name}</h3><span class="enemy-faction">${ENEMY[e.id]?.faction||''}${e.role?' · '+e.role:''}${e.enraged?' · '+(e.phaseName||'逆练阶段'):''}</span>${vitalsHTML(e.hp,e.maxHp,e.block)}<div class="status-row">${e.str?`<span class="status-chip">劲力 ${e.str}</span>`:''}${e.weak?`<span class="status-chip red">虚弱 ${e.weak}</span>`:''}${e.vuln?`<span class="status-chip red">破绽 ${e.vuln}</span>`:''}${e.charge?`<span class="status-chip">蓄力 ${e.charge}</span>`:''}${e.pin?`<span class="status-chip">首击−${e.pin}</span>`:''}</div></button>`).join('')}</div></div><div class="powers">${powersHTML()}</div>${handPreview()}<div class="battle-bottom"><div class="hand-panel"><div class="hand-title"><span>手牌 ${b.hand.length} / 10 · ${matchMedia('(max-width:900px)').matches?'左右滑选牌，再确认出招':'点击武学出招'}</span><button class="quiet small hand-inspect" data-action="pile" data-id="hand" aria-label="查看手牌完整说明">完整说明 →</button></div><div class="hand" style="--hand-count:${Math.max(1,b.hand.length)}" data-count="${b.hand.length}">${b.hand.map((c,i)=>cardHTML(c,{action:'play',uid:c.uid,battle:true,handIndex:i})).join('')||'<div class="empty">手中无招，静待下一回合。</div>'}</div><div class="battle-help">${game.has('R29')?'广陵散：首回合少抽2张　':''}${game.has('R30')?'鸳鸯刀：每回合少抽1张　':''}</div></div><div class="turn-panel"><div class="turn-controls" role="group" aria-label="回合操作"><div class="energy"><div class="energy-orb">${b.qi}</div><div><span>真气</span><small>每回合恢复 ${game.qiMax}</small></div></div><button class="primary" data-action="end-turn">结束回合 →</button></div><button class="small" data-action="auto-turn">辅助出招一回合</button><div class="piles"><button data-action="pile" data-id="draw">抽牌 ${b.draw.length}</button><button data-action="pile" data-id="discard">弃牌 ${b.discard.length}</button><button data-action="pile" data-id="exhaust">消耗 ${b.exhaust.length}</button></div></div></div><details class="combat-log"><summary>本场战报 · 最近行动</summary><div class="log-lines">${b.log.slice(-18).reverse().map(x=>`<div>${x}</div>`).join('')}</div></details>`;
}
function journeyHero(kind,kicker,title,text){return `<header class="journey-hero"><div class="journey-hero-copy"><div class="eyebrow">${escapeHTML(kicker)}</div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(text)}</p></div>${journeyScene(kind)}</header>`;}
function journeyHeading(title,note=''){return `<div class="journey-section-head"><h3>${title}</h3>${note?`<small>${note}</small>`:''}</div>`;}
function journeyResult(message){
 const items=journeyResultItems(game.s,message);
 return `<section class="journey-result"><div class="journey-result-note">${journeyIcon('check')}<p>${escapeHTML(message)}</p></div>${items.cards.length?`<div class="journey-result-cards">${items.cards.map(c=>`<div class="journey-received-card"><small>${c.change}</small>${cardHTML(c,{read:true,compact:true})}</div>`).join('')}</div>`:''}${items.relics.length?`<div class="relic-options journey-relics">${items.relics.map(id=>relicHTML(id)).join('')}</div>`:''}</section>`;
}
function rewardPage(){const r=game.s.reward;return `<div class="journey-page reward-page">${journeyHero('reward',r.boss?'章节奖励':'战后奖励',r.boss?'首领已败':'交锋获胜','选一张武学，或跳过奖励。')}<div class="journey-receipt">${journeyIcon('coins')}<strong>+${r.gold}</strong><span>银两已入账</span><small>${r.boss?'离开时进行章节整备':''}</small></div><section class="journey-section">${journeyHeading('武学残卷','三卷择一 · 也可跳过')}${r.cardDone?`<div class="journey-confirmed">${journeyIcon('check')}武学奖励已处理</div>`:`<div class="journey-card-grid reward-cards">${r.cards.map(id=>cardHTML({id,up:false},{action:'take-card'})).join('')}</div><button class="journey-skip" data-action="skip-card">跳过武学</button>`}</section>${r.relics.length?`<section class="journey-section">${journeyHeading(r.boss?'镇派奇物':'高手所藏',r.boss?'取其一 · 留意代价':'选择一件奇物')}${r.relicDone?`<div class="journey-confirmed">${journeyIcon('check')}奇物奖励已处理</div>`:`<div class="relic-options journey-relics">${r.relics.map(id=>relicHTML(id,'take-relic')).join('')}</div><button class="journey-skip" data-action="skip-relic">放弃奇物</button>`}</section>`:''}<footer class="journey-footer"><small>${!r.cardDone||!r.relicDone?'选取或跳过奖励后继续。':''}</small><button class="primary" data-action="leave-reward" ${!r.cardDone||!r.relicDone?'disabled':''}>${game.s.step===game.totalSteps-1?'完成论剑，查看此局':'继续前行'} ${journeyIcon('arrow')}</button></footer></div>`;}
const events={master:{glyph:'师',title:'松下遇高人',text:'青衫老者看过你的拳路，微微颔首：“招式有形，心意无穷。”',options:[['请教武学','随机习得一张非基础武学，流派不限。'],['融会旧招','随机永久精进一张非基础武学。']]},shrine:{glyph:'缘',title:'破庙藏珍',text:'佛座之下藏着一件旧物。取与不取，皆在一念之间。',options:[['取走奇物','获得一件奇物；永久牌组加入一张心魔。'],['静坐片刻','回复12气血。']]},traveller:{glyph:'药',title:'药香过渡口',text:'行医人背着药箱走过石桥，问你是否需要一剂养元方。',options:[['购入养元方','支付35银两，气血上限+8，并回复8气血。'],['护送一程','获得35银两。']]},cliff:{glyph:'崖',title:'绝壁留书',text:'山风拨开藤蔓，石壁上露出半页武学。要看分明，须冒些险。',options:[['攀崖求书','失去6气血，获得一张随机绝学。'],['沿路而行','获得25银两。']]}};
Object.assign(events,{
 clinic:{glyph:'药',title:'山野药庐',text:'竹门半掩，炉上药香正浓。老医者看你一路风尘，推来一盏温茶。',options:[['求一剂汤药','支付25银两，回复18气血。'],['清泉洗尘','不花银两，回复6气血。']]},
 cache:{glyph:'匣',title:'行脚人的旧匣',text:'桥边老者守着一只旧木匣，说是多年行走江湖留下的随身之物。',options:[['买下旧匣','支付55银两，获得一件随机随身奇物。'],['搭一把手','帮老者搬运旧箱，获得20银两。']]},
 stone:{glyph:'碑',title:'残碑悟武',text:'苔痕之下留着数行拳理。山风过处，你忽然看出那些旧招还有未尽之意。',options:[['参悟攻招','随机永久精进一张尚未精进的攻击牌。'],['揣摩技法','随机永久精进一张尚未精进的技法牌。']]},
 ferry:{glyph:'渡',title:'渡口试手',text:'船家把长篙往岸边一横，笑道：“江上风浪不小，先让我看看你的身手。”',options:[['切磋几招','失去5气血，获得一张随机优质武学。'],['撑篙渡人','替船家撑篙一程，获得20银两。']]}
});
function treasurePage(){const sc=game.s.scene;return `<div class="journey-page treasure-page">${journeyHero('treasure',(sc.place||'江湖遗藏')+' · 山水有馈','发现遗藏','选一件奇物，或取65银两。')}${sc.claimed?`${journeyResult(sc.claimed)}<footer class="journey-footer"><small></small><button class="primary" data-action="finish-node">继续赶路 ${journeyIcon('arrow')}</button></footer>`:`<section class="journey-section">${journeyHeading('匣中旧物','二者取一')}<div class="relic-options journey-relics">${sc.relics.map(id=>relicHTML(id,'take-treasure')).join('')}</div></section><button class="journey-coin-choice" data-action="take-treasure" data-id="coins">${journeyIcon('coins')}<span><strong>取走银两</strong><small>不取奇物，留作沿途所需</small></span><b>+65</b>${journeyIcon('arrow')}</button>`}</div>`;}
function eventPage(){const s=game.s,sc=s.scene,e=events[sc.event];const optionIcons={master:['book','book'],shrine:['chest','tea'],traveller:['heal','coins'],cliff:['book','coins'],clinic:['heal','tea'],cache:['chest','coins'],stone:['book','book'],ferry:['book','coins']};return `<div class="journey-page event-page">${journeyHero(sc.event,(sc.place||CHAPTERS[game.chapter].place)+' · 江湖奇遇',e.title,e.text)}${sc.result?`${journeyResult(sc.result)}<footer class="journey-footer"><small></small><button class="primary" data-action="finish-node">继续赶路 ${journeyIcon('arrow')}</button></footer>`:`<section class="journey-section">${journeyHeading('如何应对','只选其一')}<div class="journey-choices">${e.options.map(([title,text],i)=>{const disabled=i===0&&sc.event==='clinic'&&s.gold<25||i===0&&sc.event==='cache'&&(s.gold<55||!RELICS.some(r=>r.tier===1&&!s.relics.includes(r.id)))||i===0&&sc.event==='ferry'&&s.hp<=5||sc.event==='stone'&&!s.deck.some(c=>!c.up&&CARD[c.id].type===(i===0?'a':'s'))||i===0&&sc.event==='traveller'&&s.gold<35||i===0&&sc.event==='cliff'&&s.hp<=game.cliffCost||i===1&&sc.event==='master'&&!s.deck.some(c=>!c.up&&CARD[c.id].rarity>0);return `<button class="journey-choice" data-action="event" data-key="${i}" ${disabled?'disabled':''}><span class="journey-choice-icon">${journeyIcon(optionIcons[sc.event]?.[i]||'book')}</span><span class="journey-choice-copy"><strong>${title}</strong><small>${sc.event==='cliff'&&i===0?`失去${game.cliffCost}气血，获得一张随机绝学。`:text}</small>${disabled?'<em>当前条件不足</em>':''}</span>${journeyIcon('arrow')}</button>`;}).join('')}</div><button class="journey-skip" data-action="event" data-key="2">离开</button></section>`}</div>`;}
function restPage(){const r=restRecovery(game);return `<div class="journey-page rest-page">${journeyHero('rest',(game.s.scene?.place||CHAPTERS[game.chapter].place)+' · 山间歇脚','歇脚','疗伤或精进一张牌，只能选一项。')}<section class="rest-health"><div><span>当前气血</span><strong>${r.hp}<small> / ${r.maxHp}</small></strong></div><div class="rest-health-track" role="img" aria-label="当前气血${r.hp}，调息可回复${r.gain}"><span style="width:${100*(r.hp+r.gain)/r.maxHp}%" class="rest-health-potential"></span><span style="width:${100*r.hp/r.maxHp}%"></span></div><small>${r.blocked?'逆练铜人：此处无法疗伤':r.gain?`调息后可至 ${r.hp+r.gain} / ${r.maxHp}`:'气血已满，可参悟武学'}</small></section><div class="rest-action-grid"><button class="rest-action" data-action="rest-heal" ${r.blocked?'disabled':''}>${journeyIcon('tea')}<strong>调息养伤</strong><b>${r.blocked?'无法疗伤':'+'+r.gain+' 气血'}</b><small>${r.blocked?'逆练铜人限制疗伤':'回复气血上限的'+Math.round(restRate(game.s)*100)+'%，不超过上限'}</small></button><button class="rest-action study" data-action="rest-upgrade" ${!r.eligible.length?'disabled':''}>${journeyIcon('book')}<strong>参悟武学</strong><b>永久精进</b><small>${r.eligible.length?'尚有 '+r.eligible.length+' 张武学可参悟':'没有可精进的牌'}</small></button></div>${r.eligible.length?`<section class="journey-section rest-study">${journeyHeading('精进预览','点牌看精进效果')}<div class="journey-card-grid">${r.eligible.slice(-2).map(c=>cardHTML({...c,up:true},{read:true,compact:true})).join('')}</div></section>`:''}<button class="journey-skip" data-action="finish-node">继续赶路</button></div>`;}
function shopPage(){const s=game.s,x=s.scene.stock;return `<div class="journey-page shop-page">${journeyHero('shop',(s.scene.place||CHAPTERS[game.chapter].place)+' · 行商驿站','行商','点牌查看效果，选好再买。')}<section class="journey-section">${journeyHeading('武学摊','本次到访限购各一卷')}<div class="journey-shop-grid">${x.cards.map((p,i)=>`<div class="journey-product ${p.sold?'sold':''}">${p.sold?'<span class="sold-stamp">已售出</span>':''}${cardHTML({id:p.id,up:false},{read:true,compact:true})}<div class="journey-product-buy"><span>${journeyIcon('coins')}<b>${p.price}</b><small>银两</small></span><button data-action="buy-card" data-key="${i}" aria-label="购入${CARD[p.id].name}" ${p.sold||s.gold<p.price?'disabled':''}>${p.sold?'已购入':s.gold<p.price?'银两不足':'购入'}</button></div></div>`).join('')}</div></section><section class="journey-section">${journeyHeading('随身珍玩','奇物与行囊整备')}<div class="journey-shop-services"><div class="journey-service">${x.relic?relicHTML(x.relic):'<p class="muted">珍物售罄</p>'}${x.relic?`<div class="journey-service-buy"><span class="journey-price">${journeyIcon('coins')}<b>${x.relicPrice}</b><small>银两</small></span><button data-action="buy-relic" ${x.relicSold||s.gold<x.relicPrice?'disabled':''}>${x.relicSold?'已购入':s.gold<x.relicPrice?'银两不足':'购入奇物'}</button></div>`:''}</div><div class="journey-service remove-service"><div class="remove-service-art">${journeyIcon('remove')}</div><div><h3>移除卡牌</h3><p>永久移除一张牌，包括心魔。每次到访限一次。${s.ruleset===DIFFICULTY?'此后每次加价25银两。':''}</p></div><div class="journey-service-buy"><span class="journey-price">${journeyIcon('coins')}<b>${game.removalCost}</b><small>银两</small></span><button data-action="remove" ${x.removed||s.gold<game.removalCost?'disabled':''}>${x.removed?'本次已移除':s.gold<game.removalCost?'银两不足':'选择移除'}</button></div></div></div></section><footer class="journey-footer"><small></small><button class="primary" data-action="finish-node">离开驿站 ${journeyIcon('arrow')}</button></footer></div>`;}
function endPage(){const s=game.s,won=s.phase==='win';return `<div class="center-box"><div class="eyebrow">${won?'三章已尽 · 华山论剑':'此行暂歇 · 来日再会'}</div><div class="ending-player">${playerFigure()}<h3>${escapeHTML(s.player.name)}</h3></div><h2>${won?'华山论剑 · 通关':'此行告终'}</h2><p>${won?'你越过三章山水，以自己的武学登上华山绝顶。'+(trialLevel(s)?' 历练'+trialLevel(s)+'阶已通关。'+(trialLevel(s)<5?'下一阶历练现已解锁。':'五阶历练皆已登临。'): ''):'你的这段江湖，停在了'+CHAPTERS[game.chapter].place+'。'}</p><div class="summary-grid"><div class="info-box"><strong>${s.stats.wins}</strong><span>交锋获胜</span></div><div class="info-box"><strong>${s.stats.played}</strong><span>累计出招</span></div><div class="info-box"><strong>${s.stats.damage}</strong><span>累计气血伤害</span></div><div class="info-box"><strong>${s.stats.exhausted}</strong><span>消耗卡牌</span></div></div><div class="relic-strip" style="justify-content:center">${s.relics.map(id=>`<button class="relic-token" data-action="relic-detail" data-id="${id}">${relicIcon(id)}<span>${RELIC[id].name}</span></button>`).join('')}</div><div class="ending-actions"><button class="primary" data-action="new">再入江湖 →</button><button data-action="deck">回看此局武学</button>${won?'<button data-action="records">查看通关榜</button>':''}</div><p class="version" style="margin-top:20px">此局种子 ${s.seed} · 只属于本局的江湖</p></div>`;}
function ruleListHTML(items){return `<dl class="rule-list">${items.map(x=>`<div><dt>${escapeHTML(x.name)}</dt><dd>${escapeHTML(x.text)}</dd></div>`).join('')}</dl>`;}
function enemyInfoHTML(e){
 const info=enemyReadout(game,e);
 return `<div class="enemy-info-heading">${enemyFigure(e)}<div><h3>${escapeHTML(e.name)}</h3><p>${escapeHTML(ENEMY[e.id]?.faction||'')}</p><span>气血 ${Math.max(0,e.hp)} / ${e.maxHp} · 格挡 ${e.block}</span></div></div><h3>当前行动</h3>${info.state==='dead'?'<p>已击败。</p>':info.state==='waiting'?'<p>本轮不行动，下轮加入战斗。</p>':ruleListHTML(info.effects)}${info.stances.length?`<h3>当前架势</h3>${ruleListHTML(info.stances)}`:''}${info.statuses.length?`<h3>身上状态</h3>${ruleListHTML(info.statuses)}`:''}<div class="guide-actions"><button data-action="combat-rules">状态与拆招</button><button data-action="enemy-book">交手记录</button></div>`;
}
function help(){return `<div class="quick-start"><h3>初次上路</h3><ol><li>选一位侠客，再领一份开局机缘。</li><li>沿地图亮起的地点前进，途中补充武学、买卖和歇脚。</li><li>打败三章首领，登上华山。</li></ol></div><details class="help-topic" open><summary>战斗怎么操作</summary><p>点敌人选目标。手机端点选或滑动手牌，再按“出招”；电脑端点牌直接出招。结束回合后，敌人按编号依次行动。</p><p>看不懂敌人的效果，点战斗上方“敌情”。</p><button data-action="combat-rules">查看状态与拆招</button></details><details class="help-topic"><summary>真气、抽牌与格挡</summary><p>通常每回合恢复3真气、抽5张牌；奇物可能改变这些数值。手牌上限10张。回合结束时未保留的牌进入弃牌堆，抽牌堆用尽后洗入。</p><p>格挡先挡攻击，下回合开始时清空。多段攻击逐击计算格挡与反震。</p></details><details class="help-topic"><summary>武学与天赋</summary><p>名侠有专属天赋，自创侠客选一项通用天赋，确认后本局固定。所有角色都能学习全部武学。</p><p>战胜敌人后可以选牌，也可以跳过。精进永久增强一张牌；移除则从本局牌组删去。心法持续整场，消耗的牌战后恢复。</p></details><details class="help-topic"><summary>历练与行程</summary><p>每局三章，共45程。通关解锁下一阶历练，最高五阶；每次出山重新构筑牌组。旧存档按原有行程继续。</p></details><details class="help-topic"><summary>辅助出招与存档</summary><p>辅助出招会替你打完一回合并结束回合。每次操作自动保存；菜单可导出备份、导入存档。导入会替换当前进度。</p></details>`;}
function modalBody(){
 if(!modal)return '';
 let title='',body='';
 if(modal.type==='appearance'){title='江湖配色';body=`<p class="theme-intro">选择界面配色。</p><div class="theme-options" role="radiogroup" aria-label="江湖配色">${GAME_THEMES.map(t=>`<button class="theme-option" role="radio" aria-checked="${activeTheme===t.id}" data-action="theme-select" data-id="${t.id}" tabindex="${activeTheme===t.id?0:-1}"><span class="theme-swatches" aria-hidden="true">${t.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span class="theme-copy"><strong>${t.name}</strong><small>${t.description}</small></span><span class="theme-check">${activeTheme===t.id?'已选':'选择'}</span></button>`).join('')}</div><p class="theme-note" role="status">${themeStorageError?'配色已生效；当前浏览器无法记住选择，下次打开可重新选择。':'配色会自动保存。'}</p>`;}
 if(modal.type==='enemy-info'){title='敌情';const units=game.s?.b?.enemies||[],e=units.find(x=>x.key===modal.key)||units.find(x=>x.key===target)||units[0];body=e?`<div class="enemy-info-tabs" role="group" aria-label="查看敌情">${units.map((x,i)=>`<button data-action="enemy-info" data-key="${x.key}" aria-pressed="${e.key===x.key}">${i+1} · ${escapeHTML(x.name)}</button>`).join('')}</div>${enemyInfoHTML(e)}`:'<p>当前没有交锋。</p>';}
 if(modal.type==='combat-rules'){title=modal.id&&COMBAT_RULE[modal.id]?COMBAT_RULE[modal.id].name:'状态与拆招';body=ruleListHTML(modal.id&&COMBAT_RULE[modal.id]?[COMBAT_RULE[modal.id]]:COMBAT_RULES);}
 if(modal.type==='records'){title='个人通关榜';body=personalRecords();}
 if(modal.type==='record'){const record=recordArchive.find(r=>r.id===modal.id);title='通关战绩';body=record?personalRecordDetail(record):'<p class="empty">记录暂不可用，请返回通关榜。</p>';}
 if(modal.type==='enemy-book'){title='江湖群敌 · 遭遇记录';const known=ENEMIES.filter(e=>game.s?.journal?.[e.id]||game.s?.b?.enemies.some(x=>x.id===e.id));body=`<div class="guide-actions"><button data-action="combat-rules">状态与拆招</button></div><div class="enemy-gallery">${known.map(d=>{const record=game.s?.journal?.[d.id]||{moves:{},notes:[]};return `<article class="enemy-entry rank-${d.rank}">${enemyFigure(d)}<div><span class="eyebrow">${ENEMY_RANK[d.rank]}</span><h3>${d.name}</h3><small>${d.faction}</small>${game.s?.b?.enemies.some(e=>e.id===d.id&&e.hp>0)?`<button class="small" data-action="enemy-info" data-key="${game.s.b.enemies.find(e=>e.id===d.id&&e.hp>0).key}">查看当前敌情</button>`:''}<div class="enemy-moves">${Object.entries(record.moves||{}).map(([label,count])=>`<div><strong>${escapeHTML(label)}</strong><small>亲历 ${count} 次</small></div>`).join('')||'<p>尚无交手记录</p>'}${record.notes?.length?`<details><summary>交手记事</summary>${record.notes.map(note=>`<p>${escapeHTML(note)}</p>`).join('')}</details>`:''}</div></div></article>`;}).join('')||'<p class="empty">尚未遇见敌人。</p>'}</div>`;}
 if(modal.type==='card'){title=CARD[modal.card.id].name+' · 完整牌面';body=`<div class="collection-card-detail">${cardHTML(modal.card,{read:true})}</div><button class="card-back" data-action="close-modal">返回列表</button>`;}
 if(modal.type==='help'){title='初入江湖须知';body=help();}
 if(modal.type==='menu'){title='游戏设置';body=`${game.s.challengeRevision?'<p class="run-trial">天赋挑战 · 敌人逐章增强，首领带格挡登场</p>':''}${trialLevel(game.s)?'<p class="run-trial">此行 · 历练'+trialLevel(game.s)+'阶 · '+TRIALS[trialLevel(game.s)-1].name+'</p>':''}${talentHTML()}<section class="author-contact" aria-label="联系作者"><div><small>联系作者 · 建议与反馈</small><strong>lynchrrr</strong></div><span>微信</span></section><div class="choices"><button data-action="appearance">江湖配色 · ${gameTheme(activeTheme).name}</button><button data-action="records">个人通关榜</button><button data-action="catalogue">武学与奇物图鉴</button><button data-action="enemy-book">江湖群敌与遭遇记录</button><button data-action="edit-player">修改姓名与立绘</button><button data-action="help">初入江湖须知</button><button data-action="map">查看江湖行程</button><button data-action="export">导出当前存档副本</button><label class="choice">导入存档<input type="file" id="import-save" accept="application/json,.json" style="display:block;margin-top:12px"></label><button data-action="home">返回首页</button><button class="danger" data-action="restart">结束此局，重新出山</button></div><p class="muted" style="font-size:12px">${saveError?'本机自动存档不可用，请导出副本保存。':'进度自动保存。'} 导入会替换当前进度。</p>`;}
 if(modal.type==='confirm-new'){const unlocked=unlockedTrial(recordArchive),level=modal.level||1;title='江湖历练 · 再启新程';body=`<p class="muted">每局从十张基础牌起步，闯过三章45程。</p><div class="trial-options" role="group" aria-label="选择历练等阶">${TRIALS.map(t=>`<button data-action="trial-select" data-key="${t.level}" aria-pressed="${level===t.level}" ${t.level>unlocked?'disabled':''}><span><b>${t.level}</b><strong>${t.name}</strong></span><small>${t.level>unlocked?'通关'+(t.level-1)+'阶后解锁':level===t.level?'当前选定':'已解锁'}</small></button>`).join('')}</div><div class="trial-rule"><strong>历练${level}阶 · ${TRIALS[level-1].name}</strong><p>${TRIALS[level-1].text}</p></div><p class="muted">难度随章节和历练等阶提高，首领带格挡登场。</p>${game.s&&!['win','lost'].includes(game.s.phase)?'<p class="save-warning">开始后会替换当前进度，可先回菜单导出存档副本。</p>':''}<button class="primary trial-start" data-action="confirm-new">开始历练${level}阶</button>`;}
 if(modal.type==='talent-detail'){title='本局天赋';body=talentHTML()+`<p class="muted">${HERO[game.s.player.hero]?.name||'自创侠客'} · 本局固定。</p>`;}
 if(modal.type==='map'){title='江湖行程';body=mapBoard(false);}
 if(modal.type==='log'){title='本场完整战报';body=`<div class="log-lines" style="max-height:65vh">${game.s.b.log.slice().reverse().map(x=>`<div>${x}</div>`).join('')}</div>`;}
 if(modal.type==='relics'){title=`随身奇物 · ${game.s.relics.length}`;body=`<div class="relic-options">${game.s.relics.map(id=>relicHTML(id)).join('')}</div>`;}
 if(modal.type==='relic'){title=RELIC[modal.id].name;body=`<div class="relic-detail">${relicHTML(modal.id)}</div>`;}
 if(['deck','pile','catalogue','upgrade','remove'].includes(modal.type)){
  const catalogue=modal.type==='catalogue';
  title=catalogue?`武学与奇物图鉴 · v${GAME_VERSION}`:modal.type==='deck'?`永久牌组 · ${game.s.deck.length} 张`:modal.type==='pile'?{hand:'手牌 · 完整说明',draw:'抽牌堆 · 无序展示',discard:'弃牌堆',exhaust:'消耗区 · 战后恢复'}[modal.id]:modal.type==='upgrade'?'选择永久精进的武学':'选择永久移除的牌';
  const filters=catalogue?`<div class="filters"><input id="catalogue-search" placeholder="搜索武功、来源或效果" aria-label="搜索武功" value="${filter}"><select id="path-filter" aria-label="流派筛选"><option value="">全部流派</option>${['劲力','格挡','变招','血战','连击','通用','基础'].map(x=>`<option ${pathFilter===x?'selected':''}>${x}</option>`).join('')}</select><button data-action="toggle-up">${showUp?'查看基础':'查看精进'}</button><button data-action="all-relics">30件奇物</button></div>`:'';
  let cards=catalogue?CARDS.filter(d=>(!pathFilter||d.path===pathFilter)&&(!filter||(d.name+d.source+describe({id:d.id,up:showUp})).includes(filter))).map(d=>({id:d.id,up:showUp})):modal.type==='pile'?[...game.s.b[modal.id]].sort((a,b)=>a.id.localeCompare(b.id)):game.s.deck;
  if(modal.type==='upgrade')cards=cards.filter(c=>!c.up&&!['status','curse'].includes(CARD[c.id].type));
  body=filters+(modal.type==='upgrade'?'<p class="muted">下方显示精进后的效果，点选一张即可永久精进。</p>':'')+`<div class="collection" id="catalogue-results">${cards.map(c=>cardHTML(modal.type==='upgrade'?{...c,up:true}:c,{read:!['upgrade','remove'].includes(modal.type),compact:!['upgrade','remove'].includes(modal.type),action:modal.type==='upgrade'?'do-upgrade':modal.type==='remove'?'do-remove':'',uid:c.uid})).join('')||'<p class="empty">没有可选武学</p>'}</div>`;
 }
 if(modal.type==='all-relics'){title='奇物图鉴 · 30 件';body=`<div class="relic-options">${RELICS.map(r=>relicHTML(r.id)).join('')}</div>`;}
 if(modal.type==='select'){
  const c=game.s.b.hand.find(x=>x.uid===pending),spec=game.selection(c);title=`${CARD[c.id].name} · ${spec.kind==='exhaust'?'选择消耗':spec.kind==='upgrade'?'选择精进':'选择保留'}`;
  body=`<p class="selection-live-preview" aria-live="polite">${combatCardDescription(c,{selections:selected,selectionKnown:true})}</p><p class="muted">${spec.min?'至少选择'+spec.min+'张，':''}最多选择${spec.max}张其他手牌。确认后才会出招。</p><div class="collection">${spec.candidates.map(x=>cardHTML(x,{action:'select-card',uid:x.uid,choice:true})).join('')}</div><div class="selection-footer"><span>已选择 ${selected.length} / ${spec.max}</span><button class="primary" data-action="confirm-play" ${selected.length<spec.min?'disabled':''}>确认出招 →</button></div>`;
 }
 return `<div class="modal-shade" data-testid="modal"><section class="modal ${modal.type==='card'?'card-detail-modal':''}" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-head"><h2>${title}</h2><button data-action="close-modal" aria-label="关闭窗口">✕</button></div>${body}</section></div>`;
}
function render(){
 syncPlayTime();combatDescriptionCache=new Map();cancelHandScrub();
 const previousPhase=$('.layout')?.dataset.phase,wasMap=previousPhase==='map';
 const oldTravel=$('.travel-map-scroll'),travelScroll=oldTravel?{key:oldTravel.dataset.mapKey,top:oldTravel.scrollTop}:null;
 const wasBattle=!!$('.layout[data-phase="battle"]'),handScroll=$('.hand')?.scrollLeft||0;
 const s=game.s;if(s?.phase==='map'&&!wasMap)mapViewChapter=null;if(view==='home'||s?.phase!=='battle'||!s.b.hand.some(c=>c.uid===inspectedCard))inspectedCard=null;let content;
 if(view==='home')content=home();else if(!s){view='home';content=home();}else{const pages={character:characterPage,opening:openingPage,map:mapPage,battle:battlePage,reward:rewardPage,event:eventPage,treasure:treasurePage,rest:restPage,shop:shopPage,win:endPage,lost:endPage};content=`<div class="layout" data-phase="${s.phase}">${sidebar()}<div>${header()}${saveError?'<div class="save-warning">自动存档不可用，请从菜单导出副本。</div>':''}<main class="main">${pages[s.phase]()}</main></div></div>`;}
 $('#app').innerHTML=content+modalBody();
 if(modal?.scrollTop&&$('.modal'))$('.modal').scrollTop=modal.scrollTop;
 if(wasBattle&&s?.phase==='battle'&&$('.hand'))$('.hand').scrollLeft=handScroll;
 const travel=$('.travel-map-scroll');if(travel){if(travelScroll&&travelScroll.key===travel.dataset.mapKey)travel.scrollTop=travelScroll.top;else focusTravelMap();}
 if(previousPhase&&s&&previousPhase!==s.phase)window.scrollTo(0,0);
 const surface=$('.layout')||$('.home');if(surface)surface.inert=!!modal;
 previewRoot=$('.hand-preview');previewCards=new Map([...document.querySelectorAll('[data-preview-uid]')].map(el=>[Number(el.dataset.previewUid),el]));handCards=new Map([...document.querySelectorAll('.hand .card')].map(el=>[Number(el.dataset.uid),el]));
 $('.layout')?.classList.toggle('has-hand-preview',inspectedCard!==null);positionHandPreview();
}
function focusTravelMap(){const el=$('.travel-map-scroll');if(el)el.scrollTop=Number(el.dataset.mapFocus)-el.clientHeight*.7;}
function update(){save();render();}
function paintCombatSnapshot(snapshot){
 const paint=(el,unit)=>{
  if(!el||!unit)return;const hp=Math.max(0,unit.hp),block=Math.max(0,unit.block||0),health=el.querySelector('.health-bar'),guard=el.querySelector('.block-bar');
  if(health){const max=unit.maxHp||Number(health.getAttribute('aria-valuemax'));health.setAttribute('aria-valuenow',hp);health.querySelector('span').style.width=`${hp/max*100}%`;health.querySelector('b').textContent=`气血 ${hp} / ${max}`;}
  if(guard){const max=Math.max(unit.maxHp||1,block);guard.setAttribute('aria-valuenow',block);guard.setAttribute('aria-valuemax',max);guard.querySelector('span').style.width=`${block/max*100}%`;guard.querySelector('b').textContent=`格挡 ${block}`;}
 };
 paint($('.player'),snapshot);if($('.top-stat.hp strong'))$('.top-stat.hp strong').textContent=snapshot.hp;
 if($('.energy-orb'))$('.energy-orb').textContent=snapshot.qi;
 for(const unit of snapshot.enemies){const el=document.querySelector(`.enemy[data-key="${unit.key}"]`);paint(el,unit);el?.classList.toggle('dead',!unit.alive);if(!unit.alive&&el?.querySelector('.fighter-intent'))el.querySelector('.fighter-intent').innerHTML=enemyActionHTML({state:'dead',tags:[]});}
 if(snapshot.handUids){for(const el of document.querySelectorAll('.hand .card'))el.classList.toggle('combat-spent',!snapshot.handUids.includes(Number(el.dataset.uid)));const title=$('.hand-title>span');if(title)title.textContent=title.textContent.replace(/手牌 \d+ \/ 10/,`手牌 ${snapshot.handUids.length} / 10`);}
}
async function battleAction(action,{label='',type='',enemyTurn=false,auto=false}={}){
 if(combatBusy)return;
 const scroll=$('.hand')?.scrollLeft||0,{result,before,after,steps}=captureCombatAction(game,action);
 if(result?.ok===false){toast(result.error);return result;}
 save(); // Resolve and save exactly once; playback never runs combat logic again.
 combatBusy=true;const surface=$('.layout');surface?.classList.add('combat-busy');surface?.setAttribute('aria-busy','true');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const actor=key=>key==='player'?$('.player'):document.querySelector(`.enemy[data-key="${key}"]`);
 const motion=(el,frames,duration=300)=>el&&!reduced?el.animate(frames,{duration,easing:'ease-out',fill:'none'}).finished.catch(()=>{}):Promise.resolve();
 let previous=before;
 const timeline=steps.length?steps:[{kind:enemyTurn?'round-end':'player',actor:'player',label,type,snapshot:after}];
 try{
  await playCombatSteps(timeline,async step=>{
   const frame=step.snapshot;if(!frame)return;
   surface.dataset.combatStage=step.kind;surface.dataset.combatActor=String(step.actor??'');surface.dataset.combatHit=String(step.hit??'');surface.dataset.combatTarget=String(step.target??'');
   const isHit=['player-hit','enemy-hit'].includes(step.kind),isBegin=['player-begin','enemy-begin'].includes(step.kind),isEnemy=typeof step.actor==='number',ordinal=before.enemies.findIndex(e=>e.key===step.actor)+1;
   const el=step.actor===undefined?null:actor(step.actor),art=el?.querySelector(isEnemy?'.enemy-art':'.player-art'),effects=[],floats=[];
   const state=$('.player-intent span');if(state)state.textContent=isHit?(isEnemy?`敌方第${ordinal}位 · 第${step.hit}击`:`你的第${step.hit}击`):step.kind==='reaction'?`${step.label}${step.hit?' · 第'+step.hit+'击':''}`:isBegin?(isEnemy?`敌方第${ordinal}位出手`:'你在出招'):step.label;
   const actionPanel=isEnemy&&(isBegin||isHit)?el?.querySelector('.fighter-intent'):null;if(actionPanel&&step.actionView)actionPanel.innerHTML=enemyActionHTML(step.actionView,isHit?`正在出招 · 第${step.hit}击`:'正在出招');
   const float=(node,text,kind,duration=COMBAT_PACE.feedback)=>{if(!node||reduced)return;const item=document.createElement('span');item.className='combat-float '+kind;if(kind==='damage'&&text.length>5)item.classList.add('detail');item.textContent=text;node.append(item);effects.push(item);floats.push(motion(item,[{opacity:0,transform:'translate(-50%,6px)'},{opacity:1,offset:.15,transform:'translate(-50%,-2px)'},{opacity:1,offset:.72,transform:'translate(-50%,-12px)'},{opacity:0,transform:'translate(-50%,-27px)'}],duration));};
   el?.classList.add('combat-acting');
   try{
    if(isBegin&&!reduced){
     float(el,step.label,'technique',COMBAT_PACE.cue);
     if(step.kind==='player-begin'&&!auto){const card=[...document.querySelectorAll('.hand .card')].find(c=>c.getAttribute('aria-label')===step.label&&!c.classList.contains('combat-spent'));if(card){const ghost=card.cloneNode(true),rect=card.getBoundingClientRect();ghost.classList.add('played-card');if(matchMedia('(max-width:900px)').matches)ghost.classList.add('folded-flight');ghost.style.cssText=`position:fixed;left:${rect.left+(rect.width-card.offsetWidth)/2}px;top:${rect.top+(rect.height-card.offsetHeight)/2}px;width:${card.offsetWidth}px;height:${card.offsetHeight}px;min-width:0;max-width:none;min-height:0;max-height:none;--hand-card-height:${rect.height}px;margin:0;z-index:80;pointer-events:none`;document.body.append(ghost);effects.push(ghost);floats.push(motion(ghost,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-100px) scale(.8)'}],COMBAT_PACE.flight));}}
    }
    if(isHit&&!reduced){const dx=isEnemy?-12:12;float(el,`第${step.hit}击`,'technique',COMBAT_PACE.approach+COMBAT_PACE.feedback);await motion(art,[{transform:'translateX(0)'},{transform:`translateX(${dx}px)`}],COMBAT_PACE.approach);floats.push(motion(art,[{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],COMBAT_PACE.return));}
    paintCombatSnapshot(frame);
    const changes=combatStepFeedback(previous,step);
    for(const change of changes){const targetEl=actor(change.target);float(targetEl,change.text,change.kind);if(change.kind==='damage'&&targetEl&&!reduced){floats.push(motion(targetEl,[{filter:'brightness(1)',transform:'translateX(0)'},{filter:'brightness(1.5)',transform:'translateX(-3px)',offset:.3},{filter:'brightness(1)',transform:'translateX(0)'}],COMBAT_PACE.impact));const slash=document.createElement('i');slash.className='combat-slash';targetEl.append(slash);effects.push(slash);floats.push(motion(slash,[{opacity:0,transform:'rotate(-35deg) scaleX(.1)'},{opacity:1,offset:.35,transform:'rotate(-35deg) scaleX(1)'},{opacity:0,transform:'rotate(-35deg) scaleX(1.2)'}],COMBAT_PACE.impact));}if(['block','blocked'].includes(change.kind))floats.push(motion(targetEl,[{boxShadow:'inset 0 0 0 transparent'},{boxShadow:'inset 0 0 20px #8ebfc955',offset:.5},{boxShadow:'inset 0 0 0 transparent'}],COMBAT_PACE.impact));}
    previous=frame;await Promise.all(floats);
    if(step.kind==='player-start'&&$('.battle-top .round'))$('.battle-top .round').textContent=`第 ${frame.turn} 回合`;
   }finally{effects.forEach(node=>node.remove());el?.classList.remove('combat-acting');}
  });
 }finally{combatBusy=false;update();if(game.s.phase==='battle'&&$('.hand'))$('.hand').scrollLeft=scroll;}
 return result;
}
document.addEventListener('keydown',ev=>{
 const option=ev.target.closest('[data-action="theme-select"]');if(!option||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(ev.key))return;ev.preventDefault();const options=[...document.querySelectorAll('[data-action="theme-select"]')],index=options.indexOf(option),next=ev.key==='Home'?0:ev.key==='End'?options.length-1:(index+(['ArrowLeft','ArrowUp'].includes(ev.key)?-1:1)+options.length)%options.length;options[next].click();
});
document.addEventListener('click',async ev=>{
 const el=ev.target.closest('[data-action]');if(combatBusy)return;if(!el){if(!modal&&inspectedCard!==null&&!ev.target.closest('.hand,.hand-preview')){closeHandPreview();}return;}if(el.disabled)return;
 const a=el.dataset.action,id=el.dataset.id,uid=Number(el.dataset.uid),key=Number(el.dataset.key);syncPlayTime();
 try{
 switch(a){
  case 'appearance':modal={type:'appearance',back:modal};render();return;
  case 'theme-select':if(!GAME_THEMES.some(t=>t.id===id))return;activeTheme=applyTheme(document,id);try{themeStorageError=!storeTheme(localStorage,id);}catch{themeStorageError=true;}render();document.querySelector(`[data-action="theme-select"][data-id="${id}"]`)?.focus({preventScroll:true});return;
  case 'records':{archiveCurrent();const loaded=loadRecordArchive();if(!loaded.error){recordArchive=mergeRecords(loaded.records,recordArchive);if(recordArchive.every(r=>loaded.records.some(x=>x.id===r.id)))recordError=null;}else recordError=loaded.error;recordPage=0;modal={type:'records'};render();return;}
  case 'record-mode':if(!['turns','challenge'].includes(id))return;recordMode=id;recordPage=0;render();return;
  case 'record-page':recordPage+=key;render();return;
  case 'record-detail':modal={type:'record',id,back:{...modal,scrollTop:$('.modal')?.scrollTop||0}};render();return;
  case 'export-records':{const blob=new Blob([serializeRecords(recordArchive)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='一局一江湖-个人通关记录.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('通关记录已导出');return;}
  case 'home':view='home';modal=null;render();return;
  case 'new':mapViewChapter=null;archiveCurrent();modal={type:'confirm-new',level:1};render();return;
  case 'restart':archiveCurrent();modal={type:'confirm-new',level:1};render();return;
  case 'trial-select':if(modal?.type!=='confirm-new'||!Number.isInteger(key)||key<1||key>unlockedTrial(recordArchive))return;modal.level=key;render();return;
  case 'confirm-new':if(modal?.type!=='confirm-new'||!Number.isInteger(modal.level)||modal.level<1||modal.level>unlockedTrial(recordArchive))return;game.start(Date.now(),{trialLevel:modal.level});heroGender='male';view='game';modal=null;target=0;save();render();return;
  case 'opening-choice':if(!game.chooseOpening(id))toast('这份机缘暂时无法领取');break;
  case 'opening-card':if(!game.completeOpening(game.s.opening.selected==='insight'?id:uid))toast('请选择有效的卡牌');break;
  case 'opening-back':game.backOpening();break;
  case 'opening-leave':game.leaveOpening();break;
  case 'hero-mode':if(!game.s.character.editing&&['heroes','custom'].includes(id)){if(id==='custom')game.chooseHero('custom');else game.s.character.selectionMode='heroes';}break;
  case 'hero-select':game.chooseHero(id);break;
  case 'hero-talent':game.chooseTalent(id);break;
  case 'hero-gender':if(['male','female'].includes(id)){heroGender=id;const portrait=PLAYER[game.s.character.portrait];if(portrait&&portrait.gender!==id){if(!game.s.character.editing&&game.s.character.hero!=='custom'){game.chooseHero('custom');game.s.character.selectionMode='heroes';}else game.choosePlayerPortrait(null);}}break;
  case 'hero-portrait':game.choosePlayerPortrait(id);break;
  case 'hero-confirm':if(!game.finishCharacter())toast(game.characterError());break;
  case 'hero-cancel':game.cancelCharacter();break;
  case 'edit-player':if(game.s.phase!=='character')game.editCharacter();heroGender=PLAYER[game.s.character?.portrait]?.gender||'male';modal=null;break;
  case 'continue':mapViewChapter=null;heroGender=PLAYER[game.s?.character?.portrait]?.gender||'male';view='game';modal=null;render();return;
  case 'talent-detail':modal={type:'talent-detail'};render();return;
  case 'menu':case 'deck':case 'relics':case 'help':case 'catalogue':case 'all-relics':case 'enemy-book':modal={type:a};render();return;
  case 'map':if(game.s.phase==='map'&&view==='game')return;modal={type:'map'};render();return;
  case 'relic-detail':modal={type:'relic',id};render();return;
  case 'inspect-card':if(!CARD[id])return;if(modal)modal.scrollTop=$('.modal')?.scrollTop||0;modal={type:'card',card:{id,up:el.dataset.refined==='1',...(modal?.type==='pile'&&modal.id==='hand'?{uid}: {})},live:modal?.type==='pile'&&modal.id==='hand',back:modal};render();return;
  case 'close-modal':modal=modal?.back||null;pending=null;selected=[];render();return;
  case 'toggle-up':showUp=!showUp;render();return;
  case 'enter':game.enter(id);target=0;break;
  case 'enter-node':if(game.enterNode(id)){target=0;mapViewChapter=null;}break;
  case 'map-chapter':if(Number.isInteger(key)&&key>=0&&key<3){mapViewChapter=key;render();}return;
  case 'map-locate':mapViewChapter=game.chapter;render();focusTravelMap();return;
  case 'take-treasure':game.chooseTreasure(id);break;
  case 'enemy-info':modal={type:'enemy-info',key:Number.isInteger(key)?key:target};render();return;
  case 'combat-rules':modal={type:'combat-rules',id,back:modal};render();return;
  case 'target':target=key;render();return;
  case 'inspect-prev':case 'inspect-next':{const hand=game.s?.b?.hand||[],i=hand.findIndex(c=>c.uid===inspectedCard);if(i>=0&&hand.length)inspectHandCard(hand[(i+(a==='inspect-next'?1:hand.length-1))%hand.length].uid);return;}
  case 'close-card-preview':closeHandPreview();return;
  case 'play':case 'play-inspected':{
   const c=game.s.b.hand.find(x=>x.uid===uid);if(!c)return;
   if(a==='play'&&matchMedia('(max-width:900px)').matches){if(inspectedCard===uid)closeHandPreview();else inspectHandCard(uid);return;}
   const why=game.reason(c);if(why){toast(why);return;}
   inspectedCard=null;render();const spec=game.selection(c);
   if(spec.kind&&spec.candidates.length){pending=uid;selected=[];modal={type:'select'};render();return;}
   await battleAction(()=>game.play(uid,target,[]),{label:CARD[c.id].name+(c.up?'·精进':''),type:CARD[c.id].type});return;
  }
  case 'select-card':{const c=game.s.b.hand.find(x=>x.uid===pending),spec=game.selection(c);if(selected.includes(uid))selected=selected.filter(x=>x!==uid);else if(selected.length<spec.max)selected.push(uid);else toast(`最多选择${spec.max}张`);render();return;}
  case 'confirm-play':{const card=game.s.b.hand.find(c=>c.uid===pending),chosen=selected.slice(),playUid=pending;modal=null;pending=null;selected=[];render();await battleAction(()=>game.play(playUid,target,chosen),{label:CARD[card.id].name+(card.up?'·精进':''),type:CARD[card.id].type});return;}
  case 'end-turn':inspectedCard=null;render();await battleAction(()=>game.endTurn(),{enemyTurn:true});return;
  case 'auto-turn':inspectedCard=null;render();await battleAction(()=>game.autoPlayTurn(),{label:'连招',enemyTurn:true,auto:true});return;
  case 'dart':inspectedCard=null;render();await battleAction(()=>game.useDart(target),{label:'金蛇锥',type:'a'});return;
  case 'pile':modal={type:'pile',id};render();return;
  case 'battle-log':modal={type:'log'};render();return;
  case 'take-card':game.chooseRewardCard(id);break;
  case 'skip-card':game.chooseRewardCard();break;
  case 'take-relic':game.chooseRewardRelic(id);break;
  case 'skip-relic':game.chooseRewardRelic();break;
  case 'leave-reward':game.leaveReward();break;
  case 'event':if(game.s.scene.result)return;game.eventChoice(key);break;
  case 'finish-node':if(['shop','rest'].includes(game.s.phase)||game.s.phase==='treasure'&&game.s.scene.claimed||game.s.phase==='event'&&game.s.scene.result)game.finishNode();break;
  case 'rest-heal':game.rest('heal');toast('调息完毕，气血已回复');break;
  case 'rest-upgrade':modal={type:'upgrade'};render();return;
  case 'do-upgrade':if(game.rest('upgrade',uid)){modal=null;toast('武学已永久精进');}break;
  case 'buy-card':if(game.buyCard(key))toast('武学已加入牌组');break;
  case 'buy-relic':if(game.buyRelic())toast('奇物已随身携带');break;
  case 'remove':modal={type:'remove'};render();return;
  case 'do-remove':if(game.removeCard(uid)){modal=null;toast('已从永久牌组移除');}break;
  case 'export':{const blob=new Blob([JSON.stringify(game.s,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`一局江湖-${game.s.seed}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出存档副本');return;}
 }
 update();
 }catch(error){console.error(error);toast('操作未完成，请关闭窗口后重试；当前进度仍保留。');}
});
document.addEventListener('keydown',e=>{if(combatBusy||e.key!=='Escape')return;if(modal){modal=modal.back||null;pending=null;selected=[];render();}else if(inspectedCard!==null){inspectedCard=null;render();}});
document.addEventListener('input',e=>{if(e.target.id==='hero-name'){game.setCharacterName(e.target.value);save();const name=cleanPlayerName(e.target.value),error=game.characterError();$('#hero-name-count').textContent=Array.from(name).length+' / 12';$('#hero-form-error').textContent=error||'已选好侠客';$('#hero-confirm').disabled=!!error;e.target.setAttribute('aria-invalid',String(!!playerNameError(e.target.value)));}if(e.target.id==='catalogue-search'){filter=e.target.value.replace(/[<>"&]/g,'');const cards=CARDS.filter(d=>(!pathFilter||d.path===pathFilter)&&(!filter||(d.name+d.source+describe({id:d.id,up:showUp})).includes(filter)));$('#catalogue-results').innerHTML=cards.map(d=>cardHTML({id:d.id,up:showUp},{read:true,compact:true})).join('')||'<p class="empty">未找到相关武学</p>';}});
document.addEventListener('change',async e=>{
 if(e.target.id==='record-group'){recordGroupSelection=e.target.value;recordPage=0;render();return;}
 if(e.target.id==='import-records'){try{const file=e.target.files[0];if(!file)return;if(file.size>5e6)throw Error();const incoming=parseRecords(await file.text()),before=recordArchive.length;recordArchive=storeRecords(localStorage,mergeRecords(recordArchive,incoming));recordError=null;recordGroupSelection=null;recordPage=0;modal={type:'records'};render();toast(`已合并${recordArchive.length-before}条通关记录，重复记录自动跳过`);}catch{toast('通关记录无法导入，原记录与当前进度未变。');}return;}
 if(e.target.id==='path-filter'){pathFilter=e.target.value;render();}
 if(e.target.id==='import-save'){
  try{const file=e.target.files[0];if(!file)return;if(file.size>2e6)throw Error();const s=JSON.parse(await file.text());if(!validSave(s))throw Error();game=new Game(s);inspectedCard=null;mapViewChapter=null;heroGender=PLAYER[game.s?.character?.portrait]?.gender||'male';view='game';modal=null;update();toast('存档已恢复');}catch{toast('存档格式不兼容或文件无效，原进度未变。');}
 }
});
archiveCurrent();
setInterval(()=>{syncPlayTime();if(view==='game'&&!document.hidden&&game.s?.runInfo&&!game.s.clearRecord)save();},15000);
for(const event of ['visibilitychange','pagehide','focus','blur']){const target=event==='visibilitychange'?document:window;target.addEventListener(event,()=>{syncPlayTime();if(game.s?.runInfo)save();});}
window.addEventListener('storage',e=>{if(e.key==='yiju-jianghu-clears-v1'){const loaded=loadRecordArchive();recordError=loaded.error;if(!loaded.error)recordArchive=mergeRecords(loaded.records,recordArchive);if(modal?.type==='records'&&!combatBusy)render();}});
setInterval(syncPlayTime,1000);
render();
