jest.mock('dotenv', () => ({
  config: jest.fn(() => ({})),
}));

const envKeys = [
  'PORT',
  'NODE_ENV',
  'APP_ENV',
  'MONGODB_URI',
  'MONGO_TLS_ALLOW_INVALID_CERTS',
  'MONGO_TLS_ALLOW_INVALID_HOSTNAMES',
  'MONGO_TLS_CA_FILE',
  'CLIENT_ORIGIN',
];
const originalEnv = Object.fromEntries(
  envKeys.map((key) => [key, process.env[key]]),
);

function loadConfig() {
  jest.resetModules();
  return require('./env').config;
}

beforeEach(() => {
  for (const key of envKeys) {
    delete process.env[key];
  }
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe('server environment configuration', () => {
  it('uses the local port default and treats a missing MongoDB URI as unavailable', () => {
    const config = loadConfig();

    expect(config.port).toBe(3001);
    expect(config.appEnv).toBe('dev');
    expect(config.mongoUri).toBeNull();
  });

  it('rejects invalid port values', () => {
    process.env.PORT = '70000';

    expect(() => loadConfig()).toThrow(RangeError);
  });

  it('rejects disabled TLS verification outside development', () => {
    process.env.APP_ENV = 'qa';
    process.env.MONGO_TLS_ALLOW_INVALID_CERTS = 'true';

    expect(() => loadConfig()).toThrow(/개발 환경에서만/);
  });

  it('rejects malformed TLS flags', () => {
    process.env.MONGO_TLS_ALLOW_INVALID_HOSTNAMES = 'yes';

    expect(() => loadConfig()).toThrow(/true 또는 false/);
  });

  it('requires an exact client origin in QA and production', () => {
    process.env.APP_ENV = 'qa';

    expect(() => loadConfig()).toThrow(/CLIENT_ORIGIN 설정/);

    process.env.APP_ENV = 'prod';
    process.env.NODE_ENV = 'production';
    expect(() => loadConfig()).toThrow(/CLIENT_ORIGIN 설정/);
  });

  it('rejects mismatched production environment settings', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'dev';

    expect(() => loadConfig()).toThrow(/일치하지 않습니다/);
  });

  it('rejects client origins containing a path', () => {
    process.env.CLIENT_ORIGIN = 'https://logos.example.com/app';

    expect(() => loadConfig()).toThrow(/정확한 Origin/);
  });
});
