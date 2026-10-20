import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,clone,SAVE_VERSION} from '../engine.js';
import {PLAYERS,PLAYER,DEFAULT_PLAYER,playerNameError,cleanPlayerName,validPlayer,validCharacterDraft} from '../players.js';
function create(name='林听雪',portrait='female-qing',seed=42){const g=new Game();g.start(seed);assert.equal(g.setCharacterName(name),true);assert.equal(g.choosePlayerPortrait(portrait),true);assert.equal(g.finishCharacter(),true);return g;}
function claim(g){const o=g.s.opening.options.find(x=>x.id==='coins')||g.s.opening.options.find(x=>x.id==='vitality')||g.s.opening.options.find(x=>!['relicWound','relicCurse','rareToll'].includes(x.id));g.chooseOpening(o.id);if(!g.s.opening.result)g.completeOpening(o.id==='insight'?o.cards[0]:g.s.deck[0].uid);g.leaveOpening();}

test('new runs require a name and portrait before generating opening boons',()=>{
 const g=new Game();g.start(42);assert.equal(g.s.phase,'character');assert.equal(g.s.opening,undefined);assert.equal(g.s.deck.length,10);assert.equal(g.finishCharacter(),false);assert.equal(g.beginOpening(),false);assert.equal(g.enter('battle'),false);assert.equal(g.cancelCharacter(),false);
 g.setCharacterName('林听雪');assert.equal(g.finishCharacter(),false);g.choosePlayerPortrait('female-qing');assert.equal(g.finishCharacter(),true);assert.equal(g.s.phase,'opening');assert.equal(g.s.opening.options.length,4);assert.equal(g.s.character,undefined);const saved=clone(g.s);assert.equal(g.finishCharacter(),false);assert.deepEqual(g.s,saved);
});
test('there are three male and three female original player identities',()=>{
 assert.equal(PLAYERS.length,6);assert.equal(PLAYERS.filter(p=>p.gender==='male').length,3);assert.equal(PLAYERS.filter(p=>p.gender==='female').length,3);assert.equal(new Set(PLAYERS.map(p=>p.id)).size,6);for(const p of PLAYERS)assert.equal(PLAYER[p.id],p);
});
test('all six cosmetic choices preserve card pool, resources, opening randomness and real combat',()=>{
 let baseline;
 for(const p of PLAYERS){const g=create('试剑人',p.id,123);assert.equal(g.s.player.portrait,p.id);const snapshot=clone(g.s);if(!baseline)baseline=snapshot;for(const key of ['deck','relics','hp','maxHp','gold','rng','opening','stats','step'])assert.deepEqual(snapshot[key],baseline[key],p.title+' '+key);
  claim(g);g.enter('battle');assert.equal(g.s.b.hand.length,5);assert.equal(g.s.phase,'battle');assert.equal(g.s.player.portrait,p.id);
 }
});
test('name length, normalization and invisible characters are checked before confirmation',()=>{
 for(const name of ['', '   ', 'abcdefghijklmn', '一二三四五六七八九十一二三', '\n侠', '侠\u202e客','侠\u200b客'])assert.ok(playerNameError(name),JSON.stringify(name));
 for(const name of ['林听雪','江湖No1','一二三四五六七八九十一二','<小雪>','O\'Connor','岳&林'])assert.equal(playerNameError(name),'',name);
 assert.equal(cleanPlayerName('　陆  听风　'),'陆 听风');assert.equal(cleanPlayerName('ＡＢＣ'),'ABC');
 const g=new Game();g.start(42);g.choosePlayerPortrait('male-bai');g.setCharacterName('abcdefghijklmn');const before=clone(g.s);assert.equal(g.finishCharacter(),false);assert.deepEqual(g.s,before);g.setCharacterName('　林听雪　');assert.equal(g.finishCharacter(),true);assert.equal(g.s.player.name,'林听雪');
});
test('unknown portrait IDs cannot be selected and clearing a choice requires a new selection',()=>{
 const g=new Game();g.start(42);g.setCharacterName('林听雪');for(const id of ['unknown','__proto__','constructor',{},1]){const before=clone(g.s);assert.equal(g.choosePlayerPortrait(id),false);assert.deepEqual(g.s,before);}
 g.choosePlayerPortrait('female-bai');assert.equal(g.choosePlayerPortrait(null),true);assert.equal(g.finishCharacter(),false);
});
test('partially completed creation resumes from saved name and portrait without consuming randomness',()=>{
 const g=new Game();g.start(123);g.setCharacterName('柳青禾');g.choosePlayerPortrait('female-fei');const before=clone(g.s),restored=new Game(before);assert.deepEqual(restored.s,before);assert.equal(validCharacterDraft(restored.s.character),true);assert.equal(restored.finishCharacter(),true);assert.equal(restored.s.player.name,'柳青禾');assert.equal(restored.s.player.portrait,'female-fei');assert.equal(before.phase,'character');
 const same=create('柳青禾','female-fei',123);assert.deepEqual(restored.s.opening,same.s.opening);
});
test('editing identity in battle preserves every gameplay field and returns to the same round',()=>{
 const g=create();claim(g);g.enter('battle');g.endTurn();const before=clone(g.s);assert.equal(g.editCharacter(),true);assert.equal(g.s.phase,'character');assert.equal(g.s.character.editing,true);assert.equal(g.editCharacter(),false);g.setCharacterName('沈行舟');g.choosePlayerPortrait('male-xuan');const resumed=new Game(g.s);assert.equal(resumed.finishCharacter(),true);assert.deepEqual(resumed.s.player,{name:'沈行舟',portrait:'male-xuan',hero:'custom',talent:'steady'});
 for(const key of ['phase','deck','relics','hp','maxHp','gold','rng','b','stats','step','history','scene','reward','opening'])assert.deepEqual(resumed.s[key],before[key],key);
});
test('canceling an appearance edit restores the exact original game',()=>{
 const g=create();claim(g);g.enter('battle');const before=clone(g.s);g.editCharacter();g.setCharacterName('未保存');g.choosePlayerPortrait('male-bai');assert.equal(g.cancelCharacter(),true);assert.deepEqual(g.s,before);assert.equal(g.cancelCharacter(),false);
});
test('editing during a claimed opening reward does not reroll or grant it twice',()=>{
 const g=create();const o=g.s.opening.options.find(x=>!['refine','simplify','insight'].includes(x.id));g.chooseOpening(o.id);const opening=clone(g.s.opening),before=clone(g.s);g.editCharacter();g.setCharacterName('李知微');g.choosePlayerPortrait('female-bai');g.finishCharacter();assert.equal(g.s.phase,'opening');assert.deepEqual(g.s.opening,opening);for(const k of ['gold','hp','maxHp','deck','relics','rng'])assert.deepEqual(g.s[k],before[k]);assert.equal(g.chooseOpening(o.id),false);
});
test('version-4 saves receive a default portrait without resetting existing battle progress',()=>{
 const g=new Game();g.start(42,{opening:false});g.enter('battle');g.endTurn();delete g.s.player;g.s.version=4;const before=clone(g.s),restored=new Game(before);assert.equal(restored.s.version,SAVE_VERSION);assert.deepEqual(restored.s.player,DEFAULT_PLAYER);for(const k of ['phase','deck','relics','b','hp','rng','step','stats'])assert.deepEqual(restored.s[k],before[k]);assert.equal(before.player,undefined);assert.equal(restored.editCharacter(),true);
});
test('profile and draft validation reject corrupted identity saves',()=>{
 assert.equal(validPlayer({name:'林听雪',portrait:'female-qing'}),true);for(const p of [null,{}, {name:'',portrait:'female-qing'},{name:'  林听雪 ',portrait:'female-qing'},{name:'林听雪',portrait:'bad'}])assert.equal(validPlayer(p),false);
 const draft={name:'',portrait:null,editing:false,returnPhase:'opening'};assert.equal(validCharacterDraft(draft),true);for(const c of [null,{}, {...draft,portrait:'bad'},{...draft,returnPhase:'battle'},{...draft,name:'一'.repeat(61)}])assert.equal(validCharacterDraft(c),false);
});
test('original and runtime player portraits and per-character prompts are present',()=>{
 const prompts=JSON.parse(readFileSync(new URL('../art/player-prompts.json',import.meta.url),'utf8'));assert.equal(prompts.length,6);for(const p of PLAYERS){assert.ok(prompts.some(d=>d.id===p.id&&d.gender===p.gender));for(const file of ['assets/players/'+p.id+'.png',p.art]){const bytes=readFileSync(new URL('../'+file,import.meta.url));if(bytes.subarray(1,4).toString()!=='PNG'){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}assert.ok(bytes.length>10000);}}
});
