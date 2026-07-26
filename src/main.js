// Entry point. Wires the simulation, renderer, pattern gallery, and input.

import { GameOfLife } from './game.js';
import { Renderer, drawPatternIcon } from './renderer.js';
import { PATTERNS, PATTERN_MAP, CATEGORIES, rotateCW } from './patterns.js';

const CELL_SIZE = 8;

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas, null, CELL_SIZE);
let game = new GameOfLife(1, 1);

// --- Brush state -----------------------------------------------------------
let brushKey = 'cell';
let brushMatrix = PATTERN_MAP['cell'].matrix;
let hoverCell = null;        // { x, y } of the cell under the cursor, or null
let painting = false;
let paintValue = 1;          // used only by the single-cell brush
let lastStampCell = null;    // avoid stamping a pattern twice on the same cell

// --- Simulation state ------------------------------------------------------
let running = true;
let speed = 10;              // generations per second
let lastTick = 0;

const genLabel = document.getElementById('generation');
const brushLabel = document.getElementById('brush-name');

// --- Layout ----------------------------------------------------------------

function fitCanvas() {
  const cellSize = renderer.cellSize;
  const cols = Math.max(1, Math.floor(window.innerWidth / cellSize));
  const rows = Math.max(1, Math.floor(window.innerHeight / cellSize));
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  game.resize(cols, rows);
}

// --- Gallery UI ------------------------------------------------------------

function buildGallery() {
  const root = document.getElementById('gallery');
  root.innerHTML = '';

  for (const category of CATEGORIES) {
    const items = PATTERNS.filter((p) => p.category === category);
    if (items.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'gallery-section';

    const heading = document.createElement('h3');
    heading.textContent = category;
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'gallery-grid';

    for (const p of items) {
      const btn = document.createElement('button');
      btn.className = 'pattern-btn';
      btn.dataset.key = p.key;
      btn.title = p.name;

      const icon = document.createElement('canvas');
      icon.width = 40;
      icon.height = 40;
      drawPatternIcon(icon, p.matrix);
      btn.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = p.name;
      btn.appendChild(label);

      btn.addEventListener('click', () => selectBrush(p.key));
      grid.appendChild(btn);
    }

    section.appendChild(grid);
    root.appendChild(section);
  }

  refreshSelection();
}

function selectBrush(key) {
  brushKey = key;
  brushMatrix = PATTERN_MAP[key].matrix;
  lastStampCell = null;
  refreshSelection();
  updateBrushLabel();
}

function refreshSelection() {
  document.querySelectorAll('.pattern-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.key === brushKey);
  });
}

function updateBrushLabel() {
  const name = PATTERN_MAP[brushKey].name;
  brushLabel.textContent = `Brush: ${name}`;
}

function rotateBrush() {
  // Only meaningful for multi-cell brushes.
  if (brushKey === 'cell') return;
  brushMatrix = rotateCW(brushMatrix);
  updateBrushLabel(); // could show rotation; kept simple
}

// --- Input -----------------------------------------------------------------

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / renderer.cellSize);
  const y = Math.floor((e.clientY - rect.top) / renderer.cellSize);
  return { x, y };
}

function stampAt(cell) {
  if (brushKey === 'cell') {
    game.set(cell.x, cell.y, paintValue);
  } else {
    game.stamp(brushMatrix, cell.x, cell.y);
  }
}

canvas.addEventListener('mousedown', (e) => {
  const cell = cellFromEvent(e);
  if (cell.x < 0 || cell.x >= game.cols || cell.y < 0 || cell.y >= game.rows) return;
  painting = true;

  if (brushKey === 'cell') {
    // Toggle: paint opposite of the clicked cell.
    paintValue = game.get(cell.x, cell.y) === 1 ? 0 : 1;
  } else {
    lastStampCell = `${cell.x},${cell.y}`;
  }
  stampAt(cell);
});

canvas.addEventListener('mousemove', (e) => {
  const cell = cellFromEvent(e);
  if (cell.x < 0 || cell.x >= game.cols || cell.y < 0 || cell.y >= game.rows) {
    hoverCell = null;
    return;
  }
  hoverCell = cell;

  if (painting) {
    if (brushKey === 'cell') {
      stampAt(cell);
    } else {
      // Drop a stamp each time the cursor enters a fresh cell (nice for trails).
      const key = `${cell.x},${cell.y}`;
      if (key !== lastStampCell) {
        lastStampCell = key;
        stampAt(cell);
      }
    }
  }
});

canvas.addEventListener('mouseleave', () => {
  hoverCell = null;
});

window.addEventListener('mouseup', () => {
  painting = false;
  lastStampCell = null;
});

// Keyboard shortcuts.
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.key === 'r' || e.key === 'R') {
    rotateBrush();
  } else if (e.key === 'c' || e.key === 'C') {
    game.clear();
  }
});

// --- Controls --------------------------------------------------------------

const playBtn = document.getElementById('play');
function togglePlay() {
  running = !running;
  playBtn.textContent = running ? 'Pause' : 'Play';
}

playBtn.addEventListener('click', togglePlay);

document.getElementById('randomize').addEventListener('click', () => {
  game.randomize(0.25);
});

document.getElementById('clear').addEventListener('click', () => {
  game.clear();
});

document.getElementById('speed').addEventListener('input', (e) => {
  speed = parseInt(e.target.value, 10);
});

document.getElementById('rotate').addEventListener('click', rotateBrush);

// --- Render loop -----------------------------------------------------------

function loop(now) {
  const interval = 1000 / speed;
  if (running && now - lastTick >= interval) {
    game.step();
    lastTick = now;
  }

  const brush =
    hoverCell && brushMatrix ? { matrix: brushMatrix, x: hoverCell.x, y: hoverCell.y } : null;
  renderer.draw(brush);

  genLabel.textContent = `Generation: ${game.generation}`;
  requestAnimationFrame(loop);
}

// --- Boot ------------------------------------------------------------------

// Make the renderer aware of the (re)created game each resize.
function bindGame() {
  renderer.game = game;
}

function init() {
  fitCanvas();
  bindGame();
  buildGallery();
  updateBrushLabel();
  game.randomize(0.25);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  fitCanvas();
  bindGame();
});

init();
