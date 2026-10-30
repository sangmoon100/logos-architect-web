import type fastifyCors = require('@fastify/cors');

type AppEnvironment = 'dev' | 'qa' | 'prod';
type OriginFunction = fastifyCors.OriginFunction;

interface CorsConfig {
  appEnv: AppEnvironment;
  clientOrigin: string | null;
}

export function createOriginCallback({
  appEnv,
  clientOrigin,
}: CorsConfig): OriginFunction {
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (appEnv !== 'dev') {
      callback(null, origin === clientOrigin);
      return;
    }

    const match = /^http:\/\/(?:localhost|127\.0\.0\.1):(\d{1,5})$/.exec(origin);
    const port = match ? Number(match[1]) : 0;
    callback(null, Boolean(match && port >= 1 && port <= 65535));
  };
}