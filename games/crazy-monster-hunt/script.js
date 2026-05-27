const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const mini = document.querySelector("#map");
const mctx = mini.getContext("2d");
const shell = document.querySelector("#shell");

const ui = {
  hp: document.querySelector("#hpText"), xp: document.querySelector("#xpText"), coins: document.querySelector("#coinsText"),
  mission: document.querySelector("#missionText"), time: document.querySelector("#timeText"), weaponBar: document.querySelector("#weaponBar"),
  loading: document.querySelector("#loadingScreen"), menu: document.querySelector("#menuScreen"), heroes: document.querySelector("#heroesScreen"),
  shop: document.querySelector("#shopScreen"), pause: document.querySelector("#pauseScreen"), result: document.querySelector("#resultScreen"),
  heroGrid: document.querySelector("#heroGrid"), petGrid: document.querySelector("#petGrid"), shopGrid: document.querySelector("#shopGrid"),
  summary: document.querySelector("#saveSummary"), achievements: document.querySelector("#achievementSummary"),
  stars: document.querySelector("#stars"), resultIcon: document.querySelector("#resultIcon"), resultTitle: document.querySelector("#resultTitle"), resultText: document.querySelector("#resultText"),
  stick: document.querySelector("#stick"), knob: document.querySelector("#knob")
};

const worlds = [
  { id:"forest", name:"Spooky Forest", bg:["#102d27","#203d5d"], floor:"#16382d", glow:"#55ef9a", weather:"fog" },
  { id:"lab", name:"Secret Lab", bg:["#152047","#2f4277"], floor:"#18243c", glow:"#27dcff", weather:"rain" },
  { id:"city", name:"Abandoned City", bg:["#2a2137","#594056"], floor:"#282a35", glow:"#ffd45a", weather:"storm" },
  { id:"neon", name:"Neon Realm", bg:["#120b35","#5b1469"], floor:"#121225", glow:"#ff3d9a", weather:"night" },
  { id:"cave", name:"Dark Cave", bg:["#070812","#221634"], floor:"#171018", glow:"#9f7cff", weather:"fog" },
  { id:"ice", name:"Ice World", bg:["#dff9ff","#6a9ce9"], floor:"#22425d", glow:"#a7fbff", weather:"snow" }
];

const heroes = [
  { id:"zoe", name:"Zoe Zap", icon:"🧒", price:0, skill:"shock", color:"#27dcff", speed:1.08 },
  { id:"max", name:"Max Flame", icon:"🧑", price:350, skill:"fire", color:"#ff7048", speed:1 },
  { id:"luna", name:"Luna Ghost", icon:"🧙", price:700, skill:"invisible", color:"#d07cff", speed:1.14 },
  { id:"bolt", name:"Bolt Kid", icon:"🥷", price:1000, skill:"dash", color:"#55ef9a", speed:1.24 }
];

const pets = [
  { id:"none", name:"No Pet", icon:"✨", price:0 },
  { id:"spark", name:"Spark Pet", icon:"🐉", price:260 },
  { id:"bunny", name:"Gem Bunny", icon:"🐰", price:420 },
  { id:"bot", name:"Mini Bot", icon:"🤖", price:600 }
];

const weapons = [
  { id:"laser", name:"Laser Gun", icon:"🔫", unlock:1, color:"#27dcff", damage:26, cooldown:.22, speed:760 },
  { id:"freeze", name:"Freeze Gun", icon:"❄️", unlock:2, color:"#a7fbff", damage:14, cooldown:.36, speed:640 },
  { id:"trap", name:"Trap", icon:"🪤", unlock:3, color:"#ffd45a", damage:40, cooldown:.8, speed:0 },
  { id:"fire", name:"Fire Blaster", icon:"🔥", unlock:4, color:"#ff7048", damage:34, cooldown:.32, speed:560 },
  { id:"shock", name:"Electric Shock", icon:"⚡", unlock:5, color:"#ffe45e", damage:22, cooldown:.18, speed:690 }
];

const shopItems = [
  { id:"speed", name:"Speed Boost", icon:"💨", price:90, desc:"Move faster for the next mission." },
  { id:"shield", name:"Shield", icon:"🛡️", price:110, desc:"Blocks monster damage." },
  { id:"double", name:"Double Coins", icon:"🪙", price:130, desc:"Doubles collected coins." },
  { id:"jump", name:"Super Jump", icon:"⬆️", price:100, desc:"Pushes monsters away." },
  { id:"invisible", name:"Invisible Mode", icon:"👻", price:150, desc:"Monsters lose you for a while." }
];

const monsterTypes = [
  { icon:"👾", color:"#8b5cff", hp:45, speed:72, ai:"chase", voice:240 },
  { icon:"👹", color:"#ff4e69", hp:70, speed:55, ai:"charge", voice:120 },
  { icon:"👻", color:"#dff8ff", hp:38, speed:95, ai:"flee", voice:520 },
  { icon:"🤖", color:"#27dcff", hp:60, speed:68, ai:"orbit", voice:330 },
  { icon:"🦇", color:"#222", hp:32, speed:130, ai:"swarm", voice:700 },
  { icon:"🧊", color:"#9dfbff", hp:85, speed:48, ai:"jump", voice:180 }
];

const saveKey = "crazyMonsterHuntDeluxe";
const keys = {};
let audio, dpr = 1, last = 0, running = false, paused = false, mode = "career", shake = 0, selectedWeapon = "laser";
const touch = { x:0, y:0, active:false, fire:false, skill:false, dash:false };
const viewport = { w: innerWidth, h: innerHeight };
const debugMode = new URLSearchParams(location.search).has("debug");
const lowPowerDevice = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || matchMedia("(max-width: 760px)").matches;
const perf = {
  mode: lowPowerDevice ? "performance" : "full",
  effects: lowPowerDevice ? .55 : 1,
  maxParticles: lowPowerDevice ? 140 : 280,
  weatherCount: lowPowerDevice ? 42 : 90,
  worldShapes: lowPowerDevice ? 9 : 18,
  miniInterval: lowPowerDevice ? .18 : .1,
  hudInterval: .12,
  fps: 60,
  frames: 0,
  fpsClock: 0,
  miniClock: 0,
  hudClock: 0,
  audioClock: Object.create(null),
  particlePool: []
};
const fpsEl = document.createElement("div");
if (debugMode) {
  fpsEl.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:9999;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.62);color:#9ff;font:700 12px monospace;pointer-events:none";
  document.body.appendChild(fpsEl);
}

const save = {
  level:1, coins:0, gems:0, xp:0, stars:0, selectedHero:"zoe", selectedPet:"none",
  unlockedHeroes:["zoe"], unlockedPets:["none"], inventory:{ speed:0, shield:0, double:0, jump:0, invisible:0 },
  achievements:{}, lastDaily:""
};

const game = {
  world:worlds[0], player:{x:0,y:0,r:22,hp:100,maxHp:100,vx:0,vy:0,shield:0,invisible:0,speedBoost:0,doubleCoins:0,combo:0,fireCd:0,skillCd:0},
  monsters:[], bullets:[], pickups:[], particles:[], traps:[], weather:[], friends:[], boss:null,
  mission:"hunt", target:8, done:0, time:0, timeLimit:70, score:0, day:0, finished:false, spawn:0
};

function load() { Object.assign(save, JSON.parse(localStorage.getItem(saveKey) || "{}")); save.inventory = Object.assign({speed:0,shield:0,double:0,jump:0,invisible:0}, save.inventory || {}); }
function persist(){ localStorage.setItem(saveKey, JSON.stringify(save)); }
function show(s){ [ui.loading,ui.menu,ui.heroes,ui.shop,ui.pause,ui.result].forEach(x=>x.classList.remove("active")); if(s) s.classList.add("active"); }
function resize(){
  viewport.w = innerWidth;
  viewport.h = innerHeight;
  dpr = Math.min(perf.mode === "performance" ? 1.35 : 2, devicePixelRatio || 1);
  canvas.width = Math.floor(viewport.w * dpr);
  canvas.height = Math.floor(viewport.h * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  mini.width = Math.floor(132 * dpr);
  mini.height = Math.floor(132 * dpr);
  mctx.setTransform(dpr,0,0,dpr,0,0);
}
function ac(){ if(!audio) audio=new (AudioContext||webkitAudioContext)(); if(audio.state==="suspended") audio.resume(); }
function tone(f,d=.1,type="triangle",g=.045){ if(!audio)return; const o=audio.createOscillator(),v=audio.createGain(); o.type=type;o.frequency.value=f;v.gain.value=g;o.connect(v);v.connect(audio.destination);o.start();v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.stop(audio.currentTime+d); }
function sound(kind,f=440){
  const now = performance.now();
  const minGap = kind === "hit" ? 70 : kind === "coin" ? 90 : 120;
  if (perf.audioClock[kind] && now - perf.audioClock[kind] < minGap) return;
  perf.audioClock[kind] = now;
  ac();
  const packs={hit:[f,f*1.3],coin:[880,1180],boom:[95,70,50],win:[523,659,784,1046],power:[420,650,920],monster:[f,f*.7]};
  (packs[kind]||[f]).forEach((x,i)=>setTimeout(()=>tone(x,.11,kind==="boom"?"sawtooth":"triangle"),i*65));
}
function speak(text){ if(!("speechSynthesis" in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang="en-US"; u.pitch=1.35; u.rate=1.05; speechSynthesis.speak(u); }
function hero(){ return heroes.find(h=>h.id===save.selectedHero)||heroes[0]; }
function pet(){ return pets.find(p=>p.id===save.selectedPet)||pets[0]; }

function renderMenu(){ ui.coins.textContent=save.coins; ui.xp.textContent=save.xp; ui.summary.textContent=`Level ${save.level} · ${save.stars} stars · ${save.gems} gems`; ui.achievements.textContent=Object.keys(save.achievements).length?Object.keys(save.achievements).join(" · "):"No achievements yet"; }
function renderWeapons(){ ui.weaponBar.innerHTML=""; weapons.forEach(w=>{ const b=document.createElement("button"); b.textContent=w.icon; b.title=w.name; b.className=selectedWeapon===w.id?"active":""; b.disabled=save.level<w.unlock; b.onclick=()=>{ if(save.level>=w.unlock){ selectedWeapon=w.id; renderWeapons(); sound("power"); } }; ui.weaponBar.appendChild(b); }); }
function renderHeroes(){ ui.heroGrid.innerHTML=""; heroes.forEach(h=>card(ui.heroGrid,h,save.unlockedHeroes,save.selectedHero,"hero")); ui.petGrid.innerHTML=""; pets.forEach(p=>card(ui.petGrid,p,save.unlockedPets,save.selectedPet,"pet")); }
function card(parent,item,list,selected,type){ const c=document.createElement("article"); c.className="card"; const unlocked=list.includes(item.id); c.innerHTML=`<div class="preview">${item.icon}</div><h3>${item.name}</h3><p>${type==="hero"?"Special: "+item.skill:"Helper companion"}</p><button>${unlocked?(selected===item.id?"Selected":"Select"):`Unlock ${item.price}`}</button>`; c.querySelector("button").onclick=()=>buySelect(type,item); parent.appendChild(c); }
function buySelect(type,item){ const list=type==="hero"?"unlockedHeroes":"unlockedPets", sel=type==="hero"?"selectedHero":"selectedPet"; if(!save[list].includes(item.id)){ if(save.coins<item.price){ sound("boom"); return; } save.coins-=item.price; save[list].push(item.id); sound("power"); } save[sel]=item.id; persist(); renderHeroes(); renderMenu(); }
function renderShop(){ ui.shopGrid.innerHTML=""; shopItems.forEach(it=>{ const c=document.createElement("article"); c.className="card"; c.innerHTML=`<div class="preview">${it.icon}</div><h3>${it.name}</h3><p>${it.desc}</p><strong>Owned: ${save.inventory[it.id]}</strong><button>Buy ${it.price}</button>`; c.querySelector("button").onclick=()=>{ if(save.coins<it.price){sound("boom");return;} save.coins-=it.price; save.inventory[it.id]++; persist(); renderShop(); renderMenu(); sound("power"); }; ui.shopGrid.appendChild(c); }); }
function daily(){ const t=new Date().toISOString().slice(0,10); if(save.lastDaily===t){ speak("Daily reward already claimed"); return; } save.lastDaily=t; save.coins+=160; save.gems+=2; persist(); renderMenu(); sound("win"); speak("Daily treasure unlocked!"); }

function start(m="career"){ ac(); mode=m; const h=hero(); game.world=worlds[(save.level-1)%worlds.length]; game.mission=m==="survival"?"survive":m==="endless"?"endless":["hunt","collect","save","escape","boss"][(save.level-1)%5]; game.target=game.mission==="boss"?1:game.mission==="collect"?16:game.mission==="save"?3:game.mission==="escape"?1:8+save.level*2; game.done=0; game.time=0; game.timeLimit=game.mission==="escape"?45:75; game.score=0; game.day=Math.random()*1; game.finished=false; game.spawn=0; game.monsters.length=0; game.bullets.length=0; game.pickups.length=0; game.traps.length=0; game.friends.length=0; recycleParticles(); game.boss=null; game.player={x:viewport.w/2,y:viewport.h/2,r:22,hp:100,maxHp:100,vx:0,vy:0,shield:save.inventory.shield?100:0,invisible:save.inventory.invisible?9:0,speedBoost:save.inventory.speed?12:0,doubleCoins:save.inventory.double?18:0,combo:0,fireCd:0,skillCd:0,botCd:0,color:h.color}; ["shield","invisible","speed","double"].forEach(k=>{if(save.inventory[k]>0)save.inventory[k]--}); if(save.inventory.jump>0){ save.inventory.jump--; burst(game.player.x,game.player.y,"#55ef9a",35,260); }
  if(game.mission==="save") for(let i=0;i<3;i++) game.friends.push({x:80+Math.random()*(viewport.w-160),y:120+Math.random()*(viewport.h-260),saved:false});
  if(game.mission==="boss") spawnBoss(); game.weather=Array.from({length:perf.weatherCount},()=>({x:Math.random()*viewport.w,y:Math.random()*viewport.h,s:2+Math.random()*5})); renderWeapons(); show(null); running=true; paused=false; speak(`${game.world.name}. ${game.mission} mission!`); }

function spawnMonster(boss=false){ const t=boss?{icon:"👹",color:"#ff3d9a",hp:420+save.level*90,speed:60+save.level*4,ai:"boss",voice:80}:monsterTypes[Math.floor(Math.random()*monsterTypes.length)]; const edge=Math.floor(Math.random()*4); const m={...t,maxHp:t.hp+save.level*8,hp:t.hp+save.level*8,r:boss?58:24+Math.random()*14,x:edge<2?Math.random()*viewport.w:(edge===2?-80:viewport.w+80),y:edge<2?(edge===0?-80:viewport.h+80):Math.random()*viewport.h,ang:0,cd:0,freeze:0,boss}; game.monsters.push(m); return m; }
function spawnBoss(){ game.boss=spawnMonster(true); }
function spawnPickup(){ const types=["coin","coin","gem","power","chest"]; if(game.pickups.length > (perf.mode === "performance" ? 28 : 46)) return; game.pickups.push({type:types[Math.floor(Math.random()*types.length)],x:60+Math.random()*(viewport.w-120),y:90+Math.random()*(viewport.h-180),spin:0}); }

function update(dt){ if(!running||paused||game.finished)return; game.time+=dt; game.player.fireCd=Math.max(0,game.player.fireCd-dt); game.player.skillCd=Math.max(0,game.player.skillCd-dt); ["shield","invisible","speedBoost","doubleCoins"].forEach(k=>game.player[k]=Math.max(0,game.player[k]-dt*(k==="shield"?2:1))); game.day=(game.day+dt*.015)%1; movePlayer(dt); game.spawn-=dt; if(game.spawn<=0&&game.mission!=="escape"){ game.spawn=Math.max(.35,1.2-save.level*.045); if(game.monsters.length<10+save.level) spawnMonster(); } if(Math.random()<dt*.9) spawnPickup(); if(touch.fire||keys[" "]||keys.f) fire(); if(touch.skill||keys.e) skill(); updateBullets(dt); updateMonsters(dt); updatePickups(dt); updateParticles(dt); updateWeather(dt); checkMission(); updateHud(); }
function movePlayer(dt){ const h=hero(); let ax=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0)+touch.x; let ay=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0)+touch.y; const len=Math.hypot(ax,ay)||1; ax/=len; ay/=len; const sp=(210*h.speed)*(game.player.speedBoost>0?1.45:1); if(touch.dash||keys.Shift){ game.player.x+=ax*sp*dt*2.3; game.player.y+=ay*sp*dt*2.3; burst(game.player.x,game.player.y,"#dff8ff",4,80); } game.player.vx+=(ax*sp-game.player.vx)*dt*8; game.player.vy+=(ay*sp-game.player.vy)*dt*8; game.player.x=Math.max(28,Math.min(innerWidth-28,game.player.x+game.player.vx*dt)); game.player.y=Math.max(76,Math.min(innerHeight-92,game.player.y+game.player.vy*dt)); if(Math.hypot(game.player.vx,game.player.vy)>80&&Math.random()<dt*8) particle(game.player.x,game.player.y+20,"rgba(255,255,255,.55)",40); }
function fire(){ const w=weapons.find(x=>x.id===selectedWeapon)||weapons[0]; if(game.player.fireCd>0||save.level<w.unlock)return; game.player.fireCd=w.cooldown; const target=nearestMonster(); const a=target?Math.atan2(target.y-game.player.y,target.x-game.player.x):Math.atan2(touch.y||-1,touch.x||0); if(w.id==="trap"){ game.traps.push({x:game.player.x+Math.cos(a)*36,y:game.player.y+Math.sin(a)*36,r:38,life:7,damage:w.damage}); sound("power"); return; } game.bullets.push({x:game.player.x,y:game.player.y,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,r:7,color:w.color,damage:w.damage,kind:w.id,life:1.3}); sound("hit",w.id==="shock"?700:w.id==="fire"?180:430); }
function skill(){ const h=hero(); if(game.player.skillCd>0)return; game.player.skillCd=5; if(h.skill==="shock"){ game.monsters.forEach(m=>damage(m,38,"shock")); burst(game.player.x,game.player.y,"#ffe45e",45,280); } if(h.skill==="fire"){ game.monsters.forEach(m=>{ if(dist(m,game.player)<180)damage(m,70,"fire"); }); burst(game.player.x,game.player.y,"#ff7048",45,240); } if(h.skill==="invisible") game.player.invisible=8; if(h.skill==="dash"){ game.player.speedBoost=7; burst(game.player.x,game.player.y,"#55ef9a",35,220); } sound("power"); }
function nearestMonster(){ let best=null,d=1e9; game.monsters.forEach(m=>{ const dm=dist(m,game.player); if(dm<d){d=dm; best=m;} }); return best; }
function updateBullets(dt){ game.bullets.forEach(b=>{ b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; particle(b.x,b.y,b.color,25); }); game.traps.forEach(t=>t.life-=dt); for(let i=game.bullets.length-1;i>=0;i--){ const b=game.bullets[i]; let hit=false; game.monsters.forEach(m=>{ if(!hit&&Math.hypot(m.x-b.x,m.y-b.y)<m.r+b.r){ damage(m,b.damage,b.kind); hit=true; }}); if(hit||b.life<=0||b.x<0||b.x>innerWidth||b.y<0||b.y>innerHeight) game.bullets.splice(i,1); } for(let i=game.traps.length-1;i>=0;i--){ const t=game.traps[i]; game.monsters.forEach(m=>{ if(Math.hypot(m.x-t.x,m.y-t.y)<m.r+t.r){ damage(m,t.damage,"trap"); m.freeze=.8; t.life=0; }}); if(t.life<=0) game.traps.splice(i,1); } }
function damage(m,amount,kind){ m.hp-=amount; if(kind==="freeze")m.freeze=2.4; if(kind==="fire")m.burn=2; if(kind==="shock")m.freeze=.55; burst(m.x,m.y,kind==="fire"?"#ff7048":kind==="freeze"?"#a7fbff":kind==="shock"?"#ffe45e":"#ff3d9a",8,90); if(m.hp<=0) killMonster(m); }
function killMonster(m){ const idx=game.monsters.indexOf(m); if(idx>=0)game.monsters.splice(idx,1); game.done+=game.mission==="hunt"||game.mission==="boss"?1:0; game.score+=m.boss?900:90+game.player.combo*5; game.player.combo++; save.xp+=m.boss?90:16; save.coins+=m.boss?80:8*(game.player.doubleCoins>0?2:1); if(Math.random()<.18) game.pickups.push({type:"gem",x:m.x,y:m.y,spin:0}); burst(m.x,m.y,m.color,32,m.boss?260:170); sound(m.boss?"win":"monster",m.voice); if(game.player.combo>=10) save.achievements.Combo="Combo Hunter"; }
function updateMonsters(dt){ game.monsters.forEach(m=>{ m.ang+=dt; m.freeze=Math.max(0,(m.freeze||0)-dt); if(m.burn>0){ m.burn-=dt; m.hp-=dt*10; particle(m.x,m.y,"#ff7048",80); } if(m.freeze>0)return; const d=dist(m,game.player); let tx=game.player.x,ty=game.player.y; if(game.player.invisible>0){ tx=m.x+(Math.random()-.5)*220; ty=m.y+(Math.random()-.5)*220; } if(m.ai==="flee"&&d<220){ tx=m.x-(game.player.x-m.x); ty=m.y-(game.player.y-m.y); } if(m.ai==="orbit"){ tx=game.player.x+Math.cos(game.time*2+m.ang)*150; ty=game.player.y+Math.sin(game.time*2+m.ang)*150; } if(m.ai==="jump"&&Math.random()<dt*.8){ tx=game.player.x+(Math.random()-.5)*160; ty=game.player.y+(Math.random()-.5)*160; } const a=Math.atan2(ty-m.y,tx-m.x); const sp=(m.speed+save.level*5)*(m.ai==="charge"&&d<220?1.7:1); m.x+=Math.cos(a)*sp*dt; m.y+=Math.sin(a)*sp*dt; if(d<m.r+game.player.r+3) hurt(m.boss?24:12); }); }
function hurt(amount){ if(game.player.invisible>0)return; if(game.player.shield>0){ game.player.shield=Math.max(0,game.player.shield-amount*2); return; } game.player.hp-=amount; game.player.combo=0; shake=.25; shell.classList.add("shake"); setTimeout(()=>shell.classList.remove("shake"),280); sound("boom"); if(game.player.hp<=0) finish(false); }
function updatePickups(dt){ game.pickups.forEach(p=>{ p.spin+=dt*4; if(pet().id==="bunny"){ p.x+=(game.player.x-p.x)*dt*1.5; p.y+=(game.player.y-p.y)*dt*1.5; }}); for(let i=game.pickups.length-1;i>=0;i--){ const p=game.pickups[i]; if(Math.hypot(p.x-game.player.x,p.y-game.player.y)<34){ if(p.type==="coin")save.coins+=game.player.doubleCoins>0?2:1; if(p.type==="gem"){save.gems++; game.done+=game.mission==="collect"?1:0;} if(p.type==="power")game.player.shield=100; if(p.type==="chest"){save.coins+=50; save.gems+=2; game.score+=250;} burst(p.x,p.y,p.type==="gem"?"#27dcff":"#ffd45a",18,130); sound("coin"); game.pickups.splice(i,1); }} game.friends.forEach(f=>{ if(!f.saved&&Math.hypot(f.x-game.player.x,f.y-game.player.y)<45){ f.saved=true; game.done++; save.coins+=25; sound("power"); }}); }
function checkMission(){ if(game.time>game.timeLimit&&game.mission!=="endless"&&game.mission!=="survive") finish(game.mission==="escape"); if(game.mission==="survive"&&game.time>60) finish(true); if(game.mission==="endless"&&game.player.hp<=0) finish(false); if(game.done>=game.target&&game.mission!=="endless"&&game.mission!=="survive") finish(true); }
function finish(win){ if(game.finished)return; game.finished=true; running=false; const stars=win?(game.player.hp>70?3:game.player.hp>35?2:1):0; save.stars+=stars; if(win&&mode==="career")save.level++; if(win){ save.coins+=stars*45; save.achievements.FirstWin="First Win"; } persist(); ui.resultIcon.textContent=win?"🏆":"💥"; ui.resultTitle.textContent=win?"Mission Complete!":"Mission Failed"; ui.resultText.textContent=win?`Score ${Math.round(game.score)} · XP and coins saved.`:"Upgrade your hero and try again."; ui.stars.innerHTML=""; for(let i=0;i<3;i++){ const s=document.createElement("span"); s.textContent=i<stars?"⭐":"☆"; ui.stars.appendChild(s); } renderMenu(); sound(win?"win":"boom"); show(ui.result); }
function updateParticles(dt){
  for(let i=game.particles.length-1;i>=0;i--){
    const p=game.particles[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
    if(p.life<=0){
      const dead = game.particles[i];
      game.particles[i] = game.particles[game.particles.length - 1];
      game.particles.pop();
      if(perf.particlePool.length < perf.maxParticles) perf.particlePool.push(dead);
    }
  }
}
function updateWeather(dt){ for(let i=0;i<game.weather.length;i++){ const w=game.weather[i]; w.y+=(game.world.weather==="rain"?520:game.world.weather==="snow"?90:140)*dt; w.x+=(game.world.weather==="storm"?80:10)*dt; if(w.y>viewport.h+20){w.y=-20;w.x=Math.random()*viewport.w;} if(w.x>viewport.w+20)w.x=-20; } if(game.world.weather==="storm"&&Math.random()<dt*.45*perf.effects) burst(Math.random()*viewport.w,Math.random()*viewport.h*.45,"#dff8ff",16,260); }
const hudCache = { hp:"", xp:"", coins:"", time:"", mission:"" };
function updateHud(){
  perf.hudClock += 1 / 60;
  if(perf.hudClock < perf.hudInterval) return;
  perf.hudClock = 0;
  const hp = String(Math.max(0,Math.round(game.player.hp)));
  const xp = String(save.xp);
  const coins = String(save.coins);
  const time = String(Math.max(0,Math.round(game.timeLimit-game.time)));
  const mission = `${game.mission} ${game.done}/${game.target}`;
  if(hudCache.hp!==hp){hudCache.hp=hp;ui.hp.textContent=hp;}
  if(hudCache.xp!==xp){hudCache.xp=xp;ui.xp.textContent=xp;}
  if(hudCache.coins!==coins){hudCache.coins=coins;ui.coins.textContent=coins;}
  if(hudCache.time!==time){hudCache.time=time;ui.time.textContent=time;}
  if(hudCache.mission!==mission){hudCache.mission=mission;ui.mission.textContent=mission;}
}
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function recycleParticles(){ while(game.particles.length){ const p=game.particles.pop(); if(perf.particlePool.length < perf.maxParticles) perf.particlePool.push(p); } }
function addParticle(x,y,vx,vy,life,size,color){
  if(game.particles.length >= perf.maxParticles) return;
  const p = perf.particlePool.pop() || {};
  p.x=x; p.y=y; p.vx=vx; p.vy=vy; p.life=life; p.size=size; p.color=color;
  game.particles.push(p);
}
function particle(x,y,color,spread=100){
  if(Math.random() > perf.effects) return;
  addParticle(x,y,(Math.random()-.5)*spread,(Math.random()-.5)*spread,.35+Math.random()*.35,2+Math.random()*6,color);
}
function burst(x,y,color,count,spread){
  const total = Math.max(1, Math.floor(count * perf.effects));
  for(let i=0;i<total;i++){ const a=Math.random()*Math.PI*2,s=Math.random()*spread; addParticle(x,y,Math.cos(a)*s,Math.sin(a)*s,.45+Math.random()*.55,3+Math.random()*8,color); }
}

function draw(){ const w=innerWidth,h=innerHeight; const sx=shake>0?(Math.random()-.5)*18:0,sy=shake>0?(Math.random()-.5)*12:0; shake=Math.max(0,shake-1/60); ctx.clearRect(0,0,w,h); ctx.save(); ctx.translate(sx,sy); drawWorld(w,h); drawPickups(); drawFriends(); drawTraps(); drawBullets(); drawMonsters(); drawPlayer(); drawParticles(); drawWeather(w,h); ctx.restore(); drawMini(); }
function drawWorld(w,h){ const g=ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,game.world.bg[0]); g.addColorStop(1,game.world.bg[1]); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); ctx.globalAlpha=.18; ctx.fillStyle=game.world.glow; for(let i=0;i<18;i++){ const x=(i*137+Math.sin(game.time+i)*30)%w,y=(i*91+game.time*18)%h; round(x,y,70+(i%4)*25,18); } ctx.globalAlpha=1; ctx.fillStyle=game.world.floor; for(let y=70;y<h;y+=80){ ctx.fillRect(0,y,w,2); } const night=.35+Math.sin(game.day*Math.PI*2)*.2; ctx.fillStyle=`rgba(0,0,20,${night})`; ctx.fillRect(0,0,w,h); }
function drawPlayer(){ const p=game.player; ctx.save(); ctx.translate(p.x,p.y); ctx.shadowColor=p.color; ctx.shadowBlur=24; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(-7,-5,6,0,Math.PI*2); ctx.arc(8,-5,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#071022"; ctx.beginPath(); ctx.arc(-7,-4,2.5,0,Math.PI*2); ctx.arc(8,-4,2.5,0,Math.PI*2); ctx.fill(); if(p.shield>0){ctx.strokeStyle="#a7fbff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,p.r+12,0,Math.PI*2);ctx.stroke();} ctx.restore(); if(pet().id!=="none"){ const a=game.time*2; drawEmoji(p.x-Math.cos(a)*46,p.y+Math.sin(a)*30,pet().icon,24); if(pet().id==="bot"&&Math.random()<.08) fire(); } }
function drawMonsters(){ game.monsters.forEach(m=>{ ctx.save(); ctx.translate(m.x,m.y); ctx.rotate(Math.sin(game.time*4+m.ang)*.12); ctx.shadowColor=m.color; ctx.shadowBlur=m.boss?35:18; ctx.fillStyle=m.color; round(-m.r,-m.r,m.r*2,m.r*2,m.r*.35); ctx.shadowBlur=0; ctx.font=`${m.r*1.25}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(m.icon,0,1); ctx.fillStyle="#111"; ctx.fillRect(-m.r,-m.r-12,m.r*2,5); ctx.fillStyle="#55ef9a"; ctx.fillRect(-m.r,-m.r-12,m.r*2*Math.max(0,m.hp/m.maxHp),5); ctx.restore(); }); }
function drawBullets(){ game.bullets.forEach(b=>{ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=15;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}); }
function drawTraps(){ game.traps.forEach(t=>{ctx.strokeStyle="#ffd45a";ctx.lineWidth=4;ctx.shadowColor="#ffd45a";ctx.shadowBlur=18;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}); }
function drawPickups(){ game.pickups.forEach(p=>drawEmoji(p.x,p.y,{coin:"🪙",gem:"💎",power:"⚡",chest:"🎁"}[p.type],28+Math.sin(p.spin)*3)); }
function drawFriends(){ game.friends.forEach(f=>{ if(!f.saved)drawEmoji(f.x,f.y,"🧸",32); }); }
function drawParticles(){ game.particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life*1.7); ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.shadowBlur=0; }); }
function drawWeather(w,h){ if(game.world.weather==="fog"){ctx.fillStyle="rgba(230,250,255,.14)";for(let i=0;i<8;i++)round((i*180+game.time*20)%(w+220)-120,110+i*75,230,35,18);} ctx.strokeStyle=game.world.weather==="rain"?"rgba(190,240,255,.5)":"rgba(255,255,255,.25)"; game.weather.forEach(d=>{ if(game.world.weather==="night")return; ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-8,d.y+d.s*(game.world.weather==="rain"?7:2)); ctx.stroke(); }); }
function drawMini(){ mctx.clearRect(0,0,132,132); mctx.fillStyle="rgba(5,8,20,.78)"; mctx.fillRect(0,0,132,132); mctx.fillStyle=game.world.glow; mctx.beginPath(); mctx.arc(game.player.x/innerWidth*132,game.player.y/innerHeight*132,4,0,Math.PI*2); mctx.fill(); mctx.fillStyle="#ff4e69"; game.monsters.forEach(m=>mctx.fillRect(m.x/innerWidth*132-2,m.y/innerHeight*132-2,4,4)); mctx.fillStyle="#ffd45a"; game.pickups.forEach(p=>mctx.fillRect(p.x/innerWidth*132-1,p.y/innerHeight*132-1,3,3)); }
function drawEmoji(x,y,e,size){ ctx.font=`${size}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(e,x,y); }
function round(x,y,w,h,r=16){ ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h)); ctx.fill(); }
function loop(t){ const dt=Math.min(.033,(t-last)/1000||.016); last=t; update(dt); draw(); requestAnimationFrame(loop); }

document.addEventListener("keydown",e=>{keys[e.key]=true;if(e.key==="Escape"&&running){paused=true;show(ui.pause);}});
document.addEventListener("keyup",e=>keys[e.key]=false);
function bindBtn(id,prop){ const b=document.querySelector(id),on=e=>{e.preventDefault();touch[prop]=true;ac();},off=()=>touch[prop]=false; b.onpointerdown=on;b.onpointerup=off;b.onpointercancel=off;b.onpointerleave=off; }
bindBtn("#fireBtn","fire"); bindBtn("#skillBtn","skill"); bindBtn("#dashBtn","dash");
ui.stick.onpointerdown=e=>{touch.active=true;ui.stick.setPointerCapture(e.pointerId);stick(e);ac();}; ui.stick.onpointermove=e=>{if(touch.active)stick(e);}; ui.stick.onpointerup=e=>{touch.active=false;touch.x=0;touch.y=0;ui.knob.style.transform="translate(-50%,-50%)";};
function stick(e){ const r=ui.stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,d=Math.min(48,Math.hypot(dx,dy)),a=Math.atan2(dy,dx); touch.x=Math.cos(a)*d/48; touch.y=Math.sin(a)*d/48; ui.knob.style.transform=`translate(calc(-50% + ${Math.cos(a)*d}px), calc(-50% + ${Math.sin(a)*d}px))`; }
document.querySelector("#careerBtn").onclick=()=>start("career"); document.querySelector("#survivalBtn").onclick=()=>start("survival"); document.querySelector("#endlessBtn").onclick=()=>start("endless");
document.querySelector("#heroesBtn").onclick=()=>{renderHeroes();show(ui.heroes);}; document.querySelector("#shopBtn").onclick=()=>{renderShop();show(ui.shop);}; document.querySelector("#dailyBtn").onclick=daily;
document.querySelector("#resumeBtn").onclick=()=>{paused=false;show(null);}; document.querySelector("#quitBtn").onclick=()=>{running=false;show(ui.menu);}; document.querySelector("#nextBtn").onclick=()=>start("career"); document.querySelector("#menuBtn").onclick=()=>show(ui.menu);
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{renderMenu();show(ui.menu);});
window.addEventListener("resize",resize);
load(); resize(); renderMenu(); setTimeout(()=>show(ui.menu),850); requestAnimationFrame(loop);
