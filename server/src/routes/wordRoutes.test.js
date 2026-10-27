jest.mock('../features/words/wordRepository', () => ({
  listTags: jest.fn(),
  listWords: jest.fn(),
  listCandidates: jest.fn(),
}));

jest.mock('../config/env', () => ({
  config: {
    appEnv: 'dev',
    clientOrigin: null,
    mongoUri: null,
    nodeEnv: 'test',
  },
}));

const request = require('supertest');
const HttpError = require('../errors/HttpError');
const wordRepository = require('../features/words/wordRepository');
const app = require('../app');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('word API routes', () => {
  it('returns the available tags', async () => {
    wordRepository.listTags.mockResolvedValue(['#게헨나', '#신비']);

    const response = await request(app).get('/api/tags');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: ['#게헨나', '#신비'],
    });
  });

  it('adds CORS headers for the local client origin', async () => {
    wordRepository.listTags.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/tags')
      .set('Origin', 'http://localhost:5174');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5174',
    );
  });

  it('passes repeated tags through for OR filtering', async () => {
    const result = {
      items: [],
      pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
    };
    wordRepository.listWords.mockResolvedValue(result);

    const response = await request(app).get(
      '/api/words?tags=%23게헨나&tags=%23신비&q=Providence&page=2&pageSize=10',
    );

    expect(response.status).toBe(200);
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

    const response = await request(app).get('/api/words');

    expect(response.status).toBe(200);
    expect(wordRepository.listWords).toHaveBeenCalledWith({
      tags: [],
      query: '',
      page: 1,
      pageSize: 20,
    });
  });

  it('rejects empty tag values', async () => {
    const response = await request(app).get('/api/words?tags=');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_TAGS' },
    });
    expect(wordRepository.listWords).not.toHaveBeenCalled();
  });

  it('rejects pagination values outside supported bounds', async () => {
    const response = await request(app).get('/api/words?page=0&pageSize=101');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_PAGINATION' },
    });
    expect(wordRepository.listWords).not.toHaveBeenCalled();
  });

  it('rejects search terms longer than 100 characters', async () => {
    const response = await request(app).get(
      `/api/words?q=${'x'.repeat(101)}`,
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_SEARCH' },
    });
  });

  it('returns an explicit service-unavailable response for a missing database', async () => {
    wordRepository.listTags.mockRejectedValue(
      new HttpError(
        503,
        'DATABASE_UNAVAILABLE',
        '데이터베이스를 일시적으로 사용할 수 없습니다',
      ),
    );

    const response = await request(app).get('/api/tags');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'DATABASE_UNAVAILABLE' },
    });
  });

  it('does not expose internal errors to clients', async () => {
    const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
    wordRepository.listTags.mockRejectedValue(
      new Error('internal database details'),
    );

    const response = await request(app).get('/api/tags');

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain(
      'internal database details',
    );
    expect(logger).toHaveBeenCalled();
    logger.mockRestore();
  });
});
