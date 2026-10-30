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
const nameRoutes = require('./nameRoutes');
const { errorHandler } = require('../middleware/errorHandler');
const wordRepository = require('../features/words/wordRepository');

async function request(app, baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, options);
  const body = await response.json();
  return { statusCode: response.status, body };
}

const adjective = {
  word_en: 'Frantic',
  word_ko: '광란의',
  pronunciation: '프랜틱',
  part_of_speech: 'adjective',
  tags: ['#광기'],
  weight: 3,
};
const noun = {
  word_en: 'Providence',
  word_ko: '섭리',
  pronunciation: '프로비던스',
  part_of_speech: 'noun',
  tags: ['#광기'],
  weight: 5,
};

describe('name generation API', () => {
  let app;
  let baseUrl;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = Fastify({ logger: false });
    app.register(nameRoutes, { prefix: '/api' });
    app.setErrorHandler(errorHandler);
    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns combined and noun-only results for matching candidates', async () => {
    wordRepository.listCandidates
      .mockResolvedValueOnce([adjective])
      .mockResolvedValueOnce([noun]);

    const response = await request(app, baseUrl, '/api/names/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags: ['#광기'] }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [
        {
          caseType: 'adjective_noun',
          mix: '광란의 프로비던스',
          translation: '광란의 섭리',
          english: 'Frantic Providence',
          pronunciation: '프랜틱 프로비던스',
        },
        {
          caseType: 'noun',
          mix: '섭리',
          translation: '섭리',
          english: 'Providence',
          pronunciation: '프로비던스',
        },
      ],
    });
    expect(wordRepository.listCandidates).toHaveBeenNthCalledWith(
      1,
      'adjective',
      ['#광기'],
    );
    expect(wordRepository.listCandidates).toHaveBeenNthCalledWith(
      2,
      'noun',
      ['#광기'],
    );
  });

  it('returns noun-only results when no adjective matches', async () => {
    wordRepository.listCandidates
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([noun]);

    const response = await request(app, baseUrl, '/api/names/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags: ['#광기'] }),
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toEqual([
      {
        caseType: 'noun',
        mix: '섭리',
        translation: '섭리',
        english: 'Providence',
        pronunciation: '프로비던스',
      },
    ]);
  });

  it('returns an explicit no-candidate response when there is no noun', async () => {
    wordRepository.listCandidates
      .mockResolvedValueOnce([adjective])
      .mockResolvedValueOnce([]);

    const response = await request(app, baseUrl, '/api/names/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.statusCode).toBe(422);
    expect(response.body.error.code).toBe('NO_MATCHING_WORDS');
  });

  it('rejects non-array tag input before querying candidates', async () => {
    const response = await request(app, baseUrl, '/api/names/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags: '#광기' }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe('INVALID_TAGS');
    expect(wordRepository.listCandidates).not.toHaveBeenCalled();
  });
});