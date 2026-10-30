import { buildApp } from './app';
import { config } from './config/env';
import { closeMongo } from './utils/mongoConnection';

const app = buildApp();
let shutdownStarted = false;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;
  console.log(`[server] shutdown requested | context(signal=${signal})`);
  let failed = false;

  try {
    await app.close();
  } catch (error: unknown) {
    failed = true;
    console.error(`[server] shutdown failed | context(error=${errorName(error)})`);
  }

  try {
    await closeMongo();
  } catch (error: unknown) {
    failed = true;
    console.error(`[Mongo] shutdown failed | context(error=${errorName(error)})`);
  }

  if (failed) {
    process.exitCode = 1;
  }
}

async function start(): Promise<void> {
  if (!config.mongoUri) {
    console.warn(
      '[Mongo] MONGODB_URI is not configured | context(databaseFeatures=unavailable)',
    );
  }

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`[server] listening | context(port=${config.port})`);
  } catch (error: unknown) {
    console.error(`[server] startup failed | context(error=${errorName(error)})`);
    process.exitCode = 1;
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void start();