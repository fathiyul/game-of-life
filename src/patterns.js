// Pattern definitions for Conway's Game of Life.
//
// Two input formats are supported:
//   - rows: plaintext using 'O' (or '#') for live cells, any other char dead.
//   - rle:  the standard run-length encoding from LifeWiki, e.g. "3o$obo!".
//
// Both are parsed into a normalized 2D matrix of 0/1 numbers at load time.

// --- Parsers ---------------------------------------------------------------

export function parsePlaintext(rows) {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length), 1);
  const grid = [];
  for (let y = 0; y < height; y++) {
    const line = rows[y] || '';
    const row = [];
    for (let x = 0; x < width; x++) {
      const ch = line[x] || '.';
      row.push(ch === 'O' || ch === '#' ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

export function parseRLE(rle) {
  const lines = rle.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  // Drop comments (#) and the dimension header (x = .., y = ..).
  const body = lines
    .filter((l) => !l.startsWith('#') && !l.startsWith('x'))
    .join('');

  const grid = [];
  let row = [];
  let count = 0;

  const flushRow = () => {
    if (row.length > 0) grid.push(row);
    row = [];
  };

  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      count = count * 10 + (ch.charCodeAt(0) - 48);
    } else if (ch === 'b' || ch === '.') {
      const n = count || 1;
      for (let i = 0; i < n; i++) row.push(0);
      count = 0;
    } else if (ch === 'o' || ch === 'O' || ch === 'A') {
      const n = count || 1;
      for (let i = 0; i < n; i++) row.push(1);
      count = 0;
    } else if (ch === '$') {
      const n = count || 1;
      flushRow();
      for (let i = 1; i < n; i++) grid.push([]); // blank rows
      count = 0;
    } else if (ch === '!') {
      flushRow();
      break;
    }
  }

  // Pad every row to the same width so the matrix is rectangular.
  const width = Math.max(...grid.map((r) => r.length), 1);
  return grid.map((r) => {
    while (r.length < width) r.push(0);
    return r;
  });
}

// Rotate a cell matrix 90 degrees clockwise.
export function rotateCW(matrix) {
  const h = matrix.length;
  const w = matrix[0].length;
  const out = [];
  for (let x = 0; x < w; x++) {
    const row = [];
    for (let y = h - 1; y >= 0; y--) {
      row.push(matrix[y][x]);
    }
    out.push(row);
  }
  return out;
}

// --- Pattern catalog -------------------------------------------------------

const RAW_PATTERNS = [
  // The default "single cell" brush.
  {
    key: 'cell',
    name: 'Single Cell',
    category: 'Brush',
    rows: ['O'],
  },

  // --- Still lifes (period 1: never change) ---
  {
    key: 'block',
    name: 'Block',
    category: 'Still Life',
    rows: ['OO', 'OO'],
  },
  {
    key: 'beehive',
    name: 'Beehive',
    category: 'Still Life',
    rows: ['.OO.', 'O..O', '.OO.'],
  },
  {
    key: 'loaf',
    name: 'Loaf',
    category: 'Still Life',
    rows: ['.OO.', 'O..O', '.O.O', '..O.'],
  },
  {
    key: 'boat',
    name: 'Boat',
    category: 'Still Life',
    rows: ['OO.', 'O.O', '.O.'],
  },

  // --- Oscillators (return to themselves every N generations) ---
  {
    key: 'blinker',
    name: 'Blinker',
    category: 'Oscillator',
    rows: ['OOO'],
  },
  {
    key: 'toad',
    name: 'Toad',
    category: 'Oscillator',
    rows: ['.OOO', 'OOO.'],
  },
  {
    key: 'beacon',
    name: 'Beacon',
    category: 'Oscillator',
    rows: ['OO..', 'OO..', '..OO', '..OO'],
  },
  {
    key: 'pulsar',
    name: 'Pulsar',
    category: 'Oscillator',
    rows: [
      '..OOO...OOO..',
      '.............',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '..OOO...OOO..',
      '.............',
      '..OOO...OOO..',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '.............',
      '..OOO...OOO..',
    ],
  },
  {
    key: 'pentadecathlon',
    name: 'Pentadecathlon',
    category: 'Oscillator',
    rows: ['..O....O..', 'OO.OOOO.OO', '..O....O..'],
  },

  // --- Spaceships (translate across the grid) ---
  {
    key: 'glider',
    name: 'Glider',
    category: 'Spaceship',
    rows: ['.O.', '..O', 'OOO'],
  },
  {
    key: 'lwss',
    name: 'Lightweight Spaceship',
    category: 'Spaceship',
    rows: ['.O..O', 'O....', 'O...O', 'OOOO.'],
  },

  // --- Guns (emit an endless stream of spaceships) ---
  {
    key: 'gosper-gun',
    name: 'Gosper Glider Gun',
    category: 'Gun',
    rle:
      '24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo2b2o12b2o$' +
      '2o8bo5bo2b2o$2o8bo3bob2o3bobo$10bo5bo5bo$11bo3bo7b$12b2o!',
  },

  // --- Methuselahs (tiny seeds that evolve chaotically for a long time) ---
  {
    key: 'r-pentomino',
    name: 'R-pentomino',
    category: 'Methuselah',
    rows: ['.OO', 'OO.', '.O.'],
  },
  {
    key: 'acorn',
    name: 'Acorn',
    category: 'Methuselah',
    rows: ['.O.....', '...O...', 'OO..OOO'],
  },
];

// Precompute the cell matrix for each pattern.
export const PATTERNS = RAW_PATTERNS.map((p) => ({
  ...p,
  matrix: p.rle ? parseRLE(p.rle) : parsePlaintext(p.rows),
}));

export const PATTERN_MAP = Object.fromEntries(
  PATTERNS.map((p) => [p.key, p]),
);

// Category display order.
export const CATEGORIES = ['Brush', 'Still Life', 'Oscillator', 'Spaceship', 'Gun', 'Methuselah'];
