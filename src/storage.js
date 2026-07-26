// Persistence layer for user-created brushes and drafts.
//
// Storage choice: the browser's localStorage. For this app the data is tiny
// (each brush is at most a few KB of 0/1 cells), so localStorage is simpler,
// faster, and dependency-free compared to running a SQLite backend. The public
// API here is isolated so the backing store could be swapped later (e.g. for a
// server-backed SQLite DB) without touching the UI.
//
// Format: a pattern is stored as `rows` — an array of 'O'/'.' strings, which
// encodes width and height implicitly and reuses the existing plaintext parser.

import { parsePlaintext } from './patterns.js';

const BRUSHES_KEY = 'gol:brushes';
const DRAFTS_KEY = 'gol:drafts';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- format helpers --------------------------------------------------------

// 2D 0/1 matrix  ->  array of 'O'/'.' strings (width & height are implicit).
export function matrixToRows(matrix) {
  return matrix.map((row) => row.map((c) => (c ? 'O' : '.')).join(''));
}

// array of 'O'/'.' strings -> 2D 0/1 matrix (rectangular).
export function rowsToMatrix(rows) {
  return parsePlaintext(rows);
}

// Crop a matrix to the bounding box of its live cells. Returns null if empty.
export function cropToBoundingBox(matrix) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[0].length; x++) {
      if (matrix[y][x]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // no live cells
  const out = [];
  for (let y = minY; y <= maxY; y++) {
    const row = [];
    for (let x = minX; x <= maxX; x++) row.push(matrix[y][x]);
    out.push(row);
  }
  return out;
}

// Snapshot the whole grid as a matrix.
export function gridToMatrix(game) {
  const m = [];
  for (let y = 0; y < game.rows; y++) {
    const row = [];
    for (let x = 0; x < game.cols; x++) row.push(game.get(x, y));
    m.push(row);
  }
  return m;
}

// Write a matrix into the grid at the top-left corner (clears first, clips).
export function stampMatrixTopLeft(game, matrix) {
  game.clear();
  for (let y = 0; y < matrix.length && y < game.rows; y++) {
    for (let x = 0; x < matrix[0].length && x < game.cols; x++) {
      if (matrix[y][x]) game.set(x, y, 1);
    }
  }
}

// --- brushes (finished organisms; shown in the main gallery) ---------------

export function getBrushes() {
  return readJSON(BRUSHES_KEY, []);
}

export function addBrush(name, matrix) {
  const brushes = getBrushes();
  const brush = {
    id: uid(),
    name: name || 'Untitled',
    rows: matrixToRows(matrix),
    createdAt: Date.now(),
  };
  brushes.push(brush);
  writeJSON(BRUSHES_KEY, brushes);
  return brush;
}

export function deleteBrush(id) {
  writeJSON(BRUSHES_KEY, getBrushes().filter((b) => b.id !== id));
}

// --- drafts (in-progress snapshots; revisitable in the editor) -------------

export function getDrafts() {
  return readJSON(DRAFTS_KEY, []);
}

export function addDraft(name, matrix) {
  const drafts = getDrafts();
  const draft = {
    id: uid(),
    name: name || 'Untitled',
    rows: matrixToRows(matrix),
    createdAt: Date.now(),
  };
  drafts.push(draft);
  writeJSON(DRAFTS_KEY, drafts);
  return draft;
}

export function deleteDraft(id) {
  writeJSON(DRAFTS_KEY, getDrafts().filter((d) => d.id !== id));
}
