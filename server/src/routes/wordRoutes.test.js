jest.mock('../config/env', () => ({
  config: {
    appEnv: 'dev',
    clientOrigin: null,
  },
}));

jest.mock('../features/words/wordRepository', () => ({
  listTags: jest.fn(),
  listWords: jest.fn(),
  listCandidates: jest.fn(),
}));

jest.mock('@fastify/static', () => {
  const fastifyPlugin = require('fastify-plugin');
  return fastifyPlugin(async () => {});
});

const Fastify = require('fastify');
const wordRoutes = require('./wordRoutes');
const { errorHandler } = require('../middleware/errorHandler');
const HttpError = require('../errors/HttpError');
const wordRepository = require('../features/words/wordRepository');

async function request(app, baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const body = await response.json();
  return { statusCode: response.status, body, text: JSON.stringify(body) };
}

describe('word API routes', () => {
  let app;
  let baseUrl;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = Fastify({ logger: false });
    app.register(wordRoutes, { prefix: '/api' });
    app.setErrorHandler(errorHandler);
    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the available tags', async () => {
    wordRepository.listTags.mockResolvedValue(['#게헨나', '#신비']);

    const response = await request(app, baseUrl, '/api/tags');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: ['#게헨나', '#신비'],
    });
  });

  it('passes repeated tags and search pagination through to the repository', async () => {
    const result = {
      items: [],
      pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
    };
    wordRepository.listWords.mockResolvedValue(result);

    const response = await request(
      app,
      baseUrl,
      '/api/words?tags=%23게헨나&tags=%23신비&q=Providence&page=2&pageSize=10',
    );

    expect(response.statusCode).toBe(200);
    expect(wordRepository.listWords).toHaveBeenCalledWith({
      tags: ['#게헨나', '#신비'],
      query: 'Providence',
      page: 2,
      pageSize: 10,
    });
    expect(response.body).toEqual({ success: true, data: result });
  });

  it('applies default search and pagination values', async () => {
    wordRepository.listWords.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await request(app, baseUrl, '/api/words');

    expect(response.statusCode).toBe(200);
    expect(wordRepository.listWords).toHaveBeenCalledWith({
      tags: [],
      query: '',
      page: 1,
      pageSize: 20,
    });
  });

  it('rejects empty tags and invalid pagination', async () => {
    const emptyTagResponse = await request(app, baseUrl, '/api/words?tags=');
    const paginationResponse = await request(
      app,
      baseUrl,
      '/api/words?page=0&pageSize=101',
    );

    expect(emptyTagResponse.statusCode).toBe(400);
    expect(emptyTagResponse.body.error.code).toBe('INVALID_TAGS');
    expect(paginationResponse.statusCode).toBe(400);
    expect(paginationResponse.body.error.code).toBe('INVALID_PAGINATION');
    expect(wordRepository.listWords).not.toHaveBeenCalled();
  });

  it('rejects repeated search terms and terms over 100 characters', async () => {
    const repeatedQuery = await request(
      app,
      baseUrl,
      '/api/words?q=first&q=second',
    );
    const longQuery = await request(
      app,
      baseUrl,
      `/api/words?q=${'x'.repeat(101)}`,
    );

    expect(repeatedQuery.statusCode).toBe(400);
    expect(repeatedQuery.body.error.code).toBe('INVALID_SEARCH');
    expect(longQuery.statusCode).toBe(400);
    expect(longQuery.body.error.code).toBe('INVALID_SEARCH');
  });

  it('reports database unavailability and hides internal errors', async () => {
    wordRepository.listTags.mockRejectedValueOnce(
      new HttpError(
        503,
        'DATABASE_UNAVAILABLE',
        '데이터베이스를 일시적으로 사용할 수 없습니다',
      ),
    );
    const unavailable = await request(app, baseUrl, '/api/tags');

    wordRepository.listTags.mockRejectedValueOnce(
      new Error('internal database details'),
    );
    const internalError = await request(app, baseUrl, '/api/tags');

    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(internalError.statusCode).toBe(500);
    expect(internalError.text).not.toContain('internal database details');
    expect(internalError.body.error.code).toBe('INTERNAL_ERROR');
  });
});