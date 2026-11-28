import express from 'express';
import { corsOrigins } from './config/env.js';
import { router } from './routes/index.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler.middleware.js';
import { requestIdMiddleware } from './shared/middlewares/request-id.middleware.js';

export const app = express();

app.use(requestIdMiddleware);

app.use((req, res, next) => {
  const origin = req.header('origin');
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-Id');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', router);
app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);
