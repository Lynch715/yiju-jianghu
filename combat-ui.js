// Presentation snapshots never mutate the battle or enter the saved game.
export function combatSnapshot(s){
 if(!s?.b)return null;
 return {hp:Math.max(0,s.hp),maxHp:s.maxHp,block:s.b.block,qi:s.b.qi,turn:s.b.turn,handUids:s.b.hand.map(c=>c.uid),actions:(s.b.lastEnemyActions||[]).map(x=>({...x})),enemies:s.b.enemies.map(e=>({key:e.key,hp:e.hp,maxHp:e.maxHp,block:e.block,alive:e.hp>0}))};
}
export function combatFeedback(before,after,{enemyTurn=false}={}){
 if(!before||!after)return [];
 const changes=[];
 const compare=(target,a,b,showAbsorbed=true)=>{
  if(b.hp<a.hp)changes.push({target,kind:'damage',text:`−${a.hp-b.hp}`});
  if(b.hp>a.hp)changes.push({target,kind:'heal',text:`+${b.hp-a.hp}`});
  if(b.block>a.block)changes.push({target,kind:'block',text:`格挡 +${b.block-a.block}`});
  if(showAbsorbed&&b.block<a.block&&b.hp===a.hp)changes.push({target,kind:'blocked',text:'格挡'});
 };
 compare('player',before,after,enemyTurn&&(after.actions||[]).some(e=>e.attacks));
 for(const e of before.enemies){const next=after.enemies.find(x=>x.key===e.key);if(next)compare(e.key,e,next);}
 return changes;
}

// Trace completed actions only. Nothing is persisted, rerun, or read from future intents.
export function captureCombatAction(game,action){
 const before=combatSnapshot(game.s),steps=[],hadObserver=Object.hasOwn(game,'onCombatStep'),observer=game.onCombatStep;
 game.onCombatStep=step=>{steps.push({...step,snapshot:combatSnapshot(game.s)});observer?.(step);};
 let result;try{result=action();}finally{if(hadObserver)game.onCombatStep=observer;else delete game.onCombatStep;}
 return {result,before,after:combatSnapshot(game.s),steps};
}
export async function playCombatSteps(steps,present){
 for(const step of steps)await present(step);
}
