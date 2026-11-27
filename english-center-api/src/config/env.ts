export const nodeEnv = process.env.NODE_ENV ?? 'development';
export const host = process.env.HOST ?? '127.0.0.1';
export const port = Number(process.env.PORT ?? 3000);
export const databaseUrl = process.env.DATABASE_URL ?? '';
export const redisUrl = process.env.REDIS_URL ?? '';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535');
}
