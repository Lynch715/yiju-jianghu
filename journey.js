// Versioned, seed-stable travel graphs. Map randomness never consumes combat/reward RNG.
export const JOURNEY_FLOORS=15;
export const JOURNEY_TOTAL=45;
const journeyCache=new Map();
const journeyLayers=[['battle','battle'],['event','battle','event'],['battle','event','battle'],['rest','battle','event'],['elite','battle','elite'],['shop','event','rest'],['battle','battle','event'],['treasure'],['battle','event','battle'],['elite','battle','event'],['shop','rest','shop'],['battle','event','battle'],['elite','battle','elite'],['rest','rest'],['boss']];
const journeyPlaces=[
 ['烟柳渡','听雨巷','青石桥','竹影溪','松风岭','长亭集','旧栈道','古寺地宫','九曲涧','断桥坡','杏花驿','幽篁谷','青城险径','松下草庐','青城山门'],
 ['中州古渡','白马街','枫林径','溪山亭','落雁峡','河间集','藏风坳','石窟秘藏','黄沙驿','血刀谷','山前茶肆','寒潭栈桥','星宿险峰','无尘道观','星宿石台'],
 ['华阴山口','古柏林','云门桥','洗剑泉','回雁崖','西岳驿','长空栈道','洞天遗藏','千尺幢','百丈峡','云台客舍','苍龙岭','绝壁天险','落日草庐','华山绝顶']
];
export function journeyChapter(seed,chapter){
 const key=(seed>>>0)+':'+chapter;if(journeyCache.has(key))return journeyCache.get(key);
 let value=((seed>>>0)^Math.imul(chapter+1,0x9e3779b9))>>>0;
 const roll=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 const nodes=[],rows=[];
 for(let floor=0;floor<JOURNEY_FLOORS;floor++){
  const kinds=[...journeyLayers[floor]];
  // Keep both side paths risky at the elite gates; vary the other route positions by seed.
  if(![0,4,7,12,13,14].includes(floor))for(let i=kinds.length-1;i>0;i--){const j=Math.floor(roll()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
  const xs=kinds.length===1?[50]:kinds.length===2?[32,68]:[21,50,79];
  const row=kinds.map((kind,lane)=>({id:`j1-${chapter}-${floor}-${lane}`,chapter,floor,lane,kind,name:journeyPlaces[chapter][floor]+(kinds.length===3?['西径','中道','东径'][lane]:kinds.length===2?['西路','东路'][lane]:''),x:xs[lane]+(kinds.length===1?0:Math.round((roll()-.5)*6)),yOffset:kinds.length===1?0:((seed>>>0)+floor*17+lane*11+chapter*13)%13-6}));
  rows.push(row);nodes.push(...row);
 }
 const edges=[];
 for(let floor=0;floor<rows.length-1;floor++){
  const from=rows[floor],to=rows[floor+1];
  for(let i=0;i<from.length;i++)for(let j=0;j<to.length;j++){
   const a=from.length===1?1:i*2/(from.length-1),b=to.length===1?1:j*2/(to.length-1);
   if(from.length===1||to.length===1||Math.abs(a-b)<=1)edges.push([from[i].id,to[j].id]);
  }
  if(from.length===3&&to.length===3){
   for(let lane=0;lane<2;lane++){
    const remove=roll()<.5?[from[lane].id,to[lane+1].id]:[from[lane+1].id,to[lane].id];
    const index=edges.findIndex(([a,b])=>a===remove[0]&&b===remove[1]);edges.splice(index,1);
   }
  }
 }
 const result={chapter,rows,nodes,edges};
 // Freeze cached graph data; saves contain just completed node IDs and the active node.
 nodes.forEach(Object.freeze);rows.forEach(Object.freeze);edges.forEach(Object.freeze);
 Object.freeze(nodes);Object.freeze(rows);Object.freeze(edges);Object.freeze(result);
 if(journeyCache.size>=64)journeyCache.delete(journeyCache.keys().next().value);journeyCache.set(key,result);return result;
}
export function newJourney(){return {version:1,path:[],active:null};}
export function validJourney(s){
 const j=s?.journey;if(j===undefined)return Number.isInteger(s?.step)&&s.step>=0&&s.step<=18;
 if(!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff)return false;
 if(!j||j.version!==1||!Array.isArray(j.path)||j.path.length!==s.step||s.step<0||s.step>JOURNEY_TOTAL||!(j.active===null||typeof j.active==='string'))return false;
 for(let step=0;step<j.path.length;step++){
  const ch=Math.floor(step/JOURNEY_FLOORS),floor=step%JOURNEY_FLOORS,map=journeyChapter(s.seed,ch),id=j.path[step];
  if(!map.rows[floor].some(n=>n.id===id)||floor>0&&!map.edges.some(([a,b])=>a===j.path[step-1]&&b===id))return false;
 }
 if(j.active!==null){if(!s.scene||s.scene.nodeId!==j.active||s.scene.step!==s.step)return false;if(s.step>=JOURNEY_TOTAL)return false;const ch=Math.floor(s.step/JOURNEY_FLOORS),floor=s.step%JOURNEY_FLOORS,map=journeyChapter(s.seed,ch);if(!map.rows[floor].some(n=>n.id===j.active)||floor>0&&!map.edges.some(([a,b])=>a===j.path.at(-1)&&b===j.active))return false;}
 const phase=s.phase==='character'&&s.character?.editing?s.character.returnPhase:s.phase;
 if((phase==='win')!==(s.step===JOURNEY_TOTAL))return false;
 if(['character','opening','map','win'].includes(phase))return j.active===null;
 if(j.active===null)return false;
 const node=journeyChapter(s.seed,Math.floor(s.step/JOURNEY_FLOORS)).nodes.find(n=>n.id===j.active);
 return ['battle','reward','lost'].includes(phase)?['battle','elite','boss'].includes(node.kind):node.kind===phase;
}
