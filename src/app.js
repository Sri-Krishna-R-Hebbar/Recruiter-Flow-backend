// Builds the Express app around a given db handle (so tests can inject an in-memory DB).
const express = require('express');
const ingestRouter = require('./routes/ingest');
const matchesRouter = require('./routes/matches');
const { ValidationError } = require('./validation');

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(ingestRouter(db));
  app.use(matchesRouter(db));

  app.use((_req, res) => res.status(404).json({ error: 'route not found' }));

  // Error handler: bad payloads -> 400, bad JSON -> 400, anything else -> 500.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON body' });
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
