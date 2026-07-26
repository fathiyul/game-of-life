// HTTP server. Serves the frontend statically and exposes a small JSON API for
// brushes and drafts, both backed by SQLite (see db.js).
//
// Run with: npm start   (then open http://localhost:3000)

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './db.js'; // initializes the database + schema
import { itemRouter } from './routes/items.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

const app = express();
app.use(express.json());

// API (must be registered before static so /api/* never clashes with files).
app.use('/api/brushes', itemRouter('brushes'));
app.use('/api/drafts', itemRouter('drafts'));

// Static frontend (index.html, create.html, css/, src/).
app.use(express.static(FRONTEND_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Conway's Game of Life running at http://localhost:${PORT}`);
});
