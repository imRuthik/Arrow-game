'use strict';
/* NEXA ARROWS — engine (pure logic, no DOM) + UI (below). */

/* ---------- ENGINE ---------- */
// Direction vectors: x grows right, y grows down.
const DIRS = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };

// Level format: { size: N (N x N grid), arrows: [[column, row, 'U'|'D'|'L'|'R'], ...], hint? }
const LEVELS = [
  { size: 4, hint: 'Start with an arrow that has an empty path.', arrows: [[0,1,'R'],[2,1,'U'],[1,3,'L'],[3,2,'D']] },
  { size: 4, arrows: [[0,0,'R'],[2,0,'D'],[2,2,'L'],[3,3,'U'],[1,3,'R']] },
  { size: 5, arrows: [[0,2,'R'],[2,2,'U'],[2,0,'L'],[4,4,'L'],[4,1,'D'],[1,4,'U']] },
  { size: 5, arrows: [[4,3,'U'],[1,2,'U'],[2,4,'D'],[4,0,'R'],[4,1,'U'],[1,0,'L'],[0,3,'R']] },
  { size: 5, arrows: [[1,0,'L'],[4,3,'D'],[4,1,'L'],[0,1,'D'],[2,0,'L'],[0,0,'U'],[1,3,'U'],[4,2,'U']] },
  { size: 6, arrows: [[3,0,'U'],[1,0,'R'],[2,2,'R'],[4,3,'D'],[1,5,'U'],[2,1,'L'],[0,1,'L'],[5,5,'L'],[4,5,'L']] },
  { size: 6, arrows: [[3,4,'R'],[1,3,'U'],[2,3,'L'],[2,5,'U'],[1,4,'U'],[5,5,'L'],[3,5,'D'],[4,0,'D'],[1,0,'R'],[2,4,'U']] },
  { size: 6, arrows: [[4,4,'L'],[2,1,'U'],[5,0,'D'],[0,0,'U'],[2,3,'U'],[1,5,'U'],[1,1,'R'],[3,4,'D'],[4,3,'L'],[3,5,'D'],[2,0,'R'],[1,3,'L']] },
  { size: 6, arrows: [[2,5,'D'],[4,0,'L'],[3,3,'L'],[0,2,'R'],[0,3,'U'],[4,1,'D'],[4,5,'L'],[1,4,'R'],[5,1,'D'],[2,0,'L'],[3,4,'U'],[1,1,'R'],[0,1,'L'],[1,2,'U']] },
  { size: 7, arrows: [[1,0,'U'],[4,1,'L'],[5,1,'L'],[4,6,'U'],[6,0,'R'],[5,0,'R'],[2,1,'U'],[6,5,'U'],[1,3,'U'],[5,6,'D'],[2,6,'R'],[0,2,'L'],[6,4,'U'],[1,2,'U'],[3,3,'L'],[1,5,'L']] }
];

/** Converts raw level data into arrow objects with unique ids. */
function createArrows(level) {
  return level.arrows.map(([x, y, dir], i) => ({ id: 'a' + i, x, y, dir }));
}

/**
 * Returns the NEAREST arrow standing in `arrow`'s path to the board edge,
 * or null if the path is clear. Only active arrows are passed in, so
 * exited arrows never block anything.
 */
function getBlockingArrow(arrow, activeArrows, size) {
  const d = DIRS[arrow.dir];
  let best = null, bestDist = Infinity;
  for (const other of activeArrows) {
    if (other.id === arrow.id) continue;
    // Distance along the direction of travel; the other arrow must also share the row/column.
    const dist = (other.x - arrow.x) * d.x + (other.y - arrow.y) * d.y;
    const sameLine = d.x !== 0 ? other.y === arrow.y : other.x === arrow.x;
    if (sameLine && dist > 0 && dist < bestDist) { best = other; bestDist = dist; }
  }
  return best;
}

const isArrowBlocked = (arrow, active, size) => getBlockingArrow(arrow, active, size) !== null;
const findFreeArrow = (active, size) => active.find(a => !isArrowBlocked(a, active, size)) || null;
const isVictory = active => active.length === 0;

/** Cells the arrow travels to leave the board (used for the exit animation). */
function cellsToEdge(arrow, size) {
  switch (arrow.dir) {
    case 'U': return arrow.y + 1;
    case 'D': return size - arrow.y;
    case 'L': return arrow.x + 1;
    default: return size - arrow.x;
  }
}

/**
 * Simulates solving. Removing an arrow can never block another, so greedily
 * removing any free arrow solves the level iff it is solvable.
 */
function isSolvable(level) {
  let active = createArrows(level);
  while (active.length) {
    const free = findFreeArrow(active, level.size);
    if (!free) return false;
    active = active.filter(a => a.id !== free.id);
  }
  return true;
}

/** Returns an error string, or '' if the level is valid and solvable. */
function validateLevel(level) {
  if (!level || !Number.isInteger(level.size) || level.size < 3 || level.size > 12) return 'bad size';
  if (!Array.isArray(level.arrows) || level.arrows.length === 0) return 'no arrows';
  const seen = new Set();
  for (const a of level.arrows) {
    if (!Array.isArray(a) || a.length !== 3) return 'bad arrow';
    const [x, y, dir] = a;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= level.size || y >= level.size) return 'out of bounds';
    if (!DIRS[dir]) return 'bad direction';
    if (seen.has(x + ',' + y)) return 'overlap';
    seen.add(x + ',' + y);
  }
  return isSolvable(level) ? '' : 'unsolvable';
}

/* ---------- SAVE DATA ---------- */
const SAVE_KEY = 'nexaArrows.v1';
const defaultSave = () => ({ unlocked: 0, completed: [], best: {}, sound: true });

/** Loads progress; any missing/corrupt field falls back to a safe default. */
function sanitizeSave(raw, levelCount) {
  const s = defaultSave();
  if (!raw || typeof raw !== 'object') return s;
  if (Number.isInteger(raw.unlocked)) s.unlocked = Math.min(Math.max(raw.unlocked, 0), levelCount - 1);
  if (Array.isArray(raw.completed)) s.completed = [...new Set(raw.completed.filter(n => Number.isInteger(n) && n >= 0 && n < levelCount))];
  if (raw.best && typeof raw.best === 'object') {
    for (const k of Object.keys(raw.best)) {
      const n = Number(k), v = raw.best[k];
      if (Number.isInteger(n) && n >= 0 && n < levelCount && Number.isInteger(v) && v > 0) s.best[n] = v;
    }
  }
  if (typeof raw.sound === 'boolean') s.sound = raw.sound;
  return s;
}
function loadSave() {
  try { return sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY)), LEVELS.length); }
  catch (e) { return defaultSave(); }
}
function writeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable: play on */ }
}

if (typeof module !== 'undefined') {
  module.exports = { LEVELS, DIRS, createArrows, getBlockingArrow, findFreeArrow, isSolvable, validateLevel, sanitizeSave, cellsToEdge, isVictory };
}

/* ---------- UI ---------- */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EXIT_MS = reduceMotion ? 20 : 450;
  const HINT_COOLDOWN_MS = 4000;
  const ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5M5 11l7-7 7 7"/></svg>';

  const save = loadSave();
  const state = { levelIndex: 0, active: [], moves: 0, locked: false, paused: false, hintReadyAt: 0 };
  const timers = new Set(); // pending timeouts, cleared when leaving a level
  let audioCtx = null;

  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  // Refuse to ship broken levels: skip any that fail validation.
  const playable = LEVELS.map(validateLevel);
  playable.forEach((err, i) => { if (err) console.error('Level ' + (i + 1) + ' invalid: ' + err); });

  /* Screens */
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  }

  /* Sound (Web Audio, created only after a user gesture) */
  function beep(freq, dur, type, vol) {
    if (!save.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio is optional */ }
  }
  const sfx = {
    exit: () => { beep(520, .12); later(() => beep(780, .14), 70); },
    blocked: () => beep(150, .18, 'square', .06),
    win: () => [523, 659, 784, 1046].forEach((f, i) => later(() => beep(f, .25), i * 120)),
    tap: () => beep(380, .05, 'sine', .04)
  };
  function refreshSoundUi() {
    const label = 'Sound: ' + (save.sound ? 'on' : 'off');
    $('btn-menu-sound').textContent = label;
    $('btn-pause-sound').textContent = label;
    $('btn-sound').classList.toggle('off', !save.sound);
  }
  function toggleSound() { save.sound = !save.sound; writeSave(save); refreshSoundUi(); sfx.tap(); }

  /* Rendering (reads state; never decides collisions) */
  function renderBoard() {
    const board = $('board');
    board.replaceChildren();
    const size = LEVELS[state.levelIndex].size, pct = 100 / size;
    for (const arrow of state.active) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.dataset.id = arrow.id;
      tile.setAttribute('aria-label', 'Arrow ' + ({ U: 'up', D: 'down', L: 'left', R: 'right' })[arrow.dir] + ', column ' + (arrow.x + 1) + ', row ' + (arrow.y + 1));
      Object.assign(tile.style, { left: arrow.x * pct + '%', top: arrow.y * pct + '%', width: pct + '%', height: pct + '%' });
      const face = document.createElement('span');
      face.className = 'face dir-' + arrow.dir;
      face.innerHTML = ARROW_SVG; // constant string, no user data
      tile.appendChild(face);
      board.appendChild(tile);
    }
    updateHud();
  }
  function updateHud() {
    $('hud-level').textContent = state.levelIndex + 1;
    $('hud-left').textContent = state.active.length;
    $('hud-moves').textContent = state.moves;
  }
  const setMessage = text => { $('message').textContent = text; };
  const tileFor = id => $('board').querySelector('[data-id="' + id + '"]');

  /* Level flow */
  function startLevel(index) {
    clearTimers();
    if (index < 0 || index >= LEVELS.length || playable[index]) return;
    state.levelIndex = index;
    state.active = createArrows(LEVELS[index]); // fresh copy = exact original layout
    state.moves = 0; state.locked = false; state.paused = false; state.hintReadyAt = 0;
    $('pause').hidden = true;
    renderBoard();
    setMessage(LEVELS[index].hint || 'Tap an arrow to send it off the board.');
    showScreen('game');
  }

  function tryRemove(arrow) {
    const size = LEVELS[state.levelIndex].size;
    const tile = tileFor(arrow.id);
    if (!tile) return;
    const blocker = getBlockingArrow(arrow, state.active, size);
    if (blocker) {
      sfx.blocked();
      setMessage('Blocked by another arrow in its path.');
      const blockerTile = tileFor(blocker.id);
      tile.classList.remove('blocked'); void tile.offsetWidth; tile.classList.add('blocked');
      if (blockerTile) blockerTile.classList.add('blocker');
      state.locked = true; // short lock keeps feedback clean
      later(() => { tile.classList.remove('blocked'); if (blockerTile) blockerTile.classList.remove('blocker'); state.locked = false; }, 380);
      return;
    }
    // Clear path: lock input, update state first, then animate the exit.
    state.locked = true;
    state.moves += 1;
    state.active = state.active.filter(a => a.id !== arrow.id);
    const d = DIRS[arrow.dir], n = cellsToEdge(arrow, size);
    tile.style.setProperty('--dx', d.x * n); tile.style.setProperty('--dy', d.y * n);
    tile.classList.remove('hint');
    tile.classList.add('exit');
    sfx.exit();
    setMessage('');
    updateHud();
    later(() => {
      tile.remove();
      if (isVictory(state.active)) completeLevel(); else state.locked = false;
    }, EXIT_MS);
  }

  function completeLevel() {
    const i = state.levelIndex;
    if (!save.completed.includes(i)) save.completed.push(i);
    if (i + 1 < LEVELS.length) save.unlocked = Math.max(save.unlocked, i + 1);
    const isBest = !save.best[i] || state.moves < save.best[i];
    if (isBest) save.best[i] = state.moves;
    writeSave(save);
    sfx.win();
    later(() => {
      if (i + 1 >= LEVELS.length) { showScreen('done'); return; }
      $('complete-info').textContent = 'Moves: ' + state.moves + ' · Best: ' + save.best[i];
      showScreen('complete');
    }, reduceMotion ? 50 : 500);
  }

  function useHint() {
    const now = Date.now();
    if (state.locked || state.paused) return;
    if (now < state.hintReadyAt) { setMessage('Hint ready in ' + Math.ceil((state.hintReadyAt - now) / 1000) + 's'); return; }
    const free = findFreeArrow(state.active, LEVELS[state.levelIndex].size);
    const tile = free && tileFor(free.id);
    if (!tile) return;
    state.hintReadyAt = now + HINT_COOLDOWN_MS;
    tile.classList.add('hint');
    setMessage('This arrow can leave right now.');
    later(() => tile.classList.remove('hint'), 2200);
    sfx.tap();
  }

  /* Level select */
  function buildLevelGrid() {
    const grid = $('level-grid');
    grid.replaceChildren();
    LEVELS.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (save.completed.includes(i) ? ' done' : '');
      b.textContent = i + 1;
      b.disabled = i > save.unlocked || !!playable[i];
      b.addEventListener('click', () => { sfx.tap(); startLevel(i); });
      grid.appendChild(b);
    });
  }
  const openLevels = () => { buildLevelGrid(); showScreen('levels'); };

  function setPaused(on) {
    state.paused = on;
    $('pause').hidden = !on;
    if (on) $('btn-resume').focus();
  }

  function resetProgress() {
    if (!window.confirm('Reset all saved progress? This cannot be undone.')) return;
    Object.assign(save, defaultSave());
    writeSave(save);
    refreshSoundUi();
    setPaused(false);
    showScreen('menu');
  }

  /* Wiring */
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', e => { sfx.tap(); fn(e); }); };
  on('btn-play', () => startLevel(Math.min(save.unlocked, LEVELS.length - 1)));
  on('btn-levels', openLevels);
  on('btn-levels-back', () => showScreen('menu'));
  on('btn-menu-sound', toggleSound);
  on('btn-sound', toggleSound);
  on('btn-pause-sound', toggleSound);
  on('btn-hint', useHint);
  on('btn-restart', () => startLevel(state.levelIndex));
  on('btn-pause', () => setPaused(true));
  on('btn-resume', () => setPaused(false));
  on('btn-pause-menu', () => { clearTimers(); setPaused(false); showScreen('menu'); });
  on('btn-reset', resetProgress);
  on('btn-next', () => startLevel(state.levelIndex + 1));
  on('btn-replay', () => startLevel(state.levelIndex));
  on('btn-complete-menu', () => showScreen('menu'));
  on('btn-done-levels', openLevels);
  on('btn-done-menu', () => showScreen('menu'));

  // One delegated click handler (covers mouse, touch and keyboard Enter/Space without double firing).
  $('board').addEventListener('click', e => {
    const tile = e.target.closest('.tile');
    if (!tile || state.locked || state.paused) return;
    const arrow = state.active.find(a => a.id === tile.dataset.id);
    if (arrow) tryRemove(arrow);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('screen-game').classList.contains('active')) setPaused(!state.paused);
  });

  refreshSoundUi();
})();
