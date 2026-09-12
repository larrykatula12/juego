const UI = (() => {
  const wrap = document.getElementById("game-wrap");
  const field = document.getElementById("field");
  const promptWord = document.getElementById("prompt-word");
  const overlayMenu = document.getElementById("overlay-menu");
  const overlayWave = document.getElementById("overlay-wave");
  const overlayOver = document.getElementById("overlay-over");
  const waveTitle = document.getElementById("wave-title");
  const waveSub = document.getElementById("wave-sub");

  const tierColors = { easy: "#3dff8b", medium: "#ffd23d", hard: "#ff4d7d" };

  function init() {
    const starsEl = document.getElementById("stars");
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("div");
      s.className = "star";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 3 + "s";
      s.style.opacity = 0.2 + Math.random() * 0.6;
      starsEl.appendChild(s);
    }
  }

  function createEnemy(enemy) {
    const root = document.createElement("div");
    root.className = "enemy";
    root.dataset.tier = enemy.tier;
    root.style.left = enemy.xPct + "%";
    root.style.top = enemy.yPct + "%";

    const shell = document.createElement("div");
    shell.className = "enemy-shell";
    root.appendChild(shell);

    const wordEl = document.createElement("div");
    wordEl.className = "enemy-word";
    for (const ch of enemy.word) {
      const s = document.createElement("span");
      s.className = "letter";
      s.textContent = ch;
      wordEl.appendChild(s);
    }
    root.appendChild(wordEl);

    const eye = document.createElement("div");
    eye.className = "enemy-eye";
    root.appendChild(eye);

    field.appendChild(root);
    return { root, wordEl };
  }

  function removeDom(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function markTyped(wordEl, count) {
    for (let i = 0; i < wordEl.children.length; i++) {
      wordEl.children[i].classList.toggle("typed", i < count);
    }
  }

  function hitFlash(el, wrong) {
    el.classList.remove("hit", "bad");
    void el.offsetWidth;
    el.classList.add("hit");
    if (wrong) el.classList.add("bad");
    if (el._hitTimer) clearTimeout(el._hitTimer);
    el._hitTimer = setTimeout(() => el.classList.remove("hit", "bad"), 260);
  }

  function colorOf(c) {
    return tierColors[c] || c;
  }

  function spray(xPct, yPct, color, count) {
    const c = colorOf(color);
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 90;
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      p.style.left = xPct + "%";
      p.style.top = yPct + "%";
      p.style.background = c;
      field.appendChild(p);
      setTimeout(() => removeDom(p), 700);
    }
  }

  function floater(text, xPct, yPct, cls) {
    const f = document.createElement("div");
    f.className = "floater" + (cls ? " " + cls : "");
    f.textContent = text;
    f.style.left = xPct + "%";
    f.style.top = yPct + "%";
    field.appendChild(f);
    setTimeout(() => removeDom(f), 1100);
  }

  function setPrompt(word, typedCount) {
    promptWord.innerHTML = "";
    if (!word) {
      const s = document.createElement("span");
      s.className = "prompt-letter ghost";
      s.textContent = "·";
      promptWord.appendChild(s);
      return;
    }
    for (let i = 0; i < word.length; i++) {
      const s = document.createElement("span");
      s.className = "prompt-letter" + (i < typedCount ? " typed" : "");
      s.textContent = word[i];
      promptWord.appendChild(s);
    }
  }

  function updateHUD(d) {
    document.getElementById("hud-score").textContent = d.score;
    document.getElementById("hud-best").textContent = d.best;
    document.getElementById("hud-combo").textContent = "x" + d.mult;
    document.getElementById("hud-wave").textContent = d.wave;
    const fill = document.getElementById("hp-fill");
    const pct = Math.max(0, d.hp / d.maxHp) * 100;
    fill.style.width = pct + "%";
    fill.classList.toggle("low", pct < 40);
    document.getElementById("hp-text").textContent = Math.round(d.hp);
  }

  function menu(show) {
    overlayMenu.classList.toggle("hidden", !show);
  }

  function gameOver(show, score, best, wave) {
    if (show) {
      document.getElementById("final-score").textContent = score;
      document.getElementById("final-best").textContent = best;
      document.getElementById("final-wave").textContent = wave;
      overlayOver.classList.remove("hidden");
    } else {
      overlayOver.classList.add("hidden");
    }
  }

  function waveBanner(n) {
    waveTitle.textContent = "OLEADA " + n;
    waveSub.textContent = "¡Prepárate!";
    waveSub.classList.remove("paused");
    overlayWave.classList.remove("hidden");
  }

  function waveBannerHide() {
    overlayWave.classList.add("hidden");
  }

  let pauseShowing = false;

  function setPause(on) {
    if (on) {
      waveTitle.textContent = "PAUSA";
      waveSub.textContent = "Pulsa ESC para continuar";
      waveSub.classList.add("paused");
      overlayWave.classList.remove("hidden");
      pauseShowing = true;
    } else if (pauseShowing) {
      overlayWave.classList.add("hidden");
      pauseShowing = false;
    }
  }

  function clearAll() {
    const nodes = field.querySelectorAll(".enemy, .particle, .floater");
    for (const n of nodes) removeDom(n);
    setPrompt("", 0);
  }

  function shake(ms) {
    wrap.classList.remove("shake");
    void wrap.offsetWidth;
    wrap.classList.add("shake");
    clearTimeout(wrap._shake);
    wrap._shake = setTimeout(() => wrap.classList.remove("shake"), ms);
  }

  return {
    init,
    createEnemy,
    removeDom,
    markTyped,
    hitFlash,
    spray,
    floater,
    setPrompt,
    updateHUD,
    menu,
    gameOver,
    waveBanner,
    waveBannerHide,
    setPause,
    clearAll,
    shake
  };
})();