// Synthesised sound effects. No audio files; presentation only, never touches game state.
const SFX_KEY='yiju-jianghu-sfx';
let sfxContext=null,sfxOff=false;
try{sfxOff=localStorage.getItem(SFX_KEY)==='off';}catch{}
export const sfxMuted=()=>sfxOff;
export function setSfxMuted(off){sfxOff=!!off;try{localStorage.setItem(SFX_KEY,sfxOff?'off':'on');}catch{}}
function sfxCtx(){
 if(sfxOff)return null;
 try{const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;sfxContext??=new AC();if(sfxContext.state==='suspended')sfxContext.resume();return sfxContext;}catch{return null;}
}
function sfxTone(ctx,{type='sine',from=440,to=from,start=0,dur=.15,vol=.2,attack=.005}){
 const t=ctx.currentTime+start,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+dur+.02);
}
function sfxNoise(ctx,{start=0,dur=.12,vol=.25,freq=1800,q=.8,type='bandpass'}){
 const t=ctx.currentTime+start,len=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);
 for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len)**2;
 const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buf;f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.value=vol;src.connect(f).connect(g).connect(ctx.destination);src.start(t);
}
const SFX_BANK={
 card:c=>sfxNoise(c,{dur:.16,vol:.12,freq:2600,q:.6,type:'highpass'}),
 hit:c=>{sfxNoise(c,{dur:.09,vol:.35,freq:1400,q:1.2});sfxTone(c,{type:'triangle',from:180,to:60,dur:.14,vol:.35});},
 heavy:c=>{sfxNoise(c,{dur:.14,vol:.45,freq:900,q:1});sfxTone(c,{type:'triangle',from:130,to:40,dur:.24,vol:.45});},
 hurt:c=>{sfxTone(c,{type:'sawtooth',from:220,to:90,dur:.2,vol:.12});sfxNoise(c,{dur:.12,vol:.25,freq:600,q:.9});},
 block:c=>{sfxTone(c,{type:'square',from:1250,to:1100,dur:.07,vol:.06});sfxTone(c,{type:'sine',from:2400,to:2200,dur:.18,vol:.05,start:.01});},
 heal:c=>{sfxTone(c,{from:660,dur:.18,vol:.08});sfxTone(c,{from:990,dur:.25,vol:.07,start:.08});},
 defeat:c=>{sfxTone(c,{type:'sine',from:196,to:180,dur:1.1,vol:.18,attack:.01});sfxTone(c,{type:'sine',from:392,to:370,dur:.8,vol:.07,attack:.01});sfxNoise(c,{dur:.2,vol:.2,freq:500});},
 victory:c=>{[523,659,784,1047].forEach((f,i)=>sfxTone(c,{type:'triangle',from:f,dur:.32,vol:.1,start:i*.11}));},
 lose:c=>{[330,262,196].forEach((f,i)=>sfxTone(c,{type:'triangle',from:f,to:f*.97,dur:.5,vol:.1,start:i*.22}));},
 turn:c=>sfxTone(c,{type:'sine',from:520,to:780,dur:.12,vol:.05}),
 click:c=>sfxTone(c,{type:'sine',from:880,to:660,dur:.05,vol:.035})
};
let sfxLast={};
export function playSfx(name){
 const c=sfxCtx(),fn=SFX_BANK[name];if(!c||!fn)return;
 const now=performance.now();if(now-(sfxLast[name]||0)<45)return;sfxLast[name]=now;
 try{fn(c);}catch{}
}
export function buzz(ms=18){if(sfxOff)return;try{navigator.vibrate?.(ms);}catch{}}
