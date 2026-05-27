const $ = (q) => document.querySelector(q);
const els = {
  fx: $("#fx"), coins: $("#coinsText"), xp: $("#xpText"), level: $("#levelText"),
  loading: $("#loadingScreen"), stage: $("#stage"), monster: $("#monster"), body: $("#bodyCore"),
  tabs: $("#tabs"), parts: $("#partsGrid"), rooms: $("#roomSwitcher"), shop: $("#shopModal"),
  gallery: $("#galleryModal"), result: $("#resultModal"), shopGrid: $("#shopGrid"), galleryGrid: $("#galleryGrid"),
  color: $("#colorInput"), size: $("#sizeInput"), rotate: $("#rotateInput"), target: $("#targetCard"), info: $("#challengeInfo")
};
const ctx = els.fx.getContext("2d");
const categories = {
  eyes:["👀","😳","😍","😎","🤩","😵","🥺","😈","👁️","🤖","⭐","💫"],
  mouths:["😀","😬","😋","😮","😴","😂","👄","🦷","😛","🤪","😡","😱"],
  horns:[" horn","🦄","📡","🔱","🌙","⚡","🔥","💎","🪶","🧲","🧪","🪄"],
  ears:["👂","🐰","🐱","🐭","🪽","🍃","🦇","🦊","🌸","🛸","📣","🎧"],
  arms:["💪","🦾","🪄","🧤","🦀","🦑","⚡","🔥","🧲","🍭","🛡️","🎈"],
  legs:["🦵","🦿","👟","🛼","🐾","🦆","🛞","⚙️","🧊","🔥","🌈","⭐"],
  wings:["🪽","🦋","🦇","🚀","☁️","🌈","🔥","❄️","💎","🪁","🌟","🛸"],
  tails:["〰️","🦎","🐉","⚡","🔥","🌈","🧵","🪝","💫","🌙","🍭","🎀"],
  hats:["🎩","👑","🧢","⛑️","🎓","🪖","🧙","🤠","🎀","🌸","🛸","💡"],
  glasses:["🕶️","👓","🥽","💫","⭐","🔍","🧿","💎","⚙️","🎯","🌈","✨"],
  noses:["👃","🔴","⭐","💧","🍓","🧲","🛎️","🧊","🔥","💎","🌙","🍄"],
  extras:["✨","💎","⚙️","🌈","🧪","🔔","🎵","🪩","🧸","🍭","🛡️","🧬"]
};
const rooms = [
  ["lab","Mad Lab"],["space","Alien World"],["robot","Robot Factory"],["city","Monster City"],["neon","Neon World"]
];
const saveKey = "monsterCreatorStudio";
const state = {
  coins:0,xp:0,level:1,unlocked:["eyes","mouths","horns","ears"],gallery:[],selected:null,
  activeCat:"eyes",pieces:[],history:[],future:[],challenge:null,lastDaily:""
};
let audio, dpr = 1, particles = [], dragging = null, zCounter = 5;
function load(){Object.assign(state,JSON.parse(localStorage.getItem(saveKey)||"{}"));state.unlocked ||= ["eyes","mouths","horns","ears"];state.gallery ||= [];state.pieces=[];state.history=[];state.future=[]}
function save(){localStorage.setItem(saveKey,JSON.stringify({...state,pieces:[],history:[],future:[],selected:null}))}
function makeId(){return globalThis.crypto?.randomUUID?.() || `piece-${Date.now()}-${Math.random().toString(16).slice(2)}`}
function serializePieces(){return state.pieces.map(({el,...piece})=>({...piece}))}
function resize(){dpr=Math.min(2,devicePixelRatio||1);els.fx.width=innerWidth*dpr;els.fx.height=innerHeight*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
function ac(){if(!audio){const AudioApi=window.AudioContext||window.webkitAudioContext;if(!AudioApi)return;audio=new AudioApi()}if(audio.state==="suspended")audio.resume()}
function tone(f,d=.1,type="triangle",g=.04){if(!audio)return;const o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.value=f;v.gain.value=g;o.connect(v);v.connect(audio.destination);o.start();v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.stop(audio.currentTime+d)}
function sound(k){ac();({tap:[520],add:[520,780],save:[523,659,784],laugh:[420,620,880],bad:[120,90]}[k]||[440]).forEach((f,i)=>setTimeout(()=>tone(f,.11,k==="bad"?"sawtooth":"triangle"),i*65))}
function speak(text){if(!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.pitch=1.55;u.rate=1.05;speechSynthesis.speak(u)}
function renderAll(){els.coins.textContent=state.coins;els.xp.textContent=state.xp;els.level.textContent=state.level;renderTabs();renderParts();renderRooms();renderShop();renderGallery();save()}
function renderTabs(){els.tabs.innerHTML="";Object.keys(categories).forEach(cat=>{const b=document.createElement("button");b.textContent=cat; b.className=state.activeCat===cat?"active":""; b.onclick=()=>{state.activeCat=cat;renderTabs();renderParts();sound("tap")};els.tabs.appendChild(b)})}
function renderParts(){els.parts.innerHTML="";categories[state.activeCat].forEach((icon,i)=>{const b=document.createElement("button");b.className=`part-btn ${state.unlocked.includes(state.activeCat)?"":"locked"}`;b.textContent=icon.trim()?icon:"🔺";b.onclick=()=>{if(!state.unlocked.includes(state.activeCat)){sound("bad");return}addPiece(icon.trim()?icon:"🔺",state.activeCat,i)};els.parts.appendChild(b)})}
function renderRooms(){els.rooms.innerHTML="";rooms.forEach(([id,name])=>{const b=document.createElement("button");b.textContent=name;b.className=els.stage.classList.contains(id)?"active":"";b.onclick=()=>{els.stage.className=`stage ${id}`;renderRooms();burst(innerWidth/2,innerHeight/2,"#28dcff",22);sound("tap")};els.rooms.appendChild(b)})}
function renderShop(){els.shopGrid.innerHTML="";Object.keys(categories).forEach(cat=>{const card=document.createElement("article");card.className="card";const ok=state.unlocked.includes(cat);card.innerHTML=`<div class="preview">${categories[cat][0]}</div><h3>${cat}</h3><p>Unlock 12 premium parts.</p><button>${ok?"Unlocked":`Unlock ${120+cat.length*20}`}</button>`;card.querySelector("button").onclick=()=>{const price=120+cat.length*20;if(ok)return;if(state.coins<price){sound("bad");return}state.coins-=price;state.unlocked.push(cat);renderAll();sound("save")};els.shopGrid.appendChild(card)})}
function renderGallery(){els.galleryGrid.innerHTML="";if(!state.gallery.length){els.galleryGrid.innerHTML="<p>No saved monsters yet.</p>";return}state.gallery.forEach((m,i)=>{const card=document.createElement("article");card.className="gallery-card";card.innerHTML=`<button>${m.icon}</button><span>${m.name}</span><small>${m.parts} parts</small>`;card.querySelector("button").onclick=()=>loadGallery(i);els.galleryGrid.appendChild(card)})}
function snapshot(){state.history.push(serializePieces());if(state.history.length>40)state.history.shift();state.future.length=0}
function restore(list){clearPieces();list.forEach(p=>createPiece(p));syncState()}
function clearPieces(){document.querySelectorAll(".piece").forEach(p=>p.remove());state.pieces.length=0;state.selected=null}
function addPiece(icon,cat,index,skipSnapshot=false){if(!skipSnapshot)snapshot();const rect=els.stage.getBoundingClientRect();createPiece({id:makeId(),icon,cat,index,x:rect.width/2-20+Math.random()*40,y:rect.height/2-20+Math.random()*40,size:100,rot:0,flip:1,z:zCounter++});syncState();sound("add");burst(innerWidth/2,innerHeight/2,"#ffd45a",12)}
function createPiece(data){const el=document.createElement("div");el.className="piece";el.textContent=data.icon;el.dataset.id=data.id;els.stage.appendChild(el);const piece={...data,el};state.pieces.push(piece);applyPiece(piece);bindDrag(piece)}
function applyPiece(p){p.el.style.zIndex=p.z;p.el.style.fontSize=`${42*p.size/100}px`;p.el.style.transform=`translate3d(${p.x}px,${p.y}px,0) rotate(${p.rot}deg) scaleX(${p.flip})`}
function syncState(){state.pieces.forEach(p=>{p.el?.classList.toggle("selected",state.selected===p.id)});const p=current();if(p){els.size.value=p.size;els.rotate.value=p.rot}}
function current(){return state.pieces.find(p=>p.id===state.selected)}
function bindDrag(p){p.el.onpointerdown=e=>{e.preventDefault();ac();snapshot();state.selected=p.id;syncState();p.el.setPointerCapture(e.pointerId);const sx=e.clientX,sy=e.clientY,ox=p.x,oy=p.y;dragging={p,sx,sy,ox,oy,moved:false};p.z=++zCounter;applyPiece(p)};p.el.onpointermove=e=>{if(!dragging||dragging.p!==p)return;dragging.moved=true;p.x=dragging.ox+e.clientX-dragging.sx;p.y=dragging.oy+e.clientY-dragging.sy;applyPiece(p)};p.el.onpointerup=()=>{if(!dragging?.moved)state.history.pop();dragging=null}}
function updateSelected(fn){const p=current();if(!p)return;snapshot();fn(p);applyPiece(p);syncState();sound("tap")}
els.color.oninput=e=>{els.body.style.setProperty("--body",e.target.value);burst(innerWidth/2,innerHeight/2,e.target.value,6)};
els.size.oninput=e=>{const p=current();if(p){p.size=+e.target.value;applyPiece(p)}};
els.rotate.oninput=e=>{const p=current();if(p){p.rot=+e.target.value;applyPiece(p)}};
$("#frontBtn").onclick=()=>updateSelected(p=>p.z=++zCounter);$("#backBtn").onclick=()=>updateSelected(p=>p.z=Math.max(1,p.z-2));$("#flipBtn").onclick=()=>updateSelected(p=>p.flip*=-1);$("#deleteBtn").onclick=()=>{const p=current();if(!p)return;snapshot();p.el.remove();state.pieces=state.pieces.filter(x=>x!==p);state.selected=null;syncState()};
$("#undoBtn").onclick=()=>{if(!state.history.length)return;state.future.push(serializePieces());restore(state.history.pop());sound("tap")};
$("#redoBtn").onclick=()=>{if(!state.future.length)return;state.history.push(serializePieces());restore(state.future.pop());sound("tap")};
$("#randomBtn").onclick=randomMonster;function randomMonster(){snapshot();clearPieces();els.body.style.setProperty("--body",["#27dcff","#ff5ca8","#58ef9a","#ffd45a","#8d68ff"][Math.floor(Math.random()*5)]);Object.keys(categories).filter(c=>state.unlocked.includes(c)).forEach(cat=>{for(let i=0;i<1+(Math.random()<.35);i++){const list=categories[cat],icon=list[Math.floor(Math.random()*list.length)];addPiece(icon.trim()?icon:"🔺",cat,0)}});speak("Random monster ready!");}
function action(cls,line){els.monster.className=`monster ${cls}`;sound(cls==="battle"?"bad":"laugh");speak(line);burst(innerWidth/2,innerHeight/2,"#ff5ca8",24);setTimeout(()=>els.monster.className="monster",2200)}
$("#danceBtn").onclick=()=>action("dance","Dance party!");$("#laughBtn").onclick=()=>action("dance","Ha ha ha!");$("#sleepBtn").onclick=()=>action("sleep","Sleepy monster.");$("#battleBtn").onclick=()=>action("battle","Funny battle!");
$("#saveBtn").onclick=()=>{const parts=state.pieces.length,stars=Math.min(3,Math.max(1,Math.floor(parts/4)));state.coins+=40*stars;state.xp+=20*stars;state.level=1+Math.floor(state.xp/120);state.gallery.unshift({icon:"👾",name:`Monster ${state.gallery.length+1}`,parts});state.gallery=state.gallery.slice(0,12);showResult("Monster Saved!",stars,`You earned ${40*stars} coins.`);renderAll();sound("save")};
$("#challengeBtn").onclick=()=>{state.challenge={target:["wings","hats","glasses","tails"][Math.floor(Math.random()*4)],time:60};els.target.textContent=`Use ${state.challenge.target}!`;els.target.classList.add("active");els.info.textContent=`Challenge: add a ${state.challenge.target} part and save for bonus stars.`;sound("save")};
function showResult(title,stars,text){$("#resultTitle").textContent=title;$("#resultText").textContent=text;$("#starsBox").innerHTML="";for(let i=0;i<3;i++){const s=document.createElement("span");s.textContent=i<stars?"⭐":"☆";$("#starsBox").appendChild(s)}els.result.classList.add("active")}
function loadGallery(i){randomMonster();els.gallery.classList.remove("active");sound("tap")}
function burst(x,y,color,count){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=60+Math.random()*160;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.6,color,size:3+Math.random()*7})}}
function loop(){ctx.clearRect(0,0,innerWidth,innerHeight);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx/60;p.y+=p.vy/60;p.life-=1/60;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=14;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();if(p.life<=0)particles.splice(i,1)}ctx.globalAlpha=1;ctx.shadowBlur=0;requestAnimationFrame(loop)}
function openModal(m){m.classList.add("active")}document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest(".modal").classList.remove("active"));
$("#shopBtn").onclick=()=>openModal(els.shop);$("#galleryBtn").onclick=()=>openModal(els.gallery);$("#photoBtn").onclick=()=>{state.gallery.unshift({icon:"📸",name:`Snapshot ${state.gallery.length+1}`,parts:state.pieces.length});state.gallery=state.gallery.slice(0,12);renderGallery();save();showResult("Photo Mode",3,"Monster snapshot saved in your gallery.");sound("save")};
function randomMonsterFixed(){snapshot();clearPieces();els.body.style.setProperty("--body",["#27dcff","#ff5ca8","#58ef9a","#ffd45a","#8d68ff"][Math.floor(Math.random()*5)]);Object.keys(categories).filter(c=>state.unlocked.includes(c)).forEach(cat=>{for(let i=0;i<1+(Math.random()<.35);i++){const list=categories[cat],icon=list[Math.floor(Math.random()*list.length)];addPiece(icon.trim()?icon:"🔺",cat,0,true)}});speak("Random monster ready!")}
function saveCurrentMonster(icon,name){return {icon,name,parts:state.pieces.length,body:els.color.value,pieces:serializePieces()}}
function loadSavedMonster(i){const saved=state.gallery[i];if(!saved?.pieces){randomMonsterFixed();els.gallery.classList.remove("active");sound("tap");return}snapshot();clearPieces();els.color.value=saved.body||"#27dcff";els.body.style.setProperty("--body",els.color.value);saved.pieces.forEach(p=>createPiece({...p,id:makeId()}));syncState();els.gallery.classList.remove("active");sound("tap")}
loadGallery=loadSavedMonster;
$("#randomBtn").onclick=randomMonsterFixed;
$("#saveBtn").onclick=()=>{const parts=state.pieces.length,stars=Math.min(3,Math.max(1,Math.floor(parts/4)));state.coins+=40*stars;state.xp+=20*stars;state.level=1+Math.floor(state.xp/120);state.gallery.unshift(saveCurrentMonster("👾",`Monster ${state.gallery.length+1}`));state.gallery=state.gallery.slice(0,12);showResult("Monster Saved!",stars,`You earned ${40*stars} coins.`);renderAll();sound("save")};
$("#photoBtn").onclick=()=>{state.gallery.unshift(saveCurrentMonster("📸",`Snapshot ${state.gallery.length+1}`));state.gallery=state.gallery.slice(0,12);renderGallery();save();showResult("Photo Mode",3,"Monster snapshot saved in your gallery.");sound("save")};
window.addEventListener("resize",resize);load();resize();renderAll();setTimeout(()=>els.loading.classList.remove("active"),850);requestAnimationFrame(loop);
