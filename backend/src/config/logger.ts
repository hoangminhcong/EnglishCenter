import pino from 'pino';
import { nodeEnv } from './env.js';

export const logger = pino({
  level: nodeEnv === 'test' ? 'silent' : 'info',
});
