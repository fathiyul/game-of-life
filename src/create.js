// "Create Brush" page: draw a pattern with single cells, evolve it, then save
// it as a reusable brush (cropped) or stash it as a revisitable draft.

import { GameOfLife } from './game.js';
import { Renderer } from './renderer.js';
import {
  gridToMatrix,
  stampMatrixTopLeft,
  cropToBoundingBox,
  rowsToMatrix,
  addBrush,
  addDraft,
  getBrushes,
  getDrafts,
  deleteDraft,
} from './storage.js';

// Bigger cells than the gallery page, to make freehand drawing easier.
const CELL_SIZE = 16;

const canvas = document.getElementById('game');
const game = new GameOfLife(1, 1);
const renderer = new Renderer(canvas, game, CELL_SIZE);

let running = false;
let speed = 10;
let lastTick = 0;

// Snapshot taken when animation starts, so we can revert to the initial drawing.
let initialMatrix = null;
let initialGen = 0;

let painting = false;
let paintValue = 1; // single-cell brush only

const genLabel = document.getElementById('generation');
const playBtn = document.getElementById('play');
const nameInput = document.getElementById('brush-name-input');
const draftsList = document.getElementById('drafts-list');

// --- layout ----------------------------------------------------------------

function fitCanvas() {
  const cols = Math.max(1, Math.floor(window.innerWidth / CELL_SIZE));
  const rows = Math.max(1, Math.floor(window.innerHeight / CELL_SIZE));
  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;
  game.resize(cols, rows);
}

// --- play / revert ---------------------------------------------------------

function setPlayLabel() {
  const word = running ? 'Pause' : 'Play';
  playBtn.innerHTML = `<span class="hk">${word[0]}</span>${word.slice(1)}`;
}

function togglePlay() {
  running = !running;
  if (running) {
    // Remember the board as it was right before it started evolving.
    initialMatrix = gridToMatrix(game);
    initialGen = game.generation;
    lastTick = 0;
  }
  setPlayLabel();
}

// Restore the state captured the last time Play was pressed.
function revert() {
  if (initialMatrix) {
    stampMatrixTopLeft(game, initialMatrix);
    game.generation = initialGen;
  } else {
    game.clear();
    game.generation = 0;
  }
  running = false;
  setPlayLabel();
}

// --- save actions ----------------------------------------------------------

function saveBrush() {
  const matrix = cropToBoundingBox(gridToMatrix(game));
  if (!matrix) {
    flash('Nothing to save — draw something first.');
    return;
  }
  const name = nameInput.value.trim() || `Brush ${getBrushes().length + 1}`;
  addBrush(name, matrix);
  flash(`Saved "${name}" — find it in the gallery.`);
}

function saveDraft() {
  const name = nameInput.value.trim() || `Draft ${getDrafts().length + 1}`;
  addDraft(name, gridToMatrix(game));
  renderDrafts();
  flash(`Saved draft "${name}".`);
}

// --- toast -----------------------------------------------------------------

function flash(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flash._t);
  flash._t = setTimeout(() => el.classList.remove('show'), 1800);
}

// --- drafts panel ----------------------------------------------------------

function renderDrafts() {
  draftsList.innerHTML = '';
  const drafts = [...getDrafts()].reverse(); // newest first
  if (drafts.length === 0) {
    draftsList.innerHTML = '<li class="muted">No drafts yet.</li>';
    return;
  }
  for (const d of drafts) {
    const li = document.createElement('li');

    const load = document.createElement('button');
    load.className = 'draft-name';
    load.textContent = d.name;
    load.title = 'Load this draft into the editor';
    load.addEventListener('click', () => {
      stampMatrixTopLeft(game, rowsToMatrix(d.rows));
      initialMatrix = gridToMatrix(game);
      initialGen = 0;
      game.generation = 0;
      running = false;
      setPlayLabel();
      flash(`Loaded draft "${d.name}".`);
    });

    const del = document.createElement('button');
    del.className = 'draft-del';
    del.textContent = '\u00d7';
    del.title = 'Delete draft';
    del.addEventListener('click', () => {
      deleteDraft(d.id);
      renderDrafts();
    });

    li.appendChild(load);
    li.appendChild(del);
    draftsList.appendChild(li);
  }
}

// --- input (single-cell toggle brush) --------------------------------------

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - rect.left) / CELL_SIZE),
    y: Math.floor((e.clientY - rect.top) / CELL_SIZE),
  };
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const c = cellFromEvent(e);
  if (c.x < 0 || c.x >= game.cols || c.y < 0 || c.y >= game.rows) return;
  painting = true;
  paintValue = game.get(c.x, c.y) === 1 ? 0 : 1;
  game.set(c.x, c.y, paintValue);
});

canvas.addEventListener('mousemove', (e) => {
  if (!painting) return;
  const c = cellFromEvent(e);
  if (c.x < 0 || c.x >= game.cols || c.y < 0 || c.y >= game.rows) return;
  game.set(c.x, c.y, paintValue);
});

window.addEventListener('mouseup', () => {
  painting = false;
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    togglePlay();
  } else if (e.key === 'r' || e.key === 'R') {
    revert();
  } else if (e.key === 'c' || e.key === 'C') {
    game.clear();
  }
});

// --- controls --------------------------------------------------------------

playBtn.addEventListener('click', togglePlay);
document.getElementById('revert').addEventListener('click', revert);
document.getElementById('clear').addEventListener('click', () => game.clear());
document.getElementById('save-brush').addEventListener('click', saveBrush);
document.getElementById('save-draft').addEventListener('click', saveDraft);
document.getElementById('speed').addEventListener('input', (e) => {
  speed = parseInt(e.target.value, 10);
});

// --- render loop -----------------------------------------------------------

function loop(now) {
  if (running && now - lastTick >= 1000 / speed) {
    game.step();
    lastTick = now;
  }
  renderer.draw();
  genLabel.textContent = `Generation: ${game.generation}`;
  requestAnimationFrame(loop);
}

// --- boot ------------------------------------------------------------------

window.addEventListener('resize', fitCanvas);
fitCanvas();
setPlayLabel();
renderDrafts();
requestAnimationFrame(loop);
