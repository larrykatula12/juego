document.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "Escape") {
    e.preventDefault();
    Game.togglePause();
    return;
  }
  if (k === "F2") {
    Game.toggleMute();
    return;
  }
  if (k === "Enter") {
    e.preventDefault();
    Game.onEnter();
    return;
  }
  if (k.length === 1) {
    e.preventDefault();
    Game.onKey(k.toLowerCase());
  }
});