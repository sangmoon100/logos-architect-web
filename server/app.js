const { config } = require('./src/config/env');
const app = require('./src/app');
const { closeMongo } = require('./src/utils/mongoConnection');

if (!config.mongoUri) {
  console.warn('[Mongo] MONGODB_URI is not configured | context(databaseFeatures=unavailable)');
}

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[server] listening | context(port=${PORT})`);
});

let shutdownStarted = false;

function shutdown(signal) {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;
  console.log(`[server] shutdown requested | context(signal=${signal})`);

  server.close(async (error) => {
    if (error) {
      console.error(`[server] shutdown failed | context(error=${error.name})`);
      process.exitCode = 1;
    }

    try {
      await closeMongo();
    } catch (closeError) {
      const errorName = closeError instanceof Error ? closeError.name : 'UnknownError';
      console.error(`[Mongo] shutdown failed | context(error=${errorName})`);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
