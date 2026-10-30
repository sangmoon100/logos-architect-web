jest.mock('@fastify/static', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const fastifyPlugin = require('fastify-plugin');

  return fastifyPlugin(async (fastify, options) => {
    fastify.decorateReply('sendFile', function sendFile(filename) {
      this.type('text/html').send(
        fs.readFileSync(path.join(options.root, filename)),
      );
      return this;
    });
  });
});

jest.mock('./config/env', () => ({
  config: {
    appEnv: 'prod',
    clientOrigin: 'https://logos.example.com',
  },
}));

const { buildApp } = require('./app');

describe('Fastify application', () => {
  let app;
  let baseUrl;

  beforeEach(async () => {
    app = buildApp();
    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the health status without exposing configuration', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('serves Swagger UI and generated OpenAPI documentation', async () => {
    const uiResponse = await fetch(`${baseUrl}/docs/`);
    const specificationResponse = await fetch(`${baseUrl}/docs/json`);
    const specification = await specificationResponse.json();

    expect(uiResponse.status).toBe(200);
    expect(uiResponse.headers.get('content-type')).toContain('text/html');
    expect(specificationResponse.status).toBe(200);
    expect(specification.openapi).toBe('3.0.3');
    expect(specification.info).toMatchObject({
      title: 'Logos Architect API',
      version: '1.2.0',
    });
    expect(specification.paths).toHaveProperty('/api/tags');
    expect(specification.paths).toHaveProperty('/api/words');
    expect(specification.paths).toHaveProperty('/api/names/generate');
    expect(specification.paths).toHaveProperty('/health');
    expect(specification.paths['/api/words'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'tags', in: 'query' }),
        expect.objectContaining({ name: 'pageSize', in: 'query' }),
      ]),
    );
    expect(specification.paths['/api/names/generate'].post.requestBody).toBeDefined();
  });

  it('allows the configured client origin', async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { origin: 'https://logos.example.com' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://logos.example.com',
    );
  });

  it('rejects other browser origins', async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { origin: 'https://attacker.example.com' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('serves the client application for non-API paths', async () => {
    const response = await fetch(`${baseUrl}/some/page`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(body).toContain('<div id="root"></div>');
  });

  it('returns JSON not-found errors for unknown API paths', async () => {
    const response = await fetch(`${baseUrl}/api/missing`);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  it('returns a client error for malformed JSON', async () => {
    const response = await fetch(`${baseUrl}/api/names/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: 'INVALID_JSON' },
    });
  });
});