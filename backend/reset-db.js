// Deletes the SQLite database files so the next server start creates a fresh,
// empty database. Cross-platform (no shell rm). Run with: npm run db:reset
//
// Intentionally an explicit command — do NOT wire this into a `predev` hook,
// or every `npm run dev` would wipe your brushes and drafts.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

const TARGETS = [
  'game-of-life.sqlite',
  'game-of-life.sqlite-wal',
  'game-of-life.sqlite-shm',
];

let removed = 0;
for (const name of TARGETS) {
  const file = path.join(DATA_DIR, name);
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    removed++;
    console.log(`removed ${path.relative(process.cwd(), file)}`);
  }
}

if (removed === 0) {
  console.log('No database files found — nothing to reset.');
} else {
  console.log(`Database reset (${removed} file(s) removed). A fresh one is created on next start.`);
}
