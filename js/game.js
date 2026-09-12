const AudioSys = {
  ctx: null,
  muted: false,
  busy: false,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },

  tone(f0, f1, dur, type, vol) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  },

  noise(dur, vol) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
  },

  key() { this.tone(880, 980, 0.05, "square", 0.04); },
  error() { this.tone(180, 120, 0.12, "sawtooth", 0.08); },
  kill() { this.tone(520, 90, 0.22, "square", 0.09); this.noise(0.12, 0.06); },
  strike() { this.tone(120, 40, 0.3, "sawtooth", 0.14); this.noise(0.25, 0.12); },
  wave() { this.tone(392, 392, 0.12, "square", 0.06); setTimeout(() => this.tone(587, 587, 0.18, "square", 0.06), 130); },
  power() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.12, "triangle", 0.08), i * 90)); },
  over() { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => this.tone(f, f * 0.9, 0.25, "sawtooth", 0.08), i * 180)); }
};

const Game = (() => {
  const field = document.getElementById("field");
  const LERMINAL = 96;

  const state = {
    mode: "menu",
    paused: false,
    score: 0,
    best: 0,
    combo: 0,
    wave: 0,
    hp: 100,
    maxHp: 100,
    spawned: 0,
    spawnAcc: 0,
    slowUntil: 0,
    x3Until: 0
  };

  let enemies = [];
  let idc = 0;
  let lastTs = 0;
  let raf = 0;
  let bannerTimer = 0;

  try {
    state.best = +(localStorage.getItem("tb-best") || 0);
  } catch (e) { state.best = 0; }

  function cfg() {
    return {
      total: Math.min(6 + Math.floor(state.wave * 2.5), 45),
      interval: Math.max(0.3, 1.7 - state.wave * 0.08),
      speed: 34 + state.wave * 7,
      cap: Math.min(4 + Math.ceil(state.wave / 2), 8)
    };
  }

  function tierOf() {
    const r = Math.random();
    if (state.wave <= 2) return r < 0.82 ? "easy" : "medium";
    if (state.wave <= 5) return r < 0.6 ? "medium" : "easy";
    return r < 0.62 ? "hard" : "medium";
  }

  function spawn() {
    const c = cfg();
    const tier = tierOf();
    const word = Words.pick(tier);
    const occupied = new Set(enemies.map((e) => e.lane));
    const lanes = 5;
    const free = [];
    for (let i = 0; i < lanes; i++) if (!occupied.has(i)) free.push(i);
    const lane = free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(Math.random() * lanes);
    const jitter = (Math.random() - 0.5) * 4;

    const speed = c.speed * (tier === "hard" ? 1.22 : tier === "medium" ? 1.08 : 1) * (0.9 + Math.random() * 0.25);

    const enemy = {
      id: ++idc,
      tier,
      word,
      ti: 0,
      lane,
      xPct: ((lane + 0.5) / lanes) * 100 + jitter,
      yPct: -8,
      speed,
      el: null,
      wordEl: null,
      hitTimer: 0
    };

    const dom = UI.createEnemy(enemy);
    enemy.el = dom.root;
    enemy.wordEl = dom.wordEl;
    enemies.push(enemy);
  }

  function selectCurrent() {
    let curr = null;
    for (const e of enemies) {
      if (curr === null || e.yPct > curr.yPct) curr = e;
    }
    for (const e of enemies) e.el.classList.toggle("hot", e === curr);
    UI.setPrompt(curr ? curr.word : "", curr ? curr.ti : 0);
  }

  function mult() {
    return Math.min(6, 1 + Math.floor(state.combo / 3));
  }

  function killEnemy(e) {
    const x3 = performance.now() < state.x3Until;
    let gain = (e.word.length * 10 + state.wave * 5) * mult();
    if (x3) gain *= 3;
    state.score += gain;
    state.combo++;
    UI.spray(e.xPct, e.yPct, e.tier, 20);
    UI.floater("+" + gain, e.xPct, e.yPct);
    if (x3) UI.floater("x3 BONUS", e.xPct, e.yPct - 4, "gold");
    removeEnemy(e);
    AudioSys.kill();
    maybePowerup(e);
    refreshHUD();
  }

  function removeEnemy(e) {
    enemies = enemies.filter((x) => x.id !== e.id);
    UI.removeDom(e.el);
  }

  function strike(e) {
    const dmg = Math.min(40, 12 + state.wave * 2);
    state.hp -= dmg;
    state.combo = 0;
    UI.spray(e.xPct, LERMINAL, "red", 26);
    UI.spray(e.xPct, LERMINAL, "red", 26);
    AudioSys.strike();
    UI.shake(420);
    removeEnemy(e);
    refreshHUD();
    if (state.hp <= 0) {
      state.hp = 0;
      gameOver();
    }
  }

  function maybePowerup(e) {
    if (Math.random() > 0.09) return;
    const r = Math.random();
    if (r < 0.34) {
      state.slowUntil = performance.now() + 5000;
      UI.floater("CÁMARA LENTA", e.xPct, 20, "cyan");
      AudioSys.power();
    } else if (r < 0.67) {
      const list = enemies.slice();
      for (const x of list) {
        state.combo++;
        state.score += (x.word.length * 10 + state.wave * 5) * mult();
        UI.spray(x.xPct, x.yPct, x.tier, 14);
        removeEnemy(x);
      }
      UI.floater("LIMPIEZA TOTAL", 50, 30, "cyan");
      AudioSys.power();
      refreshHUD();
    } else {
      state.x3Until = performance.now() + 8000;
      UI.floater("PUNTOS x3", e.xPct, 20, "gold");
      AudioSys.power();
    }
  }

  function nextWave() {
    state.wave++;
    state.spawned = 0;
    state.spawnAcc = 0;
    if (state.wave > 1) {
      const heal = Math.min(state.maxHp - state.hp, 8);
      state.hp += heal;
      if (heal > 0) UI.floater("SUMINISTROS +" + heal, 50, 62, "green");
    }
    state.mode = "wave";
    UI.waveBanner(state.wave);
    AudioSys.wave();
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      if (state.mode === "wave") {
        state.mode = "playing";
        UI.waveBannerHide();
      }
    }, 2400);
    refreshHUD();
  }

  function update(dt) {
    const c = cfg();
    if (state.spawned < c.total && enemies.length < c.cap) {
      state.spawnAcc += dt;
      if (state.spawnAcc >= c.interval) {
        state.spawnAcc = 0;
        spawn();
        state.spawned++;
      }
    }

    const now = performance.now();
    const slowF = now < state.slowUntil ? 0.45 : 1;
    const fh = field.clientHeight || 800;

    for (const e of enemies) {
      e.yPct += (e.speed * slowF * dt * 100) / fh;
      e.el.style.left = e.xPct + "%";
      e.el.style.top = e.yPct + "%";
    }

    const struck = enemies.filter((e) => e.yPct >= LERMINAL);
    for (const e of struck) strike(e);

    selectCurrent();
    refreshHUD();

    if (state.spawned >= c.total && enemies.length === 0) nextWave();
  }

  function handleKey(ch) {
    if (state.mode !== "playing" || state.paused) return;
    const curr = enemies.find((e) => e.el.classList.contains("hot"));
    if (!curr) return;
    const expected = Words.normalize(curr.word[curr.ti]);
    if (Words.normalize(ch) === expected) {
      curr.ti++;
      UI.markTyped(curr.wordEl, curr.ti);
      UI.hitFlash(curr.el, false);
      AudioSys.key();
      if (curr.ti === curr.word.length) killEnemy(curr);
      refreshHUD();
    } else {
      state.combo = 0;
      UI.hitFlash(curr.el, true);
      UI.shake(90);
      AudioSys.error();
      refreshHUD();
    }
    UI.setPrompt(curr.word, curr.ti);
  }

  function refreshHUD() {
    UI.updateHUD({
      score: state.score,
      best: Math.max(state.best, state.score),
      mult: mult(),
      wave: state.wave,
      hp: Math.max(0, state.hp),
      maxHp: state.maxHp
    });
  }

  function start() {
    try { localStorage.setItem("tb-best", Math.max(state.best, state.score)); } catch (e) {}
    state.mode = "menu";
    state.score = 0;
    state.combo = 0;
    state.hp = state.maxHp;
    state.wave = 0;
    state.spawned = 0;
    state.spawnAcc = 0;
    state.slowUntil = 0;
    state.x3Until = 0;
    state.paused = false;
    for (const e of enemies) UI.removeDom(e.el);
    enemies = [];
    Words.resetAll();
    UI.clearAll();
    UI.menu(false);
    UI.gameOver(false);
    UI.setPause(false);
    AudioSys.ensure();
    nextWave();
  }

  function gameOver() {
    state.mode = "over";
    state.paused = false;
    AudioSys.over();
    UI.setPause(false);
    if (state.score > state.best) {
      state.best = state.score;
      try { localStorage.setItem("tb-best", state.best); } catch (e) {}
    }
    UI.gameOver(state.score, state.best, state.wave);
    refreshHUD();
  }

  function onEnter() {
    if (state.mode === "menu" || state.mode === "over") start();
    else if (state.mode === "wave") {
      clearTimeout(bannerTimer);
      state.mode = "playing";
      UI.waveBannerHide();
    }
  }

  function togglePause() {
    if (state.mode !== "playing") return;
    state.paused = !state.paused;
    UI.setPause(state.paused);
  }

  function toggleMute() {
    AudioSys.muted = !AudioSys.muted;
    document.getElementById("btn-mute").textContent = AudioSys.muted ? "MUTE" : "SOUND";
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (state.mode === "playing" && !state.paused) update(dt);
    raf = requestAnimationFrame(loop);
  }

  document.getElementById("btn-start").addEventListener("click", start);
  document.getElementById("btn-restart").addEventListener("click", start);
  document.getElementById("btn-pause").addEventListener("click", togglePause);
  document.getElementById("btn-mute").addEventListener("click", toggleMute);

  UI.init();
  refreshHUD();
  UI.updateHUD({ score: 0, best: state.best, mult: 1, wave: 0, hp: 100, maxHp: 100 });
  raf = requestAnimationFrame(loop);

  return { onKey: handleKey, onEnter, togglePause, toggleMute };
})();