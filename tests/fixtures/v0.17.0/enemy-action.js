// Read only the enemy's current chosen action. Never advance rounds, RNG or boss tactics.
export function enemyActionView(game,enemy){
 if(!enemy||enemy.hp<=0)return {state:'dead',tags:[]};
 if(enemy.bornTurn===game.s.b.turn)return {state:'waiting',tags:[]};
 const current=enemy.intent||{},tags=[],add=(kind,text)=>tags.push({kind,text});
 if(current.damage){const hits=current.hits||1,first=game.previewEnemy(enemy,0),later=hits>1?game.previewEnemy(enemy,1):first;tags.push(enemyAttackTag(enemy,first,later,hits));}
 if(current.block)add('block',`格挡 +${current.block}`);
 if(current.allyBlock)add('block',`护援 +${current.allyBlock}`);
 if(current.charge)add('charge',`蓄力 +${current.charge}`);else if(current.windup)add('charge','蓄力');
 if(current.str)add('buff',`劲力 +${current.str}`);
 for(const [key,name] of [['weak','虚弱'],['vuln','破绽'],['poison','施毒'],['chill','寒气'],['status','塞牌']])if(current[key])add('debuff',`${name} ${current[key]}`);
 if(current.woundOnHit)add('debuff',`伤及气血塞牌 ${current.woundOnHit}`);
 if(current.leech||current.drainRatio)add('special','饮血');
 if(current.summonPoison)add('special','召援');
 if(current.plantMines)add('special','布置');
 if(current.detonate)add('special','引爆');
 if(current.selfDestruct)add('special','自爆');
 if(!tags.length)add('special',/被破/.test(current.label||'')?'架势受挫':'调整架势');
 return {state:'ready',tags};
}

// Keep numeric segments beside the accessible plain text. Base is this chosen move's
// damage before strength, weakness, charge, vulnerability and per-hit reductions.
export function enemyAttackTag(enemy,first,later=first,hits=1){
 const base=Number(enemy.intent?.damage)||0;
 const segments=hits===1?[{amount:first,count:1,base}]:first===later?[{amount:first,count:hits,base}]:[{amount:first,count:1,base},{amount:later,count:hits-1,base}];
 return {kind:'attack',text:'攻击 '+segments.map(s=>s.amount+(s.count>1?'×'+s.count:'')).join('＋'),segments};
}
const escapeActionText=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function enemyActionTagHTML(tag){
 if(tag.kind!=='attack'||!tag.segments?.length)return escapeActionText(tag.text);
 return '攻击 '+tag.segments.map(({amount,base,count})=>{
  const number=amount===base?escapeActionText(amount):`<span class="combat-value ${amount>base?'higher':'lower'}" title="${amount>base?'高于':'低于'}基础值 ${escapeActionText(base)}">${escapeActionText(amount)}</span>`;
  return number+(count>1?'×'+escapeActionText(count):'');
 }).join('＋');
}
