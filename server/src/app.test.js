jest.mock('./config/env', () => ({
  config: {
    port: 3000,
    nodeEnv: 'test',
    appEnv: 'dev',
    mongoUri: null,
    allowInvalidCertificates: false,
    allowInvalidHostnames: false,
    caFile: null,
    clientOrigin: 'https://logos.example.com',
  },
}));

const request = require('supertest');
const app = require('./app');

describe('health endpoint', () => {
  it('returns an OK status without exposing configuration', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('CORS policy', () => {
  it.each(['http://localhost:5173', 'https://logos.example.com'])(
    'allows the configured client origin %s',
    async (origin) => {
      const response = await request(app).get('/health').set('Origin', origin);

      expect(response.headers['access-control-allow-origin']).toBe(origin);
    },
  );

  it('does not allow other origins', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://attacker.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
