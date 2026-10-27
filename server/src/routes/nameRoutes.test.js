jest.mock('../features/words/wordRepository', () => ({
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
const wordRepository = require('../features/words/wordRepository');
const app = require('../app');

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('name generation API', () => {
  it('returns combined and noun-only results for matching candidates', async () => {
    wordRepository.listCandidates
      .mockResolvedValueOnce([adjective])
      .mockResolvedValueOnce([noun]);

    const response = await request(app)
      .post('/api/names/generate')
      .send({ tags: ['#광기'] });

    expect(response.status).toBe(200);
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

  it('returns noun-only formats when no adjective matches', async () => {
    wordRepository.listCandidates
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([noun]);

    const response = await request(app)
      .post('/api/names/generate')
      .send({ tags: ['#광기'] });

    expect(response.status).toBe(200);
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

    const response = await request(app).post('/api/names/generate').send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'NO_MATCHING_WORDS' },
    });
  });

  it('rejects non-array tag input', async () => {
    const response = await request(app)
      .post('/api/names/generate')
      .send({ tags: '#광기' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_TAGS' },
    });
    expect(wordRepository.listCandidates).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with a client error', async () => {
    const response = await request(app)
      .post('/api/names/generate')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'INVALID_JSON' },
    });
  });
});
