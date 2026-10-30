import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { requestLogger, log } from './logger.js';
import * as defaultEngine from '../../engine/index.js';
import { analyze, reassess, publicResult } from './pipeline.js';
import { validateAnalyze, validateReassess, validateExplain } from './validate.js';
import { aiStatus, aiConfig, explain } from './ai.js';
import { loadSamples } from './samples.js';

const DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));
export const DEV_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];

export function createApp({ serveClient = false, rateLimitPerMin = 60, engine = defaultEngine } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
        },
      },
      hsts: false, // plain http on loopback
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(requestLogger);
  app.use('/api', cors({ origin: DEV_ORIGINS, methods: ['GET', 'POST'] }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMin,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests — slow down a little.' },
    }),
  );
  app.use('/api', express.json({ limit: '20kb', strict: true }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', async (req, res) => {
    const ai = await aiStatus();
    res.json({ ok: true, engine: engine.engineName === 'p2' ? 'p2' : 'stub', ai, model: aiConfig().model });
  });

  app.get('/api/samples', (req, res) => {
    res.json(loadSamples());
  });

  app.post('/api/analyze', async (req, res, next) => {
    try {
      const { value, error } = validateAnalyze(req.body);
      if (error) return res.status(400).json({ error });
      const result = await analyze(value, { engine, aiAvailable: (await aiStatus()) === 'ready' });
      res.json(publicResult(result));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/reassess', async (req, res, next) => {
    try {
      const { value, error } = validateReassess(req.body);
      if (error) return res.status(400).json({ error });
      const result = await reassess(value, { engine, aiAvailable: (await aiStatus()) === 'ready' });
      res.json(publicResult(result));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/explain', async (req, res, next) => {
    try {
      const { value, error } = validateExplain(req.body);
      if (error) return res.status(400).json({ error });
      res.json(await explain(value));
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  if (serveClient && existsSync(DIST)) {
    app.use(express.static(DIST, { index: 'index.html', maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(DIST, 'index.html'));
    });
  }

  // Error handler: NEVER echo err.message (JSON parse errors contain the raw body).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err?.status || err?.statusCode || 500;
    const message =
      err?.type === 'entity.too.large' ? 'Message too large (max 20 KB).'
      : err?.type === 'entity.parse.failed' ? 'Body must be valid JSON.'
      : status < 500 ? 'Bad request.'
      : 'Something went wrong.';
    if (status >= 500) log(`error ${err?.name || 'Error'} on ${req.method} ${(req.originalUrl || '').split('?')[0]}`);
    res.status(status).json({ error: message });
  });

  return app;
}
