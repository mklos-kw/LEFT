import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app';
import { loadConfig, MIN_SECRET_LENGTH } from './config';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const envFile = `${repoRoot}.env`;
const webDist = `${repoRoot}packages/web/dist`;

if (existsSync(envFile)) process.loadEnvFile(envFile);

const config = loadConfig();
// In development Vite serves the web app and proxies /api and /auth here.
const serveWeb = process.env.NODE_ENV === 'production' && existsSync(webDist);
const app = await buildApp(config, { staticDir: serveWeb ? webDist : undefined });
if (!config.demo && config.sessionSecret.length < MIN_SECRET_LENGTH) {
  app.log.warn(
    `SESSION_SECRET is shorter than ${MIN_SECRET_LENGTH} characters; generate one with: openssl rand -hex 32`,
  );
}

await app.listen({ port: config.port, host: process.env.HOST ?? '127.0.0.1' });
