// Selection-only gesture state; deliberately has no access to combat or play().
export class HandScrub {
 constructor(){this.current=null;this.suppressed=null;}
 begin({pointerId,x,y,anchors,uids}){
  if(this.current||!uids.length||anchors.length!==uids.length||!anchors.every(Number.isFinite))return false;
  this.suppressed=null;this.current={pointerId,x,y,lastX:x,lastY:y,anchors:[...anchors],uids:[...uids],active:false,index:null};return true;
 }
 move({pointerId,x,y}){
  const g=this.current;if(!g||g.pointerId!==pointerId)return null;
  g.lastX=x;g.lastY=y;
  if(!g.active&&(Math.abs(x-g.x)<4||Math.abs(x-g.x)<Math.abs(y-g.y)))return null;
  const started=!g.active;g.active=true;let index=0;
  for(let i=1;i<g.anchors.length;i++)if(Math.abs(x-g.anchors[i])<Math.abs(x-g.anchors[index]))index=i;
  // Crossing a boundary by a few pixels prevents thumb jitter from toggling cards.
  if(g.index!==null&&index!==g.index){const old=g.anchors[g.index],next=g.anchors[index],margin=Math.min(5,Math.abs(next-old)*.18);if(Math.abs(x-next)+margin*2>=Math.abs(x-old))index=g.index;}
  g.index=index;return {uid:g.uids[index],started};
 }
 end({pointerId,x,y,time}){
  const g=this.current;if(!g||g.pointerId!==pointerId)return false;this.current=null;
  if(g.active)this.suppressed={pointerId,x,y,until:time+600};return g.active;
 }
 cancel(time){const g=this.current;return g?this.end({pointerId:g.pointerId,x:g.lastX,y:g.lastY,time}):false;}
 consumesClick({pointerId,x,y,time}){
  const s=this.suppressed;if(!s)return false;
  if(time>s.until){this.suppressed=null;return false;}
  if((pointerId===undefined||pointerId===s.pointerId)&&Math.hypot(x-s.x,y-s.y)<28){this.suppressed=null;return true;}
  return false;
 }
}
