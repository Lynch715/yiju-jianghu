import test from 'node:test';import assert from 'node:assert/strict';import {HandScrub} from '../hand-gesture.js';
const start=(s,pointerId=1)=>s.begin({pointerId,x:10,y:100,anchors:[10,40,70],uids:[101,102,103]});
test('horizontal scrubbing selects in both directions and clamps at either edge',()=>{
 const s=new HandScrub();assert.ok(start(s));assert.equal(s.move({pointerId:1,x:13,y:101}),null);
 assert.deepEqual(s.move({pointerId:1,x:42,y:102}),{uid:102,started:true});assert.equal(s.move({pointerId:1,x:400,y:102}).uid,103);assert.equal(s.move({pointerId:1,x:-200,y:102}).uid,101);
 assert.ok(s.end({pointerId:1,x:-200,y:102,time:100}));assert.equal(s.current,null);
});
test('tap and primarily vertical motion do not begin a scrub or swallow a normal click',()=>{
 for(const point of [{x:12,y:101},{x:15,y:180}]){const s=new HandScrub();start(s);assert.equal(s.move({pointerId:1,...point}),null);assert.equal(s.end({pointerId:1,...point,time:100}),false);assert.equal(s.consumesClick({pointerId:1,...point,time:101}),false);}
});
test('release-generated click is consumed but a separate confirmation button remains usable immediately',()=>{
 const s=new HandScrub();start(s);s.move({pointerId:1,x:70,y:100});s.end({pointerId:1,x:70,y:100,time:100});
 assert.equal(s.consumesClick({pointerId:1,x:140,y:40,time:101}),false);
 assert.equal(s.consumesClick({pointerId:1,x:70,y:100,time:102}),true);assert.equal(s.consumesClick({pointerId:1,x:70,y:100,time:103}),false);
});
test('another pointer cannot move or finish the active scrub; cancellation cleans up capture state',()=>{
 const s=new HandScrub();start(s);assert.equal(s.move({pointerId:2,x:70,y:100}),null);assert.equal(s.end({pointerId:2,x:70,y:100,time:50}),false);
 s.move({pointerId:1,x:70,y:100});assert.equal(s.cancel(100),true);assert.equal(s.current,null);assert.equal(s.move({pointerId:1,x:10,y:100}),null);assert.ok(start(s,2));
});
test('stale release suppression expires and never blocks a fresh gesture or keyboard click',()=>{
 const s=new HandScrub();start(s);s.move({pointerId:1,x:70,y:100});s.end({pointerId:1,x:70,y:100,time:100});
 assert.equal(s.consumesClick({pointerId:1,x:70,y:100,time:701}),false);start(s,2);assert.equal(s.suppressed,null);assert.equal(s.consumesClick({x:0,y:0,time:702}),false);
});
test('zero cards are ignored, one card stays selected, and anchors are snapshotted before visual lift',()=>{
 const s=new HandScrub();assert.equal(s.begin({pointerId:1,x:0,y:0,anchors:[],uids:[]}),false);assert.equal(s.begin({pointerId:1,x:0,y:0,anchors:[NaN],uids:[1]}),false);
 const anchors=[30];assert.ok(s.begin({pointerId:1,x:0,y:0,anchors,uids:[7]}));anchors[0]=500;assert.deepEqual(s.current.anchors,[30]);assert.equal(s.move({pointerId:1,x:100,y:0}).uid,7);
});

test('boundary hysteresis absorbs small thumb jitter without delaying a deliberate crossing',()=>{
 const s=new HandScrub();start(s);assert.equal(s.move({pointerId:1,x:18,y:100}).uid,101);
 for(const x of [24,26,28,25])assert.equal(s.move({pointerId:1,x,y:100}).uid,101);
 assert.equal(s.move({pointerId:1,x:31,y:100}).uid,102);
 for(const x of [26,24,22])assert.equal(s.move({pointerId:1,x,y:100}).uid,102);
 assert.equal(s.move({pointerId:1,x:19,y:100}).uid,101);
});
test('fast motion may skip directly across many cards and still reaches either edge',()=>{
 const s=new HandScrub(),anchors=Array.from({length:10},(_,i)=>30+i*25);s.begin({pointerId:1,x:30,y:100,anchors,uids:anchors.map((_,i)=>i)});
 assert.equal(s.move({pointerId:1,x:33,y:100}),null);assert.equal(s.move({pointerId:1,x:34,y:100}).uid,0);
 assert.equal(s.move({pointerId:1,x:500,y:100}).uid,9);assert.equal(s.move({pointerId:1,x:-100,y:100}).uid,0);
});
