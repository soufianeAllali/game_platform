const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const shell = document.querySelector("#shell");

const ui = {
  speed: document.querySelector("#speedText"),
  lap: document.querySelector("#lapText"),
  coins: document.querySelector("#coinsText"),
  time: document.querySelector("#timeText"),
  nitro: document.querySelector("#nitroBar"),
  shield: document.querySelector("#shieldBar"),
  feed: document.querySelector("#raceFeed"),
  loading: document.querySelector("#loadingScreen"),
  menu: document.querySelector("#menuScreen"),
  garage: document.querySelector("#garageScreen"),
  shop: document.querySelector("#shopScreen"),
  pause: document.querySelector("#pauseScreen"),
  result: document.querySelector("#resultScreen"),
  carGrid: document.querySelector("#carGrid"),
  skinRow: document.querySelector("#skinRow"),
  wheelRow: document.querySelector("#wheelRow"),
  shopGrid: document.querySelector("#shopGrid"),
  leaderboard: document.querySelector("#leaderboardList"),
  stars: document.querySelector("#stars"),
  resultIcon: document.querySelector("#resultIcon"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText")
};

const routes = [
  { id: "night", name: "Night City", sky: ["#08112b", "#142e68"], road: "#121829", neon: "#28d7ff", weather: "rain" },
  { id: "desert", name: "Sun Desert", sky: ["#ffaf58", "#843c72"], road: "#3d2b29", neon: "#ffd34f", weather: "storm" },
  { id: "snow", name: "Snow Peaks", sky: ["#dff9ff", "#6b9ce8"], road: "#2d405f", neon: "#9ef7ff", weather: "fog" },
  { id: "cyber", name: "Cyber Neon", sky: ["#150c33", "#581a6a"], road: "#101020", neon: "#ff3d9a", weather: "night" },
  { id: "forest", name: "Glow Forest", sky: ["#103326", "#4b8a4f"], road: "#1d2c25", neon: "#54ef9a", weather: "day" }
];

const cars = [
  { id: "spark", name: "Spark Buggy", price: 0, accel: 1, handling: 1.05, nitro: 1, color: "#ff3d61" },
  { id: "comet", name: "Comet GT", price: 350, accel: 1.18, handling: .98, nitro: 1.1, color: "#28d7ff" },
  { id: "panda", name: "Panda Cruiser", price: 700, accel: .96, handling: 1.22, nitro: 1.05, color: "#ffffff" },
  { id: "dragon", name: "Dragon Turbo", price: 1200, accel: 1.28, handling: .92, nitro: 1.3, color: "#54ef9a" }
];

const skins = [
  { id: "classic", name: "Classic", mul: 1 },
  { id: "neon", name: "Neon", mul: 1.08, price: 180 },
  { id: "gold", name: "Gold", mul: 1.14, price: 420 },
  { id: "candy", name: "Candy", mul: 1.06, price: 300 }
];

const wheels = [
  { id: "street", name: "Street", grip: 1, price: 0 },
  { id: "drift", name: "Drift", grip: 1.13, price: 230 },
  { id: "snow", name: "Snow", grip: 1.18, price: 420 }
];

const shopItems = [
  { id: "shield", name: "Shield Pack", icon: "🛡️", price: 80, desc: "Protects from one crash." },
  { id: "turbo", name: "Turbo Tank", icon: "🔥", price: 70, desc: "Starts race with extra nitro." },
  { id: "magnet", name: "Coin Magnet", icon: "🧲", price: 90, desc: "Pulls coins closer." },
  { id: "slowmo", name: "Slow Motion", icon: "⏱", price: 100, desc: "Slows traffic for a while." }
];

const saveKey = "turboRacingNitroSave";
let audio;
let last = 0;
let running = false;
let paused = false;
let mode = "career";
let roadSeed = 0;
let shake = 0;
let camera = 0;
let dpr = 1;

const state = {
  level: 1,
  coins: 0,
  stars: 0,
  unlockedCars: ["spark"],
  unlockedSkins: ["classic"],
  unlockedWheels: ["street"],
  selectedCar: "spark",
  selectedSkin: "classic",
  selectedWheel: "street",
  inventory: { shield: 0, turbo: 0, magnet: 0, slowmo: 0 },
  achievements: {},
  lastDaily: "",
  leaderboard: []
};

const race = {
  route: routes[0],
  player: { x: 0, y: 0, w: 44, h: 80, vx: 0, speed: 0, nitro: 70, shield: 0, magnet: 0, slowmo: 0, drift: 0 },
  bots: [],
  obstacles: [],
  coins: [],
  powerups: [],
  particles: [],
  roadMarks: [],
  weather: [],
  lap: 1,
  laps: 3,
  distance: 0,
  lapDistance: 2400,
  time: 0,
  score: 0,
  boss: false,
  police: false,
  finished: false,
  spawnTimer: 0,
  coinTimer: 0,
  powerTimer: 0
};

const keys = {};
const touch = { left: false, right: false, brake: false, nitro: false, dragging: false, startX: 0 };

function loadSave() {
  const saved = JSON.parse(localStorage.getItem(saveKey) || "{}");
  Object.assign(state, saved);
  state.inventory = Object.assign({ shield: 0, turbo: 0, magnet: 0, slowmo: 0 }, state.inventory || {});
  state.unlockedCars ||= ["spark"];
  state.unlockedSkins ||= ["classic"];
  state.unlockedWheels ||= ["street"];
  state.leaderboard ||= [];
}

function save() {
  localStorage.setItem(saveKey, JSON.stringify(state));
}

function show(screen) {
  [ui.loading, ui.menu, ui.garage, ui.shop, ui.pause, ui.result].forEach((el) => el.classList.remove("active"));
  if (screen) screen.classList.add("active");
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function ensureAudio() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
}

function beep(freq, duration = .1, type = "triangle", gain = .045) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = gain;
  osc.connect(vol);
  vol.connect(audio.destination);
  osc.start();
  vol.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  osc.stop(audio.currentTime + duration);
}

function sound(name) {
  ensureAudio();
  const patterns = {
    coin: [880, 1170],
    boost: [220, 330, 660],
    crash: [90, 70, 50],
    win: [523, 659, 784, 1046],
    buy: [500, 740, 980],
    power: [420, 620, 920]
  };
  (patterns[name] || [440]).forEach((freq, i) => setTimeout(() => beep(freq, .12, name === "crash" ? "sawtooth" : "triangle"), i * 65));
}

function currentCar() { return cars.find((car) => car.id === state.selectedCar) || cars[0]; }
function currentSkin() { return skins.find((skin) => skin.id === state.selectedSkin) || skins[0]; }
function currentWheel() { return wheels.find((wheel) => wheel.id === state.selectedWheel) || wheels[0]; }

function renderMenu() {
  ui.coins.textContent = state.coins;
  ui.leaderboard.innerHTML = "";
  const rows = state.leaderboard.slice(0, 5);
  if (!rows.length) rows.push({ name: "No races yet", score: 0 });
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.textContent = `${row.name}: ${row.score}`;
    ui.leaderboard.appendChild(li);
  });
}

function renderGarage() {
  ui.carGrid.innerHTML = "";
  cars.forEach((car) => {
    const unlocked = state.unlockedCars.includes(car.id);
    const card = document.createElement("article");
    card.className = "car-card";
    card.innerHTML = `
      <div class="car-preview" style="color:${car.color}">🏎️</div>
      <h3>${car.name}</h3>
      <p>Accel ${Math.round(car.accel * 100)} · Handling ${Math.round(car.handling * 100)} · Nitro ${Math.round(car.nitro * 100)}</p>
      <button>${unlocked ? (state.selectedCar === car.id ? "Selected" : "Select") : `Unlock ${car.price} coins`}</button>
    `;
    card.querySelector("button").onclick = () => buyOrSelect("car", car);
    ui.carGrid.appendChild(card);
  });

  ui.skinRow.innerHTML = "<strong>Skins</strong>";
  skins.forEach((skin) => optionButton(ui.skinRow, skin, "skin", state.unlockedSkins, state.selectedSkin));
  ui.wheelRow.innerHTML = "<strong>Wheels</strong>";
  wheels.forEach((wheel) => optionButton(ui.wheelRow, wheel, "wheel", state.unlockedWheels, state.selectedWheel));
}

function optionButton(parent, item, type, unlockedList, selected) {
  const btn = document.createElement("button");
  const unlocked = unlockedList.includes(item.id);
  btn.textContent = unlocked ? (selected === item.id ? `${item.name} ✓` : item.name) : `${item.name} ${item.price}`;
  btn.onclick = () => buyOrSelect(type, item);
  parent.appendChild(btn);
}

function buyOrSelect(type, item) {
  const maps = {
    car: ["unlockedCars", "selectedCar"],
    skin: ["unlockedSkins", "selectedSkin"],
    wheel: ["unlockedWheels", "selectedWheel"]
  };
  const [listKey, selectedKey] = maps[type];
  if (!state[listKey].includes(item.id)) {
    if (state.coins < item.price) {
      feed("Need more coins!");
      sound("crash");
      return;
    }
    state.coins -= item.price;
    state[listKey].push(item.id);
    sound("buy");
  }
  state[selectedKey] = item.id;
  save();
  renderGarage();
  renderMenu();
}

function renderShop() {
  ui.shopGrid.innerHTML = "";
  shopItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "shop-card";
    card.innerHTML = `<h3>${item.icon} ${item.name}</h3><p>${item.desc}</p><strong>Owned: ${state.inventory[item.id]}</strong><button>Buy ${item.price} coins</button>`;
    card.querySelector("button").onclick = () => {
      if (state.coins < item.price) {
        feed("Collect more coins first.");
        sound("crash");
        return;
      }
      state.coins -= item.price;
      state.inventory[item.id] += 1;
      sound("buy");
      save();
      renderShop();
      renderMenu();
    };
    ui.shopGrid.appendChild(card);
  });
}

function dailyReward() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastDaily === today) {
    feed("Daily reward already claimed.");
    return;
  }
  state.lastDaily = today;
  state.coins += 150;
  save();
  renderMenu();
  sound("buy");
  feed("Daily reward: 150 coins!");
}

function startRace(nextMode = "career") {
  ensureAudio();
  mode = nextMode;
  const car = currentCar();
  const skin = currentSkin();
  race.route = routes[(state.level - 1) % routes.length];
  race.boss = state.level % 5 === 0 && mode === "career";
  race.police = mode === "police";
  race.laps = mode === "endless" ? 99 : race.boss ? 4 : 3;
  race.lap = 1;
  race.distance = 0;
  race.time = 0;
  race.score = 0;
  race.finished = false;
  race.spawnTimer = 0;
  race.coinTimer = 0;
  race.powerTimer = 0;
  race.player.x = innerWidth / 2;
  race.player.y = innerHeight - Math.min(150, innerHeight * .18);
  race.player.vx = 0;
  race.player.speed = 130 + state.level * 8;
  race.player.nitro = Math.min(100, 55 + (state.inventory.turbo > 0 ? 35 : 0));
  race.player.shield = state.inventory.shield > 0 ? 100 : 0;
  race.player.magnet = state.inventory.magnet > 0 ? 10 : 0;
  race.player.slowmo = state.inventory.slowmo > 0 ? 8 : 0;
  race.player.color = skin.id === "classic" ? car.color : skinColor(skin.id);
  race.bots = [];
  race.obstacles = [];
  race.coins = [];
  race.powerups = [];
  race.particles = [];
  race.roadMarks = Array.from({ length: 18 }, (_, i) => ({ y: i * 120, wobble: Math.random() * 50 }));
  race.weather = Array.from({ length: 90 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, s: 2 + Math.random() * 6 }));
  if (state.inventory.turbo > 0) state.inventory.turbo -= 1;
  if (state.inventory.shield > 0) state.inventory.shield -= 1;
  if (state.inventory.magnet > 0) state.inventory.magnet -= 1;
  if (state.inventory.slowmo > 0) state.inventory.slowmo -= 1;
  createBots();
  show(null);
  running = true;
  paused = false;
  feed(race.boss ? "Boss race! Beat the champion." : race.police ? "Police chase mode!" : `${race.route.name} race started.`);
}

function skinColor(id) {
  return { neon: "#28d7ff", gold: "#ffd34f", candy: "#ff8bd7" }[id] || currentCar().color;
}

function createBots() {
  const count = race.boss ? 5 : race.police ? 6 : 3 + Math.min(4, Math.floor(state.level / 2));
  for (let i = 0; i < count; i++) {
    race.bots.push({
      x: innerWidth / 2 + (Math.random() - .5) * roadWidth() * .55,
      y: -120 - i * 180,
      lane: Math.random(),
      speed: 110 + state.level * 10 + Math.random() * 80,
      color: race.police && i < 2 ? "#ffffff" : ["#ffcf4f", "#28d7ff", "#ff3d9a", "#54ef9a"][i % 4],
      police: race.police && i < 2,
      boss: race.boss && i === 0
    });
  }
}

function roadWidth() {
  return Math.min(620, Math.max(310, innerWidth * .62));
}

function roadCenter(y = 0) {
  const curve = Math.sin((race.distance + y) * .0013) * Math.min(90, innerWidth * .08);
  return innerWidth / 2 + curve;
}

function update(dt) {
  if (!running || paused || race.finished) return;
  const car = currentCar();
  const wheel = currentWheel();
  const left = keys.ArrowLeft || keys.a || touch.left;
  const right = keys.ArrowRight || keys.d || touch.right;
  const braking = keys.ArrowDown || touch.brake;
  const boosting = (keys.ArrowUp || keys[" "] || touch.nitro) && race.player.nitro > 0;
  const slow = race.player.slowmo > 0 ? .58 : 1;
  const maxSpeed = (race.police ? 330 : 285) + state.level * 8;
  const target = boosting ? maxSpeed * 1.28 : braking ? 120 : maxSpeed;
  race.player.speed += (target - race.player.speed) * dt * car.accel * .9;
  if (boosting) {
    race.player.nitro = Math.max(0, race.player.nitro - dt * 28);
    spawnTrail(race.player.x, race.player.y + 44, "#ff8a35", 4);
    soundThrottle("boost");
  } else {
    race.player.nitro = Math.min(100, race.player.nitro + dt * 8);
  }
  const steer = (right ? 1 : 0) - (left ? 1 : 0);
  race.player.vx += steer * dt * 900 * car.handling * wheel.grip;
  race.player.vx *= Math.pow(.08, dt);
  race.player.x += race.player.vx * dt;
  race.player.drift = Math.min(1, Math.abs(race.player.vx) / 420);
  if (race.player.drift > .45) spawnTrail(race.player.x - Math.sign(race.player.vx) * 16, race.player.y + 42, "#c9d3df", 2);

  const half = roadWidth() / 2 - 34;
  const center = roadCenter(race.player.y);
  if (race.player.x < center - half || race.player.x > center + half) {
    race.player.speed *= .985;
    race.player.vx *= .94;
    spawnTrail(race.player.x, race.player.y + 40, "#a87a46", 2);
  }
  race.player.x = Math.max(center - half - 34, Math.min(center + half + 34, race.player.x));

  race.distance += race.player.speed * dt;
  race.time += dt;
  roadSeed += race.player.speed * dt;
  camera += (race.player.vx * .018 - camera) * dt * 3;
  if (shake > 0) shake -= dt;
  if (race.player.shield > 0) race.player.shield = Math.max(0, race.player.shield - dt * 4);
  if (race.player.magnet > 0) race.player.magnet = Math.max(0, race.player.magnet - dt);
  if (race.player.slowmo > 0) race.player.slowmo = Math.max(0, race.player.slowmo - dt);

  spawnWorld(dt);
  updateBots(dt, slow);
  updatePickups(dt);
  updateParticles(dt);
  updateWeather(dt);
  updateLaps();
  updateHud();
}

let boostSoundClock = 0;
function soundThrottle(name) {
  boostSoundClock -= 1 / 60;
  if (name === "boost" && boostSoundClock <= 0) {
    boostSoundClock = .18;
    beep(120 + Math.random() * 60, .08, "sawtooth", .018);
  }
}

function spawnWorld(dt) {
  race.spawnTimer -= dt;
  race.coinTimer -= dt;
  race.powerTimer -= dt;
  if (race.spawnTimer <= 0) {
    race.spawnTimer = Math.max(.45, 1.25 - state.level * .035);
    const center = roadCenter(-200);
    race.obstacles.push({
      x: center + (Math.random() - .5) * roadWidth() * .75,
      y: -120,
      w: 42 + Math.random() * 22,
      h: 54 + Math.random() * 34,
      type: Math.random() < .22 ? "jump" : "barrier"
    });
  }
  if (race.coinTimer <= 0) {
    race.coinTimer = .55;
    const center = roadCenter(-120);
    for (let i = 0; i < 4; i++) {
      race.coins.push({ x: center + (i - 1.5) * 42 + (Math.random() - .5) * 20, y: -80 - i * 35, spin: Math.random() * 6 });
    }
  }
  if (race.powerTimer <= 0) {
    race.powerTimer = 7 + Math.random() * 6;
    const ids = ["shield", "turbo", "magnet", "slowmo"];
    race.powerups.push({ x: roadCenter(-160) + (Math.random() - .5) * roadWidth() * .6, y: -100, id: ids[Math.floor(Math.random() * ids.length)] });
  }
}

function updateBots(dt, slow) {
  race.bots.forEach((bot) => {
    const ai = 1 + state.level * .025 + (bot.boss ? .45 : 0);
    bot.y += (race.player.speed - bot.speed * ai) * dt * slow;
    const target = roadCenter(bot.y) + Math.sin(race.time * (1.2 + bot.lane) + bot.lane * 7) * roadWidth() * .34;
    bot.x += (target - bot.x) * dt * (bot.police ? 1.8 : 1.1);
    if (bot.y > innerHeight + 160) {
      bot.y = -260 - Math.random() * 500;
      bot.speed += 8;
    }
    if (bot.y < -900) bot.y = innerHeight + Math.random() * 300;
    if (hitCar(bot.x, bot.y, 44, 78)) crash(bot.police ? "Police bump!" : "Rival collision!");
  });
}

function updatePickups(dt) {
  const fall = race.player.speed * dt;
  moveList(race.obstacles, fall, (item) => {
    if (hitCar(item.x, item.y, item.w, item.h)) {
      if (item.type === "jump") {
        race.player.nitro = Math.min(100, race.player.nitro + 24);
        feed("Ramp jump! Nitro refilled.");
        spawnBurst(item.x, item.y, "#ffd34f", 18);
        sound("power");
        return true;
      }
      crash("Crash! Shield saved you?" );
      spawnBurst(item.x, item.y, "#ff4d61", 22);
      return true;
    }
    return false;
  });
  moveList(race.coins, fall, (coin) => {
    const magnet = race.player.magnet > 0;
    if (magnet) {
      coin.x += (race.player.x - coin.x) * dt * 4;
      coin.y += (race.player.y - coin.y) * dt * 4;
    }
    coin.spin += dt * 8;
    if (hitCar(coin.x, coin.y, 24, 24)) {
      state.coins += 1;
      race.score += 10;
      spawnBurst(coin.x, coin.y, "#ffd34f", 10);
      sound("coin");
      return true;
    }
    return false;
  });
  moveList(race.powerups, fall, (p) => {
    if (hitCar(p.x, p.y, 34, 34)) {
      applyPower(p.id);
      spawnBurst(p.x, p.y, "#28d7ff", 16);
      sound("power");
      return true;
    }
    return false;
  });
}

function moveList(list, fall, hit) {
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].y += fall;
    if (hit(list[i]) || list[i].y > innerHeight + 160) list.splice(i, 1);
  }
}

function applyPower(id) {
  if (id === "shield") race.player.shield = 100;
  if (id === "turbo") race.player.nitro = 100;
  if (id === "magnet") race.player.magnet = 12;
  if (id === "slowmo") race.player.slowmo = 8;
  feed(`${id.toUpperCase()} power up!`);
}

function crash(message) {
  if (race.player.shield > 8) {
    race.player.shield = Math.max(0, race.player.shield - 45);
    feed("Shield blocked the hit!");
    sound("power");
    return;
  }
  shake = .28;
  race.player.speed *= .54;
  race.player.nitro = Math.max(0, race.player.nitro - 18);
  shell.classList.add("shake");
  setTimeout(() => shell.classList.remove("shake"), 300);
  spawnBurst(race.player.x, race.player.y, "#ff4d61", 32);
  sound("crash");
  feed(message);
  if (race.police) {
    race.score = Math.max(0, race.score - 80);
  }
}

function hitCar(x, y, w, h) {
  return Math.abs(x - race.player.x) < (w + race.player.w) * .42 && Math.abs(y - race.player.y) < (h + race.player.h) * .42;
}

function updateParticles(dt) {
  for (let i = race.particles.length - 1; i >= 0; i--) {
    const p = race.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vy += 80 * dt;
    if (p.life <= 0) race.particles.splice(i, 1);
  }
}

function updateWeather(dt) {
  race.weather.forEach((w) => {
    w.y += (race.route.weather === "rain" ? 560 : 140) * dt;
    w.x += (race.route.weather === "storm" ? 80 : 12) * dt;
    if (w.y > innerHeight + 20) {
      w.y = -20;
      w.x = Math.random() * innerWidth;
    }
    if (w.x > innerWidth + 20) w.x = -20;
  });
}

function updateLaps() {
  const targetLap = Math.floor(race.distance / race.lapDistance) + 1;
  if (targetLap > race.lap) {
    race.lap = targetLap;
    race.player.nitro = Math.min(100, race.player.nitro + 45);
    feed(`Lap ${Math.min(race.lap, race.laps)}! Nitro bonus.`);
    sound("boost");
  }
  if (race.lap > race.laps && mode !== "endless") finish(true);
  if (mode === "endless" && race.time > 90) finish(true);
}

function updateHud() {
  ui.speed.textContent = `${Math.round(race.player.speed)} km/h`;
  ui.lap.textContent = mode === "endless" ? `${Math.floor(race.distance / 1000)} km` : `${Math.min(race.lap, race.laps)}/${race.laps}`;
  ui.coins.textContent = state.coins;
  ui.time.textContent = race.time.toFixed(1);
  ui.nitro.style.width = `${race.player.nitro}%`;
  ui.shield.style.width = `${race.player.shield}%`;
}

function finish(won) {
  if (race.finished) return;
  race.finished = true;
  running = false;
  const bossBonus = race.boss ? 400 : 0;
  const timeBonus = Math.max(0, Math.round(900 - race.time * 12));
  const score = Math.round(race.score + race.distance / 8 + timeBonus + bossBonus);
  const stars = won ? (race.time < 38 + state.level * 2 ? 3 : race.time < 52 + state.level * 2 ? 2 : 1) : 0;
  state.stars += stars;
  state.coins += 60 * stars + (race.boss ? 150 : 0);
  if (won && mode === "career") state.level += 1;
  if (won && race.boss) unlockNextCar();
  state.leaderboard.unshift({ name: mode === "police" ? "Police Chase" : race.route.name, score });
  state.leaderboard.sort((a, b) => b.score - a.score);
  state.leaderboard = state.leaderboard.slice(0, 8);
  save();
  ui.resultIcon.textContent = won ? "🏆" : "💥";
  ui.resultTitle.textContent = won ? "Race Complete!" : "Race Lost";
  ui.resultText.textContent = won ? `Score ${score}. Coins and stars saved.` : "Tune your car and try again.";
  ui.stars.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    span.textContent = i < stars ? "⭐" : "☆";
    ui.stars.appendChild(span);
  }
  renderMenu();
  sound(won ? "win" : "crash");
  show(ui.result);
}

function unlockNextCar() {
  const locked = cars.find((car) => !state.unlockedCars.includes(car.id));
  if (locked) {
    state.unlockedCars.push(locked.id);
    feed(`${locked.name} unlocked!`);
  }
}

function spawnTrail(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    race.particles.push({
      x: x + (Math.random() - .5) * 26,
      y: y + Math.random() * 20,
      vx: (Math.random() - .5) * 80,
      vy: 80 + Math.random() * 120,
      life: .28 + Math.random() * .25,
      size: 4 + Math.random() * 10,
      color
    });
  }
}

function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 260;
    race.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .45 + Math.random() * .35, size: 3 + Math.random() * 8, color });
  }
}

function feed(text) {
  ui.feed.innerHTML = `<strong>${text}</strong><span>${race.route ? race.route.name : "Turbo Racing Nitro"}</span>`;
}

function draw() {
  const w = innerWidth;
  const h = innerHeight;
  const sx = shake > 0 ? (Math.random() - .5) * 18 : 0;
  const sy = shake > 0 ? (Math.random() - .5) * 12 : 0;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(sx - camera, sy);
  drawSky(w, h);
  drawRoad(w, h);
  drawPickups();
  drawBots();
  drawPlayer();
  drawParticles();
  drawWeather(w, h);
  ctx.restore();
  if (paused) drawDim();
}

function drawSky(w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, race.route.sky[0]);
  g.addColorStop(1, race.route.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-80, 0, w + 160, h);
  for (let i = 0; i < 16; i++) {
    const x = (i * 170 - roadSeed * .08) % (w + 240) - 120;
    const y = 90 + (i % 5) * 95;
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,.12)" : "rgba(40,215,255,.16)";
    roundRect(x, y, 90 + (i % 4) * 22, 45 + (i % 3) * 18, 12, true);
  }
}

function drawRoad(w, h) {
  const rw = roadWidth();
  ctx.lineJoin = "round";
  const pointsL = [];
  const pointsR = [];
  for (let y = -60; y <= h + 80; y += 36) {
    const c = roadCenter(y);
    const scale = .72 + (y / h) * .4;
    pointsL.push([c - rw * scale / 2, y]);
    pointsR.unshift([c + rw * scale / 2, y]);
  }
  ctx.beginPath();
  [...pointsL, ...pointsR].forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = race.route.road;
  ctx.fill();
  ctx.strokeStyle = race.route.neon;
  ctx.lineWidth = 5;
  ctx.shadowColor = race.route.neon;
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255,255,255,.72)";
  ctx.lineWidth = 6;
  ctx.setLineDash([34, 34]);
  ctx.lineDashOffset = -roadSeed * .28;
  ctx.beginPath();
  for (let y = -30; y <= h + 40; y += 30) {
    const c = roadCenter(y);
    y === -30 ? ctx.moveTo(c, y) : ctx.lineTo(c, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 2; i++) {
    ctx.strokeStyle = i ? "rgba(255,61,154,.24)" : "rgba(40,215,255,.24)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = -30; y <= h + 40; y += 35) {
      const c = roadCenter(y) + (i ? 1 : -1) * rw * .24;
      y === -30 ? ctx.moveTo(c, y) : ctx.lineTo(c, y);
    }
    ctx.stroke();
  }
}

function drawPickups() {
  race.obstacles.forEach((o) => {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = o.type === "jump" ? "#ffd34f" : "#ff4d61";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 10, true);
    ctx.fillStyle = "#fff";
    ctx.font = "22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(o.type === "jump" ? "⇧" : "!", 0, 8);
    ctx.restore();
  });
  race.coins.forEach((coin) => {
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.rotate(coin.spin);
    ctx.fillStyle = "#ffd34f";
    ctx.shadowColor = "#ffd34f";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7b4b0a";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("$", 0, 6);
    ctx.restore();
  });
  race.powerups.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(race.time * 2);
    ctx.fillStyle = "#28d7ff";
    ctx.shadowColor = "#28d7ff";
    ctx.shadowBlur = 20;
    roundRect(-18, -18, 36, 36, 10, true);
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText({ shield: "S", turbo: "T", magnet: "M", slowmo: "⏱" }[p.id], p.x, p.y + 6);
  });
}

function drawBots() {
  race.bots.forEach((bot) => drawCar(bot.x, bot.y, bot.color, bot.police ? "#ff4d61" : race.route.neon, bot.boss ? 1.18 : 1, bot.police));
}

function drawPlayer() {
  const tilt = race.player.vx * .0009;
  drawCar(race.player.x, race.player.y, race.player.color, race.player.shield > 0 ? "#7df7ff" : "#ffffff", 1, false, tilt);
  if (race.player.shield > 0) {
    ctx.strokeStyle = "rgba(125,247,255,.72)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#7df7ff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(race.player.x, race.player.y, 45, 68, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawCar(x, y, color, glow, scale = 1, police = false, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);
  ctx.shadowColor = glow;
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  roundRect(-23, -42, 46, 84, 13, true);
  ctx.shadowBlur = 0;
  ctx.fillStyle = police ? "#111827" : "rgba(190,245,255,.86)";
  roundRect(-14, -28, 28, 22, 7, true);
  roundRect(-15, 8, 30, 20, 7, true);
  ctx.fillStyle = "#071021";
  roundRect(-31, -26, 9, 24, 5, true);
  roundRect(22, -26, 9, 24, 5, true);
  roundRect(-31, 13, 9, 24, 5, true);
  roundRect(22, 13, 9, 24, 5, true);
  ctx.fillStyle = police ? "#ff4d61" : "#fff";
  ctx.fillRect(-18, -47, 14, 6);
  ctx.fillStyle = police ? "#28d7ff" : "#ffd34f";
  ctx.fillRect(4, -47, 14, 6);
  ctx.restore();
}

function drawParticles() {
  race.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  });
}

function drawWeather(w, h) {
  if (race.route.weather === "fog") {
    ctx.fillStyle = "rgba(230,250,255,.18)";
    for (let i = 0; i < 8; i++) roundRect((i * 180 - roadSeed * .05) % (w + 240) - 120, 120 + i * 70, 220, 36, 18, true);
  }
  if (race.route.weather === "night") {
    ctx.fillStyle = "rgba(3,4,12,.22)";
    ctx.fillRect(-80, 0, w + 160, h);
  }
  ctx.strokeStyle = race.route.weather === "rain" ? "rgba(190,240,255,.52)" : "rgba(255,255,255,.22)";
  ctx.lineWidth = race.route.weather === "rain" ? 2 : 3;
  race.weather.forEach((drop) => {
    if (race.route.weather === "day") return;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 10, drop.y + drop.s * (race.route.weather === "rain" ? 6 : 2));
    ctx.stroke();
  });
}

function drawDim() {
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  if (fill) ctx.fill();
}

function loop(now) {
  const dt = Math.min(.033, (now - last) / 1000 || .016);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function pauseRace() {
  if (!running) return;
  paused = true;
  show(ui.pause);
}

function resumeRace() {
  paused = false;
  show(null);
}

function quitRace() {
  running = false;
  paused = false;
  show(ui.menu);
}

document.addEventListener("keydown", (event) => {
  keys[event.key] = true;
  if (event.key === "Escape") pauseRace();
});

document.addEventListener("keyup", (event) => { keys[event.key] = false; });

function bindHold(id, prop) {
  const btn = document.querySelector(id);
  const on = (event) => { event.preventDefault(); touch[prop] = true; ensureAudio(); };
  const off = () => { touch[prop] = false; };
  btn.addEventListener("pointerdown", on);
  btn.addEventListener("pointerup", off);
  btn.addEventListener("pointercancel", off);
  btn.addEventListener("pointerleave", off);
}

bindHold("#leftBtn", "left");
bindHold("#rightBtn", "right");
bindHold("#brakeBtn", "brake");
bindHold("#nitroBtn", "nitro");

canvas.addEventListener("pointerdown", (event) => {
  touch.dragging = true;
  touch.startX = event.clientX;
  ensureAudio();
});

canvas.addEventListener("pointermove", (event) => {
  if (!touch.dragging) return;
  const delta = event.clientX - touch.startX;
  touch.left = delta < -10;
  touch.right = delta > 10;
  race.player.x += delta * .035;
});

canvas.addEventListener("pointerup", () => {
  touch.dragging = false;
  touch.left = false;
  touch.right = false;
});

document.querySelector("#raceBtn").onclick = () => startRace("career");
document.querySelector("#endlessBtn").onclick = () => startRace("endless");
document.querySelector("#policeBtn").onclick = () => startRace("police");
document.querySelector("#garageBtn").onclick = () => { renderGarage(); show(ui.garage); };
document.querySelector("#shopBtn").onclick = () => { renderShop(); show(ui.shop); };
document.querySelector("#dailyBtn").onclick = dailyReward;
document.querySelector("#resumeBtn").onclick = resumeRace;
document.querySelector("#quitBtn").onclick = quitRace;
document.querySelector("#nextRaceBtn").onclick = () => startRace("career");
document.querySelector("#menuBtn").onclick = () => show(ui.menu);
document.querySelectorAll("[data-close]").forEach((btn) => btn.onclick = () => { renderMenu(); show(ui.menu); });

window.addEventListener("resize", resize);

loadSave();
resize();
renderMenu();
setTimeout(() => {
  show(ui.menu);
  feed("Choose a mode and start racing.");
}, 850);
requestAnimationFrame(loop);
