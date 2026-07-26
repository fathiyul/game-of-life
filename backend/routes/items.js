// Builds an Express router for a generic "items" table (brushes or drafts).
// Routes:
//   GET    /        -> list all
//   POST   /        -> create one   (body: { name, rows })
//   DELETE /:id     -> delete one

import { Router } from 'express';
import { list, create, remove } from '../db.js';

export function itemRouter(table) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(list(table));
  });

  router.post('/', (req, res) => {
    const { name, rows } = req.body || {};
    if (typeof name !== 'string' || !Array.isArray(rows)) {
      return res
        .status(400)
        .json({ error: 'Body must include name (string) and rows (array).' });
    }
    res.status(201).json(create(table, name, rows));
  });

  router.delete('/:id', (req, res) => {
    remove(table, req.params.id);
    res.status(204).end();
  });

  return router;
}
