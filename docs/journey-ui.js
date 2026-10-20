import {restRate} from './expedition.js?v=0.25.2';
import {CARD,RELIC} from './data.js?v=0.25.2';
// Read only results already resolved by the engine; never roll or predict an event reward.
export function journeyResultItems(state,message=''){
 const named=name=>message.includes(`「${name}」`);
 const cards=[];
 for(const id of new Set((state.deck||[]).map(c=>c.id))){
  const d=CARD[id];if(!d||!named(d.name)&&!(id==='CURSE'&&message.includes('心魔')))continue;
  const refined=message.includes('精进')&&(state.deck||[]).some(c=>c.id===id&&c.up);
  cards.push({id,up:!!refined,change:d.type==='curse'?'代价':refined?'永久精进':'习得武学'});
 }
 return {cards,relics:(state.relics||[]).filter(id=>RELIC[id]&&named(RELIC[id].name))};
}
export function restRecovery(game){
 const {hp,maxHp}=game.s,amount=Math.floor(maxHp*restRate(game.s)),blocked=game.has('R27');
 return {hp,maxHp,amount,gain:blocked?0:Math.max(0,Math.min(amount,maxHp-hp)),blocked,eligible:game.s.deck.filter(c=>!c.up&&!['status','curse'].includes(CARD[c.id].type))};
}
