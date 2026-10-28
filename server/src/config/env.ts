import path = require('node:path');
import dotenv = require('dotenv');

type AppEnvironment = 'dev' | 'qa' | 'prod';

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  appEnv: AppEnvironment;
  mongoUri: string | null;
  allowInvalidCertificates: boolean;
  allowInvalidHostnames: boolean;
  caFile: string | null;
  clientOrigin: string | null;
}

const serverRoot = path.resolve(__dirname, '../..');
const dotenvPath = path.join(serverRoot, '.env');
const dotenvResult = dotenv.config({ path: dotenvPath, quiet: true });

if (dotenvResult.error) {
  const errorCode: unknown = Reflect.get(dotenvResult.error, 'code');
  if (errorCode !== 'ENOENT') {
    throw new Error('server/.env 로드에 실패했습니다', {
      cause: dotenvResult.error,
    });
  }
}

function parsePort(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new RangeError('PORT는 1~65535 사이의 정수여야 합니다');
  }

  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('PORT는 1~65535 사이의 정수여야 합니다');
  }

  return port;
}

function parseBoolean(name: string, value: string | undefined): boolean {
  if (value === undefined || value === '') {
    return false;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  throw new RangeError(`${name}은 true 또는 false여야 합니다`);
}

function isAppEnvironment(value: string): value is AppEnvironment {
  return value === 'dev' || value === 'qa' || value === 'prod';
}

const nodeEnv = process.env.NODE_ENV || 'development';
const inferredAppEnv =
  nodeEnv === 'production' || nodeEnv === 'prod'
    ? 'prod'
    : nodeEnv === 'qa'
      ? 'qa'
      : 'dev';
const appEnvValue = process.env.APP_ENV || inferredAppEnv;

if (!isAppEnvironment(appEnvValue)) {
  throw new RangeError('APP_ENV는 dev, qa 또는 prod여야 합니다');
}
const appEnv = appEnvValue;

if ((nodeEnv === 'production' || nodeEnv === 'prod') !== (appEnv === 'prod')) {
  throw new Error('NODE_ENV와 APP_ENV의 운영 환경 설정이 일치하지 않습니다');
}

const allowInvalidCertificates = parseBoolean(
  'MONGO_TLS_ALLOW_INVALID_CERTS',
  process.env.MONGO_TLS_ALLOW_INVALID_CERTS,
);
const allowInvalidHostnames = parseBoolean(
  'MONGO_TLS_ALLOW_INVALID_HOSTNAMES',
  process.env.MONGO_TLS_ALLOW_INVALID_HOSTNAMES,
);

if (
  appEnv !== 'dev' &&
  (allowInvalidCertificates || allowInvalidHostnames)
) {
  throw new Error('개발 환경에서만 MongoDB TLS 검증 비활성화를 허용합니다');
}

const caFile = process.env.MONGO_TLS_CA_FILE?.trim();
const clientOriginValue = process.env.CLIENT_ORIGIN?.trim();

let clientOrigin: string | null = null;
if (clientOriginValue) {
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(clientOriginValue);
  } catch (error: unknown) {
    throw new Error('CLIENT_ORIGIN은 유효한 Origin이어야 합니다', {
      cause: error,
    });
  }

  if (
    !['http:', 'https:'].includes(parsedOrigin.protocol) ||
    parsedOrigin.origin !== clientOriginValue
  ) {
    throw new Error('CLIENT_ORIGIN에는 경로 없이 정확한 Origin을 설정해야 합니다');
  }
  clientOrigin = parsedOrigin.origin;
} else if (appEnv !== 'dev') {
  throw new Error('QA 및 운영 환경에는 CLIENT_ORIGIN 설정이 필요합니다');
}

export const config: Readonly<ServerConfig> = Object.freeze({
  port: parsePort(process.env.PORT ?? '5000'),
  nodeEnv,
  appEnv,
  mongoUri: process.env.MONGODB_URI?.trim() || null,
  allowInvalidCertificates,
  allowInvalidHostnames,
  caFile: caFile ? path.resolve(serverRoot, caFile) : null,
  clientOrigin,
});
