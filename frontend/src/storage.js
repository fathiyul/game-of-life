// Persistence layer for user-created brushes and drafts.
//
// This version talks to a small backend (see ../../backend) that stores
// everything in a SQLite database (data/game-of-life.sqlite). The public API is
// async (returns Promises).
//
// Format: a pattern is exchanged as `rows` — an array of 'O'/'.' strings, which
// encodes width and height implicitly and reuses the existing plaintext parser.

import { parsePlaintext } from './patterns.js';

const API = '/api';

// --- pure helpers (no I/O) -------------------------------------------------

export function matrixToRows(matrix) {
  return matrix.map((row) => row.map((c) => (c ? 'O' : '.')).join(''));
}

export function rowsToMatrix(rows) {
  return parsePlaintext(rows);
}

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

export function gridToMatrix(game) {
  const m = [];
  for (let y = 0; y < game.rows; y++) {
    const row = [];
    for (let x = 0; x < game.cols; x++) row.push(game.get(x, y));
    m.push(row);
  }
  return m;
}

export function stampMatrixTopLeft(game, matrix) {
  game.clear();
  for (let y = 0; y < matrix.length && y < game.rows; y++) {
    for (let x = 0; x < matrix[0].length && x < game.cols; x++) {
      if (matrix[y][x]) game.set(x, y, 1);
    }
  }
}

// --- backend access --------------------------------------------------------

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}`);
  return res.json();
}

async function del(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${url} -> ${res.status}`);
}

// brushes (finished organisms; shown in the main gallery)
export function getBrushes() {
  return getJSON(`${API}/brushes`);
}
export function addBrush(name, matrix) {
  return postJSON(`${API}/brushes`, { name, rows: matrixToRows(matrix) });
}
export function deleteBrush(id) {
  return del(`${API}/brushes/${encodeURIComponent(id)}`);
}

// drafts (in-progress snapshots; revisitable in the editor)
export function getDrafts() {
  return getJSON(`${API}/drafts`);
}
export function addDraft(name, matrix) {
  return postJSON(`${API}/drafts`, { name, rows: matrixToRows(matrix) });
}
export function deleteDraft(id) {
  return del(`${API}/drafts/${encodeURIComponent(id)}`);
}
