// Conway's Game of Life
// Each cell is alive (1) or dead (0). Rules applied each tick:
//  - Live cell with 2 or 3 neighbors survives.
//  - Dead cell with exactly 3 neighbors becomes alive.
//  - All others die / stay dead.

const CELL_SIZE = 8;            // pixels per cell
let COLS = 0;
let ROWS = 0;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let grid;          // current state (Int8Array)
let next;          // next state (Int8Array)
let generation = 0;
let running = true;
let speed = 10;    // generations per second
let lastTick = 0;

const genLabel = document.getElementById('generation');

function resize() {
  // Fit canvas to the window while keeping cells square.
  COLS = Math.floor(window.innerWidth / CELL_SIZE);
  ROWS = Math.floor((window.innerHeight - 80) / CELL_SIZE); // leave room for controls
  canvas.width = COLS * CELL_SIZE;
  canvas.height = ROWS * CELL_SIZE;
  grid = new Int8Array(COLS * ROWS);
  next = new Int8Array(COLS * ROWS);
  randomize();
}

function idx(x, y) {
  return y * COLS + x;
}

function randomize() {
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() < 0.25 ? 1 : 0;
  }
  generation = 0;
}

function clear() {
  grid.fill(0);
  generation = 0;
}

function step() {
  // Compute next generation with toroidal (wrap-around) edges.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + COLS) % COLS;
          const ny = (y + dy + ROWS) % ROWS;
          n += grid[idx(nx, ny)];
        }
      }
      const alive = grid[idx(x, y)];
      next[idx(x, y)] = alive === 1 ? (n === 2 || n === 3 ? 1 : 0)
                                    : (n === 3 ? 1 : 0);
    }
  }
  // Swap buffers.
  const tmp = grid;
  grid = next;
  next = tmp;
  generation++;
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#00e0ff';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[idx(x, y)] === 1) {
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }
  }
  genLabel.textContent = 'Gen: ' + generation;
}

function loop(now) {
  // Throttle updates based on speed (ticks per second).
  const interval = 1000 / speed;
  if (running && now - lastTick >= interval) {
    step();
    lastTick = now;
  }
  draw();
  requestAnimationFrame(loop);
}

// --- Controls ---------------------------------------------------------------
document.getElementById('play').addEventListener('click', (e) => {
  running = !running;
  e.target.textContent = running ? 'Pause' : 'Play';
});

document.getElementById('randomize').addEventListener('click', randomize);

document.getElementById('clear').addEventListener('click', clear);

document.getElementById('speed').addEventListener('input', (e) => {
  speed = parseInt(e.target.value, 10);
});

// Click / drag to toggle cells.
let painting = false;
let paintValue = 1;

function paint(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
  if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
    grid[idx(x, y)] = paintValue;
  }
}

canvas.addEventListener('mousedown', (e) => {
  painting = true;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
  paintValue = grid[idx(x, y)] === 1 ? 0 : 1; // toggle based on clicked cell
  paint(e);
});
canvas.addEventListener('mousemove', (e) => { if (painting) paint(e); });
window.addEventListener('mouseup', () => { painting = false; });

window.addEventListener('resize', resize);

// --- Start ------------------------------------------------------------------
resize();
requestAnimationFrame(loop);
