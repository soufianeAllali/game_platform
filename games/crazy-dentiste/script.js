const screens = {
  start: document.querySelector("#startScreen"),
  game: document.querySelector("#gameScreen"),
  result: document.querySelector("#resultScreen")
};

const els = {
  app: document.querySelector("#app"),
  bestStars: document.querySelector("#bestStars"),
  startBtn: document.querySelector("#startBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  levelText: document.querySelector("#levelText"),
  coinsText: document.querySelector("#coinsText"),
  comboText: document.querySelector("#comboText"),
  timerText: document.querySelector("#timerText"),
  timerBar: document.querySelector("#timerBar"),
  toolGrid: document.querySelector("#toolGrid"),
  stage: document.querySelector("#patientStage"),
  patient: document.querySelector("#patient"),
  patientCard: document.querySelector("#patientCard"),
  mouth: document.querySelector(".mouth"),
  teeth: document.querySelector("#teeth"),
  progressBar: document.querySelector("#progressBar"),
  speech: document.querySelector("#speech"),
  fx: document.querySelector("#fxLayer"),
  resultIcon: document.querySelector("#resultIcon"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  starsBox: document.querySelector("#starsBox"),
  nextBtn: document.querySelector("#nextBtn"),
  retryBtn: document.querySelector("#retryBtn")
};

const tools = [
  { id: "brush", icon: "🪥", name: "Brush", unlock: 1, fixes: ["dirty"] },
  { id: "drill", icon: "🌀", name: "Cavity", unlock: 2, fixes: ["cavity"] },
  { id: "shot", icon: "💉", name: "Shot", unlock: 3, fixes: ["infected"] },
  { id: "xray", icon: "📡", name: "X-Ray", unlock: 4, fixes: ["hidden"] },
  { id: "laser", icon: "🔦", name: "Laser", unlock: 5, fixes: ["germ"] },
  { id: "gold", icon: "✨", name: "Gold", unlock: 6, fixes: ["gold"] },
  { id: "white", icon: "💎", name: "Whiten", unlock: 7, fixes: ["stain"] },
  { id: "slime", icon: "🧪", name: "Slime", unlock: 8, fixes: ["slime"] }
];

const patients = [
  { name: "Mila", kind: "kid", skin: "#ffc9a4", voice: "My teeth need sparkle!", theme: "theme-lab" },
  { name: "Boomba", kind: "monster", skin: "#87ee9e", voice: "My monster molars are messy!", theme: "theme-jungle" },
  { name: "Robo-7", kind: "robot", skin: "#bfe7ff", voice: "Dental system alert!", theme: "theme-space" },
  { name: "Noodle", kind: "kid", skin: "#ffd86f", voice: "That tickles!", theme: "theme-lab" },
  { name: "Queen Cavity", kind: "boss", skin: "#bd8cff", voice: "Boss smile incoming!", theme: "theme-boss" }
];

const state = {
  level: 1,
  coins: 0,
  stars: 0,
  selected: "brush",
  teeth: [],
  totalProblems: 0,
  fixed: 0,
  combo: 0,
  time: 70,
  maxTime: 70,
  timer: null,
  playing: false,
  audio: null
};

const saveKey = "crazyDentisteDeluxe";
const problemByTool = {
  brush: "dirty",
  drill: "cavity",
  shot: "infected",
  xray: "hidden",
  laser: "germ",
  gold: "gold",
  white: "stain",
  slime: "slime"
};

const toothHitboxPadding = 30;
const toothHitboxTopPadding = 46;

function loadSave() {
  const saved = JSON.parse(localStorage.getItem(saveKey) || "{}");
  state.level = saved.level || 1;
  state.coins = saved.coins || 0;
  state.stars = saved.stars || 0;
  els.bestStars.textContent = state.stars;
  els.coinsText.textContent = state.coins;
}

function saveProgress() {
  localStorage.setItem(saveKey, JSON.stringify({
    level: state.level,
    coins: state.coins,
    stars: state.stars
  }));
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function ensureAudio() {
  if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
  if (state.audio.state === "suspended") state.audio.resume();
}

function tone(freq, duration = 0.09, type = "sine", gain = 0.05) {
  if (!state.audio) return;
  const osc = state.audio.createOscillator();
  const vol = state.audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.value = gain;
  osc.connect(vol);
  vol.connect(state.audio.destination);
  osc.start();
  vol.gain.exponentialRampToValueAtTime(0.001, state.audio.currentTime + duration);
  osc.stop(state.audio.currentTime + duration);
}

function sound(type) {
  ensureAudio();
  const map = {
    tap: [520, 650],
    good: [660, 880, 1040],
    bad: [140, 100],
    win: [523, 659, 784, 1046],
    unlock: [392, 523, 784, 1175]
  };
  (map[type] || map.tap).forEach((freq, index) => {
    setTimeout(() => tone(freq, 0.12, type === "bad" ? "sawtooth" : "triangle"), index * 70);
  });
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1.05;
  utterance.pitch = 1.45;
  window.speechSynthesis.speak(utterance);
}

function renderTools() {
  els.toolGrid.innerHTML = "";
  tools.forEach((tool) => {
    const button = document.createElement("button");
    button.className = `tool-btn ${state.selected === tool.id ? "active" : ""} ${state.level < tool.unlock ? "locked" : ""}`;
    button.type = "button";
    button.innerHTML = `<span>${tool.icon}</span><small>${tool.name}</small>`;
    button.addEventListener("click", () => {
      if (state.level < tool.unlock) {
        feedbackBad(`Unlocks at level ${tool.unlock}`);
        return;
      }
      state.selected = tool.id;
      renderTools();
      sound("tap");
      els.speech.textContent = `${tool.name} ready!`;
    });
    els.toolGrid.appendChild(button);
  });
}

function startLevel() {
  showScreen("game");
  state.playing = true;
  state.combo = 0;
  state.fixed = 0;
  state.maxTime = Math.max(34, 76 - state.level * 4);
  state.time = state.maxTime;
  els.levelText.textContent = state.level;
  els.comboText.textContent = state.combo;
  els.coinsText.textContent = state.coins;
  renderTools();
  buildPatient();
  startTimer();
}

function buildPatient() {
  const patient = patients[state.level % 5 === 0 ? 4 : (state.level - 1) % 4];
  els.stage.className = `patient-stage ${patient.theme}`;
  els.patient.className = `patient ${patient.kind}`;
  els.patient.style.setProperty("--skin", patient.skin);
  els.patient.classList.remove("happy", "hurt");
  els.patientCard.classList.toggle("boss-off", patient.kind !== "boss");
  els.speech.textContent = `${patient.name}: ${patient.voice}`;
  speak(patient.voice);

  const count = Math.min(24, 10 + state.level + (patient.kind === "boss" ? 6 : 0));
  const available = tools.filter((tool) => state.level >= tool.unlock).map((tool) => problemByTool[tool.id]);
  state.teeth = [];
  state.totalProblems = 0;
  els.teeth.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "tooth";
    const problemCount = Math.random() < 0.22 + state.level * 0.025 ? 2 : 1;
    const problems = [];
    for (let j = 0; j < problemCount; j += 1) {
      const problem = available[Math.floor(Math.random() * available.length)];
      if (!problems.includes(problem)) problems.push(problem);
    }
    if (patient.kind === "boss" && i % 4 === 0 && !problems.includes("infected")) problems.push("infected");
    problems.forEach((problem) => div.classList.add(problem));
    const tooth = { el: div, problems };
    state.teeth.push(tooth);
    els.teeth.appendChild(div);
  }
  state.totalProblems = state.teeth.reduce((sum, tooth) => sum + tooth.problems.length, 0);
  updateProgress();
}

function findToothFromPointer(event) {
  const directTooth =
    event.target.closest?.(".tooth") ||
    document.elementsFromPoint(event.clientX, event.clientY)
      .find((element) => element.classList?.contains("tooth"));

  if (directTooth && els.teeth.contains(directTooth)) {
    return state.teeth.find((tooth) => tooth.el === directTooth);
  }

  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  state.teeth.forEach((tooth) => {
    if (tooth.el.classList.contains("removed")) return;
    const rect = tooth.el.getBoundingClientRect();
    const insideExpandedBox =
      event.clientX >= rect.left - toothHitboxPadding &&
      event.clientX <= rect.right + toothHitboxPadding &&
      event.clientY >= rect.top - toothHitboxTopPadding &&
      event.clientY <= rect.bottom + toothHitboxPadding;

    if (!insideExpandedBox) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = dx * dx + dy * dy;

    if (distance < bestDistance) {
      bestDistance = distance;
      best = tooth;
    }
  });

  return best;
}

function handleToothPointer(event) {
  if (!state.playing) return;
  if (event.pointerType === "touch") event.preventDefault();
  const tooth = findToothFromPointer(event);
  if (!tooth) return;
  fixTooth(tooth, event.clientX, event.clientY);
}

function fixTooth(tooth, x, y) {
  if (!state.playing) return;
  if (!tooth.problems.length) return;
  const needed = problemByTool[state.selected];
  if (!tooth.problems.includes(needed)) {
    feedbackBad("Wrong tool!");
    spawnParticles(x, y, ["#ff4a6a", "#84284a"], "slime");
    return;
  }

  tooth.problems = tooth.problems.filter((problem) => problem !== needed);
  tooth.el.classList.remove(needed);
  if (needed === "gold") tooth.el.classList.add("gold");
  if (needed === "white") tooth.el.classList.add("white");
  if (!tooth.problems.length) tooth.el.classList.add("fixed");

  state.fixed += 1;
  state.combo += 1;
  const reward = 4 + Math.min(20, state.combo);
  state.coins += reward;
  els.coinsText.textContent = state.coins;
  els.comboText.textContent = state.combo;
  els.patient.classList.add("happy");
  setTimeout(() => els.patient.classList.remove("happy"), 350);
  sound("good");
  spawnParticles(x, y, ["#fff", "#ffd257", "#58e69a", "#37d8ff"]);
  updateProgress();

  if (state.fixed >= state.totalProblems) finishLevel(true);
}

function feedbackBad(text) {
  state.combo = 0;
  els.comboText.textContent = state.combo;
  els.speech.textContent = text;
  els.patient.classList.add("hurt");
  els.app.classList.add("shake");
  sound("bad");
  setTimeout(() => {
    els.patient.classList.remove("hurt");
    els.app.classList.remove("shake");
  }, 300);
}

function updateProgress() {
  const percent = state.totalProblems ? (state.fixed / state.totalProblems) * 100 : 0;
  els.progressBar.style.width = `${percent}%`;
}

function startTimer() {
  clearInterval(state.timer);
  tickTimer();
  state.timer = setInterval(() => {
    state.time -= 1;
    tickTimer();
    if (state.time <= 0) finishLevel(false);
  }, 1000);
}

function tickTimer() {
  els.timerText.textContent = Math.max(0, state.time);
  els.timerBar.style.transform = `scaleX(${Math.max(0, state.time / state.maxTime)})`;
}

function finishLevel(won) {
  if (!state.playing) return;
  state.playing = false;
  clearInterval(state.timer);
  const ratio = state.fixed / Math.max(1, state.totalProblems);
  const earnedStars = won ? (state.time > state.maxTime * 0.5 ? 3 : state.time > state.maxTime * 0.25 ? 2 : 1) : Math.floor(ratio * 2);
  state.stars += earnedStars;
  if (won) {
    state.level += 1;
    state.coins += earnedStars * 25;
  }
  saveProgress();
  els.bestStars.textContent = state.stars;
  els.resultIcon.textContent = won ? "🏆" : "⏰";
  els.resultTitle.textContent = won ? "Smile saved!" : "Time challenge failed";
  els.resultText.textContent = won
    ? `You earned ${earnedStars} stars and unlocked more clinic magic.`
    : "Try again with faster combos.";
  els.starsBox.innerHTML = "";
  for (let i = 0; i < 3; i += 1) {
    const star = document.createElement("span");
    star.textContent = i < earnedStars ? "⭐" : "☆";
    els.starsBox.appendChild(star);
  }
  sound(won ? "win" : "bad");
  speak(won ? "Amazing smile saved!" : "Try again doctor!");
  showScreen("result");
}

function spawnParticles(x, y, colors, mode = "spark") {
  const count = mode === "slime" ? 10 : 18;
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("i");
    particle.className = mode === "slime" ? "slime" : "particle";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty("--c", colors[i % colors.length]);
    particle.style.setProperty("--x", `${(Math.random() - 0.5) * 180}px`);
    particle.style.setProperty("--y", `${(Math.random() - 0.5) * 150}px`);
    els.fx.appendChild(particle);
    setTimeout(() => particle.remove(), 900);
  }
}

els.startBtn.addEventListener("click", () => {
  ensureAudio();
  sound("unlock");
  startLevel();
});

els.resetBtn.addEventListener("click", () => {
  localStorage.removeItem(saveKey);
  state.level = 1;
  state.coins = 0;
  state.stars = 0;
  loadSave();
  sound("tap");
});

els.nextBtn.addEventListener("click", startLevel);
els.retryBtn.addEventListener("click", () => {
  state.level = Math.max(1, state.level);
  startLevel();
});
els.stage.addEventListener("pointerdown", handleToothPointer, { passive: false });

loadSave();
