// Presentation snapshots never mutate the battle or enter the saved game.
export function combatSnapshot(s){
 if(!s?.b)return null;
 return {hp:s.hp,block:s.b.block,enemies:s.b.enemies.map(e=>({key:e.key,hp:e.hp,block:e.block,label:e.intent?.label,attacks:!!e.intent?.damage,alive:e.hp>0}))};
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
 compare('player',before,after,enemyTurn&&before.enemies.some(e=>e.alive&&e.attacks));
 for(const e of before.enemies){const next=after.enemies.find(x=>x.key===e.key);if(next)compare(e.key,e,next);}
 return changes;
}
