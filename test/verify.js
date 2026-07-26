// Verifies that the pattern catalog actually behaves like Conway's Game of Life.
// Run with: npm run verify  (or: node test/verify.js)
//
// It checks:
//   - still lifes stay identical after one step
//   - oscillators return to their starting shape after their period
//   - spaceships reappear as a translated copy after one period
//   - the Gosper glider gun keeps producing new live cells over time

import { PATTERNS, PATTERN_MAP } from '../src/patterns.js';

let failures = 0;
const expect = (cond, label) => {
  if (cond) {
    console.log(`  \u2713 ${label}`);
  } else {
    console.error(`  \u2717 ${label}`);
    failures++;
  }
};

// Single non-toroidal generation step on a 2D number grid.
function stepGrid(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const next = grid.map((r) => r.slice());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) n += grid[ny][nx];
        }
      }
      const alive = grid[y][x];
      next[y][x] = alive ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
    }
  }
  return next;
}

const liveSet = (grid) => {
  const s = new Set();
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x]) s.add(x + ',' + y);
    }
  }
  return s;
};

function place(matrix, w, h, ox, oy) {
  const g = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[0].length; x++) {
      if (matrix[y][x]) g[oy + y][ox + x] = 1;
    }
  }
  return g;
}

// Is `matrix` unchanged after one step (i.e. a still life)?
function isStable(matrix) {
  const pad = 3;
  const W = matrix[0].length + pad * 2;
  const H = matrix.length + pad * 2;
  const g = place(matrix, W, H, pad, pad);
  return sameSet(liveSet(g), liveSet(stepGrid(g)));
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// Does it return to its original shape after `period` steps?
function isOscillator(matrix, period) {
  const pad = 6;
  const W = matrix[0].length + pad * 2;
  const H = matrix.length + pad * 2;
  let g = place(matrix, W, H, pad, pad);
  const s0 = liveSet(g);
  for (let i = 0; i < period; i++) g = stepGrid(g);
  return sameSet(s0, liveSet(g));
}

// After `period` steps, is the result a translated copy of the original?
function isSpaceship(matrix, period) {
  const mw = matrix[0].length;
  const mh = matrix.length;
  const pad = period + 4;
  const W = mw + pad * 2;
  const H = mh + pad * 2;
  let g = place(matrix, W, H, pad, pad);
  const s0 = liveSet(g);
  for (let i = 0; i < period; i++) g = stepGrid(g);
  const s1 = liveSet(g);
  for (const a of s0) {
    const [ax, ay] = a.split(',').map(Number);
    for (const b of s1) {
      const [bx, by] = b.split(',').map(Number);
      const dx = bx - ax;
      const dy = by - ay;
      if (dx === 0 && dy === 0) continue;
      let ok = true;
      for (const c of s0) {
        const [cx, cy] = c.split(',').map(Number);
        if (!s1.has(cx + dx + ',' + (cy + dy))) { ok = false; break; }
      }
      if (ok) return true;
    }
  }
  return false;
}

function populationAfter(matrix, steps, pad = 4) {
  const W = matrix[0].length + pad * 2;
  const H = matrix.length + pad * 2;
  let g = place(matrix, W, H, pad, pad);
  for (let i = 0; i < steps; i++) g = stepGrid(g);
  return g.flat().reduce((a, b) => a + b, 0);
}

// --- Run checks ------------------------------------------------------------

console.log('Still lifes (should not change):');
expect(isStable(PATTERN_MAP['block'].matrix), 'Block is stable');
expect(isStable(PATTERN_MAP['beehive'].matrix), 'Beehive is stable');
expect(isStable(PATTERN_MAP['loaf'].matrix), 'Loaf is stable');
expect(isStable(PATTERN_MAP['boat'].matrix), 'Boat is stable');

console.log('Oscillators (return to original after their period):');
expect(isOscillator(PATTERN_MAP['blinker'].matrix, 2), 'Blinker has period 2');
expect(isOscillator(PATTERN_MAP['toad'].matrix, 2), 'Toad has period 2');
expect(isOscillator(PATTERN_MAP['beacon'].matrix, 2), 'Beacon has period 2');
expect(isOscillator(PATTERN_MAP['pulsar'].matrix, 3), 'Pulsar has period 3');
expect(isOscillator(PATTERN_MAP['pentadecathlon'].matrix, 15), 'Pentadecathlon has period 15');

console.log('Spaceships (reappear translated after one period):');
expect(isSpaceship(PATTERN_MAP['glider'].matrix, 4), 'Glider translates in 4 steps');
expect(isSpaceship(PATTERN_MAP['lwss'].matrix, 4), 'LWSS translates in 4 steps');

console.log('Gosper glider gun (population should keep growing):');
{
  const gun = PATTERN_MAP['gosper-gun'].matrix;
  // Big padded grid so emitted gliders do not wrap back within 80 steps.
  const padded = padMatrix(gun, 60);
  let g = padded;
  const pop0 = g.flat().reduce((a, b) => a + b, 0);
  for (let i = 0; i < 80; i++) g = stepGrid(g);
  const pop80 = g.flat().reduce((a, b) => a + b, 0);
  expect(pop0 === 36, `Gun starts with 36 live cells (got ${pop0})`);
  expect(pop80 > pop0 + 10, `Gun emitted gliders over 80 gens (${pop0} -> ${pop80})`);
}

console.log('\nCatalog loaded ' + PATTERNS.length + ' patterns.');

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED.`);
  process.exit(1);
} else {
  console.log('\nAll pattern checks passed.');
}

function padMatrix(matrix, pad) {
  const w = matrix[0].length;
  const h = matrix.length;
  const W = w + pad * 2;
  const H = h + pad * 2;
  return place(matrix, W, H, pad, pad);
}
