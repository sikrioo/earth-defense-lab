const noop=()=>{};
const ctxP=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='measureText'?()=>({width:30}):k.startsWith('create')?()=>({addColorStop:noop}):noop),set:(t,k,v)=>{t[k]=v;return true}});
const el=()=>{const e={offsetWidth:1,getBoundingClientRect:()=>({width:100,height:100}),contains:()=>false,querySelector:()=>el(),style:{setProperty:noop},prepend:noop,remove:noop,classList:{toggle:noop,add:noop,remove:noop},width:0,height:0,offsetHeight:120,children:[],getContext:()=>ctxP,addEventListener:(n,f)=>{(global.EH=global.EH||{})[n]=f},setAttribute:noop,appendChild(c){this.children.push(c);this.lastChild=c;},setPointerCapture:noop};
 let html='';Object.defineProperty(e,'innerHTML',{get:()=>html,set:v=>{html=v;e.lastChild={style:{}}}});e.querySelector=()=>el();return e;};
const ids={};global.document={getElementById:(i)=>ids[i]||(ids[i]=el()),querySelector:()=>el(),createElement:()=>el()};
global.innerWidth=1200;global.innerHeight=800;global.devicePixelRatio=1;
global.matchMedia=()=>({matches:false});const handlers={};global.addEventListener=(n,f)=>handlers[n]=f;
let t=0;const frames=[];global.requestAnimationFrame=f=>frames.push(f);global.performance={now:()=>t};
global.matchMedia=()=>({matches:false}); global.window=global; document.documentElement={style:{setProperty(){}}};  global.Image=class{ };
require('./x.js');
for(let i=0;i<900;i++){t+=16;const f=frames.shift();f(t);}
// cast every skill
const kd=handlers.keydown;
for(const c of ['q','w','e','r','t','y']){kd({key:c});for(let n=1;n<=10;n++){kd({key:String(n%10)});EH.pointerdown({pointerId:1,clientX:600,clientY:300});for(let i=0;i<120;i++){t+=16;frames.shift()(t);}EH.pointerup();}}
console.log('ran OK', ids.stats.textContent);
