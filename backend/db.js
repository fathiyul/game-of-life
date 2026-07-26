// SQLite database layer. Opens (or creates) data/game-of-life.sqlite, ensures
// the schema exists, and exposes tiny CRUD helpers.
//
// The `rows` column stores the cell pattern as a JSON-encoded array of 'O'/'.'
// strings — the same format the frontend catalog uses, so width & height are
// implicit and no cell parsing happens server-side.

import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'game-of-life.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS brushes (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    rows       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS drafts (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    rows       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Precompiled statements per table.
const stmts = {
  brushes: {
    all: db.prepare('SELECT * FROM brushes ORDER BY created_at ASC'),
    insert: db.prepare(
      'INSERT INTO brushes (id, name, rows, created_at) VALUES (?, ?, ?, ?)'
    ),
    remove: db.prepare('DELETE FROM brushes WHERE id = ?'),
  },
  drafts: {
    all: db.prepare('SELECT * FROM drafts ORDER BY created_at ASC'),
    insert: db.prepare(
      'INSERT INTO drafts (id, name, rows, created_at) VALUES (?, ?, ?, ?)'
    ),
    remove: db.prepare('DELETE FROM drafts WHERE id = ?'),
  },
};

const deserialize = (row) => ({
  id: row.id,
  name: row.name,
  rows: JSON.parse(row.rows),
  createdAt: row.created_at,
});

// table: 'brushes' | 'drafts'
export function list(table) {
  return stmts[table].all.all().map(deserialize);
}

export function create(table, name, rows) {
  const id = randomUUID();
  const createdAt = Date.now();
  stmts[table].insert.run(id, name, JSON.stringify(rows), createdAt);
  return { id, name, rows, createdAt };
}

export function remove(table, id) {
  return stmts[table].remove.run(id);
}

export default db;
