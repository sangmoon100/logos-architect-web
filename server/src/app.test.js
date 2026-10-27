jest.mock('./config/env', () => ({
  config: {
    port: 3000,
    nodeEnv: 'test',
    appEnv: 'dev',
    mongoUri: null,
    allowInvalidCertificates: false,
    allowInvalidHostnames: false,
    caFile: null,
    clientOrigin: null,
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
